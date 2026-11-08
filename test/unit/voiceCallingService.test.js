const { describe, it } = require('node:test');
const assert = require('node:assert');
const voiceCallingService = require('../../src/services/voiceCallingService');

describe('VoiceCallingService Unit Tests', () => {
  describe('generateInboundTwiML', () => {
    it('should generate valid TwiML with Polly.Aditi voice and speech gather', () => {
      const twiml = voiceCallingService.generateInboundTwiML('+919992396866');
      assert.ok(twiml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.ok(twiml.includes('<Response>'));
      assert.ok(twiml.includes('Polly.Aditi'));
      assert.ok(twiml.includes('<Gather input="speech"'));
      assert.ok(twiml.includes('bargeIn="true"'));
      assert.ok(twiml.includes('action="/api/calling/process-speech"'));
    });
  });

  describe('generateOutboundLeadPayload', () => {
    it('should generate properly structured payload for outbound calls', () => {
      const payload = voiceCallingService.generateOutboundLeadPayload({
        phone: '+919992396866',
        name: 'Sahil',
        serviceCategory: 'drone-cinematography',
      });

      assert.strictEqual(payload.to, '+919992396866');
      assert.strictEqual(payload.scriptType, 'lead_qualification');
      assert.strictEqual(payload.state, 'INITIATED');
      assert.ok(payload.initialGreeting.includes('Sahil'));
      assert.ok(payload.initialGreeting.includes('drone-cinematography'));
      assert.ok(payload.timestamp);
    });
  });

  describe('Multilingual and Dialect Understanding', () => {
    it('should identify English drone booking intent', () => {
      const outcome = voiceCallingService.processVoiceTurn('I want an FPV drone shoot for my resort');
      assert.strictEqual(outcome.intent, 'DRONE_BOOKING');
      assert.strictEqual(outcome.detectedLanguage, 'en');
      assert.ok(outcome.reply.includes('drone cinematography'));
    });

    it('should identify Hindi/Hinglish drone booking intent and reply in Hindi', () => {
      const outcome = voiceCallingService.processVoiceTurn('Mujhe gym ke liye drone video shoot karwana hai, kya rate hoga?');
      assert.strictEqual(outcome.intent, 'DRONE_BOOKING');
      assert.strictEqual(outcome.detectedLanguage, 'hi');
      assert.ok(outcome.reply.includes('Bilkul!'));
      assert.ok(outcome.reply.includes('FPV indoor walkthrough'));
    });

    it('should identify Punjabi language cues and reply in Punjabi', () => {
      const outcome = voiceCallingService.processVoiceTurn('Sat Sri Akal ji, drone video shoot chahida si');
      assert.strictEqual(outcome.intent, 'DRONE_BOOKING');
      assert.strictEqual(outcome.detectedLanguage, 'pa');
      assert.ok(outcome.reply.includes('Sat Sri Akal ji'));
    });

    it('should identify Hindi pricing inquiry and reply in Hindi', () => {
      const outcome = voiceCallingService.processVoiceTurn('Kitna paisa lagega, daam batao');
      assert.strictEqual(outcome.intent, 'PRICING_REQUEST');
      assert.strictEqual(outcome.detectedLanguage, 'hi');
      assert.ok(outcome.reply.includes('WhatsApp'));
    });

    it('should identify affirmative confirmation and close gracefully', () => {
      const outcome = voiceCallingService.processVoiceTurn('Haanji WhatsApp par bhej do');
      assert.strictEqual(outcome.intent, 'CONFIRMATION');
      assert.strictEqual(outcome.continueCall, false);
      assert.ok(outcome.reply.includes('WhatsApp'));
    });
  });
});
