const { describe, it } = require('node:test');
const assert = require('node:assert');
const emotionEngine = require('../../src/core/EmotionEngine');
const dialogueManager = require('../../src/core/DialogueManager');
const speechSynthesizer = require('../../src/core/SpeechSynthesizer');
const voiceCommsController = require('../../src/controllers/voiceCommsController');
const tenantConfig = require('../../src/core/TenantConfig');

describe('Emotion Engine & Voice Communication Tests', () => {
  describe('EmotionEngine', () => {
    it('should detect enthusiastic sentiment and map to energetic_enthusiastic vocalState', () => {
      const res = emotionEngine.detectCallerEmotion('This is awesome and amazing, I love it!');
      assert.strictEqual(res.emotion, 'ENTHUSIASTIC');
      assert.strictEqual(res.vocalState, 'energetic_enthusiastic');
      assert.ok(res.confidence > 0.9);
    });

    it('should detect hesitant/skeptical sentiment and map to reassuring_empathetic vocalState', () => {
      const res = emotionEngine.detectCallerEmotion('Yeh bahut mehenga hai, I have a doubt and budget issue');
      assert.strictEqual(res.emotion, 'HESITANT_OR_SKEPTICAL');
      assert.strictEqual(res.vocalState, 'reassuring_empathetic');
    });

    it('should detect urgent sentiment and map to crisp_efficient vocalState', () => {
      const res = emotionEngine.detectCallerEmotion('We need this ASAP today itself, very urgent!');
      assert.strictEqual(res.emotion, 'URGENT');
      assert.strictEqual(res.vocalState, 'crisp_efficient');
    });

    it('should detect affirmative closure and map to celebratory_closing vocalState', () => {
      const res = emotionEngine.detectCallerEmotion('Haanji bilkul, pakka bhejo!');
      assert.strictEqual(res.emotion, 'SATISFACTION');
      assert.strictEqual(res.vocalState, 'celebratory_closing');
    });

    it('should generate valid Neural SSML with prosody contours and micro-pauses', () => {
      const ssml = emotionEngine.generateNeuralSSML('I will schedule your drone shoot immediately. Let us begin.', 'en', 'energetic_enthusiastic');
      assert.ok(ssml.startsWith('<speak><prosody rate="104%" pitch="+6%" volume="+1.5dB">'));
      assert.ok(ssml.includes('<break time="180ms"/>'));
      assert.ok(ssml.endsWith('</prosody></speak>'));
    });

    it('should humanize cadence with disfluencies and conversational fillers', () => {
      const text = 'We can develop your Flutter application in 4 weeks.';
      const humanized = emotionEngine.humanizeCadence(text, 'en', 'warm_consultative');
      assert.ok(typeof humanized === 'string');
      assert.ok(humanized.length > text.length);
    });

    it('should retrieve provider-specific voice tuning parameters', () => {
      const eleven = emotionEngine.getProviderVoiceParameters('elevenlabs', 'energetic_enthusiastic');
      assert.strictEqual(eleven.stability, 0.45);
      assert.strictEqual(eleven.style, 0.65);

      const sarvam = emotionEngine.getProviderVoiceParameters('sarvam', 'reassuring_empathetic');
      assert.strictEqual(sarvam.pace, 0.92);
    });
  });

  describe('DialogueManager & TenantConfig', () => {
    it('should provide white-label tenant brand and services catalog', () => {
      const brand = tenantConfig.getBrand();
      assert.ok(brand.name);
      assert.ok(brand.contact.phone);

      const services = tenantConfig.getServices();
      assert.ok(Array.isArray(services));
      assert.ok(services.length >= 3);
    });

    it('should construct an emotion-steered system instruction', () => {
      const emotion = { emotion: 'HESITANT_OR_SKEPTICAL', vocalState: 'reassuring_empathetic' };
      const prompt = dialogueManager.buildSystemPrompt(emotion, 'en');
      assert.ok(prompt.includes('HESITANT_OR_SKEPTICAL'));
      assert.ok(prompt.includes('reassuring'));
    });
  });

  describe('VoiceCommsController Endpoints', () => {
    function createMockRes() {
      return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
      };
    }

    it('should synthesize emotional speech via synthesizeSpeech endpoint', async () => {
      const req = {
        body: {
          text: 'Welcome to Meeseeks autonomous operations. System is fully operational.',
          lang: 'en',
          vocalState: 'warm_consultative',
          provider: 'twilio_neural'
        }
      };
      const res = createMockRes();

      await voiceCommsController.synthesizeSpeech(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.ssml.includes('<speak>'));
      assert.strictEqual(res.body.data.vocalState, 'warm_consultative');
    });

    it('should execute a full conversational dialogue turn via converseTurn endpoint', async () => {
      const req = {
        body: {
          text: 'What are your rates for a 4K drone shoot in Delhi?',
          sessionId: 'meeseeks-test-session'
        }
      };
      const res = createMockRes();

      await voiceCommsController.converseTurn(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.intent, 'DRONE_BOOKING');
      assert.strictEqual(res.body.data.memory.entities.pricingRequested, true);
      assert.strictEqual(res.body.data.memory.entities.location, 'Delhi');
      assert.ok(res.body.data.reply);
      assert.ok(res.body.data.ssml);
      assert.ok(res.body.data.vocalState);
    });

    it('should list all emotion profiles via getProfiles endpoint', () => {
      const req = {};
      const res = createMockRes();

      voiceCommsController.getProfiles(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.profiles));
      assert.ok(res.body.data.profiles.some(p => p.name === 'energetic_enthusiastic'));
    });

    it('should retrieve and update tenant configuration via getTenantConfig/updateTenantConfig', () => {
      const getReq = {};
      const getRes = createMockRes();

      voiceCommsController.getTenantConfig(getReq, getRes);
      assert.strictEqual(getRes.statusCode, 200);
      assert.ok(getRes.body.data.brand);

      const updateReq = { body: { brand: { name: 'TAF Enterprise Partner' } } };
      const updateRes = createMockRes();

      voiceCommsController.updateTenantConfig(updateReq, updateRes);
      assert.strictEqual(updateRes.statusCode, 200);
      assert.strictEqual(updateRes.body.data.brand.name, 'TAF Enterprise Partner');
    });
  });
});
