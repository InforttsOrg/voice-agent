/**
 * Enterprise Voice Communication Controller
 * Exposes high-fidelity speech synthesis, dynamic emotion adaptation,
 * and conversational turn endpoints for Project Meeseeks & TAF clients.
 */

const emotionEngine = require('../core/EmotionEngine');
const speechSynthesizer = require('../core/SpeechSynthesizer');
const dialogueManager = require('../core/DialogueManager');
const voiceCallingService = require('../services/voiceCallingService');
const tenantConfig = require('../core/TenantConfig');

/**
 * POST /api/v1/voice/speak
 * Synthesizes arbitrary text into emotional human-like speech.
 */
exports.synthesizeSpeech = async (req, res) => {
  try {
    const { text, lang, vocalState, provider, voice, disfluencies } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required field: text (string)', code: 'VALIDATION_ERROR' }
      });
    }

    const synthesisResult = await speechSynthesizer.synthesize(text, {
      lang: lang || 'en',
      vocalState: vocalState || 'warm_consultative',
      provider: provider || 'twilio_neural',
      voice,
      disfluencies: disfluencies !== false,
    });

    res.json({
      success: true,
      data: synthesisResult
    });
  } catch (err) {
    console.error('[VoiceComms] Synthesis error:', err.message);
    res.status(500).json({
      success: false,
      error: { message: err.message, code: 'SYNTHESIS_ERROR' }
    });
  }
};

/**
 * POST /api/v1/voice/converse
 * Full conversational turn for assistant agents (Meeseeks) and TAF clients.
 */
exports.converseTurn = async (req, res) => {
  try {
    const { text, transcript, sessionId } = req.body;
    const inputSpeech = text || transcript || '';

    if (!inputSpeech.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required field: text or transcript', code: 'VALIDATION_ERROR' }
      });
    }

    const outcome = await voiceCallingService.processVoiceTurn(inputSpeech, sessionId || 'meeseeks-default');

    res.json({
      success: true,
      data: {
        reply: outcome.reply,
        humanizedReply: outcome.humanizedReply || outcome.reply,
        ssml: outcome.ssml,
        intent: outcome.intent,
        detectedLanguage: outcome.detectedLanguage,
        callerEmotion: outcome.callerEmotion,
        vocalState: outcome.vocalState,
        voice: outcome.voice,
        continueCall: outcome.continueCall,
        memory: outcome.memory,
      }
    });
  } catch (err) {
    console.error('[VoiceComms] Converse turn error:', err.message);
    res.status(500).json({
      success: false,
      error: { message: err.message, code: 'CONVERSE_ERROR' }
    });
  }
};

/**
 * GET /api/v1/voice/profiles
 * Lists all registered emotion profiles with prosody parameters.
 */
exports.getProfiles = (req, res) => {
  res.json({
    success: true,
    data: {
      profiles: emotionEngine.listProfiles(),
      supportedLanguages: ['en', 'hi', 'pa', 'ta', 'te', 'mr'],
      defaultVocalState: 'warm_consultative',
    }
  });
};

/**
 * GET /api/v1/voice/config
 * Retrieves active tenant white-label configuration.
 */
exports.getTenantConfig = (req, res) => {
  res.json({
    success: true,
    data: tenantConfig.getConfig()
  });
};

/**
 * POST /api/v1/voice/config
 * Updates tenant configuration for commercial customization.
 */
exports.updateTenantConfig = (req, res) => {
  const updated = tenantConfig.updateConfig(req.body);
  res.json({
    success: true,
    message: 'Tenant configuration updated successfully',
    data: updated
  });
};
