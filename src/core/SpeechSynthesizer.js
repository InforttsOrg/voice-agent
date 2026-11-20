/**
 * Universal Multi-Provider Speech Synthesizer
 * Supports:
 * - Twilio Neural SSML with prosody contours & breathing pauses
 * - ElevenLabs Expressive Cloned Voice API with dynamic emotion stability/style
 * - Sarvam AI Bulbul (Indic Multilingual Voice API)
 * - Web Speech API & Browser Test Bench Audio Stream
 */

const emotionEngine = require('./EmotionEngine');
const tenantConfig = require('./TenantConfig');

class SpeechSynthesizer {
  constructor() {
    this.providers = ['twilio_neural', 'elevenlabs', 'sarvam', 'web_audio'];
  }

  /**
   * Generates dynamic SSML with prosody, cadence, breathing pauses, and disfluencies.
   */
  generateSSML(text, lang = 'en', vocalState = 'warm_consultative', voice = 'Polly.Aditi') {
    return emotionEngine.generateNeuralSSML(text, lang, vocalState, voice);
  }

  /**
   * Main synthesis entrypoint.
   */
  async synthesize(text, options = {}) {
    const lang = options.lang || 'en';
    const vocalState = options.vocalState || 'warm_consultative';
    const provider = options.provider || tenantConfig.getConfig().providers.primaryTTS || 'twilio_neural';
    const voice = options.voice || (lang === 'hi' ? 'Polly.Kajal' : 'Polly.Aditi');

    // 1. Generate humanized text & neural SSML
    const humanizedText = emotionEngine.humanizeCadence(text, lang, vocalState, options);
    const ssml = emotionEngine.generateNeuralSSML(text, lang, vocalState, voice);

    // 2. ElevenLabs Expressive Audio Generation
    if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      try {
        const audioBuffer = await this.synthesizeWithElevenLabs(humanizedText, vocalState, options);
        if (audioBuffer) {
          return {
            provider: 'elevenlabs',
            format: 'audio/mpeg',
            audioBase64: audioBuffer.toString('base64'),
            humanizedText,
            ssml,
            vocalState,
          };
        }
      } catch (err) {
        console.warn('[SpeechSynthesizer] ElevenLabs synthesis failed, falling back to SSML:', err.message);
      }
    }

    // 3. Sarvam AI Indic Voice Synthesis
    if (provider === 'sarvam' && process.env.SARVAM_API_KEY) {
      try {
        const audioBuffer = await this.synthesizeWithSarvam(humanizedText, lang, vocalState, options);
        if (audioBuffer) {
          return {
            provider: 'sarvam',
            format: 'audio/wav',
            audioBase64: audioBuffer.toString('base64'),
            humanizedText,
            ssml,
            vocalState,
          };
        }
      } catch (err) {
        console.warn('[SpeechSynthesizer] Sarvam synthesis failed, falling back to SSML:', err.message);
      }
    }

    // 4. Default Telephony SSML (Twilio Neural / Polly)
    return {
      provider: 'twilio_neural',
      format: 'application/ssml+xml',
      voice,
      humanizedText,
      ssml,
      vocalState,
      telephonyTwiML: `<Say voice="${voice}">${ssml}</Say>`,
    };
  }

  async synthesizeWithElevenLabs(text, vocalState, options = {}) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel / expressive
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const voiceParams = emotionEngine.getProviderVoiceParameters('elevenlabs', vocalState);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: options.modelId || 'eleven_multilingual_v2',
        voice_settings: voiceParams
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`ElevenLabs returned status ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async synthesizeWithSarvam(text, lang, vocalState, options = {}) {
    const apiKey = process.env.SARVAM_API_KEY;
    const url = 'https://api.sarvam.ai/text-to-speech';
    const params = emotionEngine.getProviderVoiceParameters('sarvam', vocalState);

    const langCodeMap = {
      hi: 'hi-IN',
      en: 'en-IN',
      pa: 'pa-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN'
    };

    const targetLangCode = langCodeMap[lang] || 'hi-IN';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetLangCode,
        speaker: options.speaker || 'meera',
        pace: params.pace,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: 'bulbul:v1'
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Sarvam returned status ${res.status}`);
    }

    const json = await res.json();
    if (json.audios && json.audios[0]) {
      return Buffer.from(json.audios[0], 'base64');
    }
    return null;
  }
}

module.exports = new SpeechSynthesizer();
