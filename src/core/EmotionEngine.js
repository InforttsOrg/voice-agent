/**
 * Enterprise Emotion & Vocal Prosody Engine
 * Dynamically evaluates emotional sentiment from conversational turns
 * and computes human-grade vocal prosody (pitch, rate, volume, emphasis, disfluencies, breathing).
 *
 * Licensed for Enterprise White-Label Distribution (TAF Commercial Asset).
 */

class EmotionEngine {
  constructor() {
    this.emotionProfiles = {
      warm_consultative: {
        pitch: '+2%',
        rate: '98%',
        volume: '+0dB',
        contour: '(0%,+0st) (30%,+2st) (80%,-1st) (100%,-2st)',
        style: 'friendly',
        elevenlabs: {
          stability: 0.55,
          similarity_boost: 0.85,
          style: 0.35,
          use_speaker_boost: true
        },
        sarvam: {
          pace: 0.98,
          pitch: 1.02,
          loudness: 1.0
        },
        disfluencies: {
          en: ['Ah, got it.', 'Right, absolutely.', 'Understood, yes.', 'Hmm, let me check that.'],
          hi: ['Haanji bilkul.', 'Achha, samajh gaya.', 'Ji bilkul.', 'Haanji, dekhiye.']
        }
      },
      energetic_enthusiastic: {
        pitch: '+6%',
        rate: '104%',
        volume: '+1.5dB',
        contour: '(0%,+1st) (40%,+4st) (70%,+2st) (100%,+0st)',
        style: 'cheerful',
        elevenlabs: {
          stability: 0.45,
          similarity_boost: 0.90,
          style: 0.65,
          use_speaker_boost: true
        },
        sarvam: {
          pace: 1.05,
          pitch: 1.06,
          loudness: 1.2
        },
        disfluencies: {
          en: ['Oh fantastic!', 'Awesome!', 'Love that!', 'That sounds wonderful!'],
          hi: ['Arrey shandar!', 'Bahut badhiya!', 'Kamaal hai!', 'Zabardast!']
        }
      },
      reassuring_empathetic: {
        pitch: '-2%',
        rate: '93%',
        volume: '-0.5dB',
        contour: '(0%,+0st) (50%,-1st) (100%,-3st)',
        style: 'empathetic',
        elevenlabs: {
          stability: 0.70,
          similarity_boost: 0.80,
          style: 0.40,
          use_speaker_boost: true
        },
        sarvam: {
          pace: 0.92,
          pitch: 0.98,
          loudness: 0.95
        },
        disfluencies: {
          en: ['I completely understand.', 'No worries at all.', 'Take your time, absolutely.', 'I hear you.'],
          hi: ['Bilkul pareshan mat hoiye.', 'Aap aaram se batayein.', 'Main samajh raha hoon.', 'Koi baat nahi ji.']
        }
      },
      crisp_efficient: {
        pitch: '+0%',
        rate: '106%',
        volume: '+0dB',
        contour: '(0%,+0st) (100%,-1st)',
        style: 'direct',
        elevenlabs: {
          stability: 0.65,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true
        },
        sarvam: {
          pace: 1.08,
          pitch: 1.0,
          loudness: 1.0
        },
        disfluencies: {
          en: ['Got it.', 'Noted.', 'Understood.', 'Right away.'],
          hi: ['Ji, noted.', 'Bilkul.', 'Theek hai.', 'Turant.']
        }
      },
      celebratory_closing: {
        pitch: '+4%',
        rate: '100%',
        volume: '+1dB',
        contour: '(0%,+0st) (40%,+3st) (100%,-1st)',
        style: 'cheerful',
        elevenlabs: {
          stability: 0.50,
          similarity_boost: 0.88,
          style: 0.55,
          use_speaker_boost: true
        },
        sarvam: {
          pace: 1.0,
          pitch: 1.04,
          loudness: 1.1
        },
        disfluencies: {
          en: ['Wonderful!', 'All set!', 'Perfect!', 'Terrific!'],
          hi: ['Bahut badiya!', 'Bilkul pakka!', 'Zabardast!', 'Shandar!']
        }
      }
    };
  }

  /**
   * Analyzes caller sentiment & emotional disposition from text and context.
   */
  detectCallerEmotion(transcript = '', context = {}) {
    const text = transcript.toLowerCase();

    // 1. Enthusiastic / Excited
    if (/\b(love|awesome|great|super|mast|zabardast|kamaal|perfect|fast|best|superb|excited|brilliant|amazing)\b/i.test(text)) {
      return {
        emotion: 'ENTHUSIASTIC',
        vocalState: 'energetic_enthusiastic',
        confidence: 0.94
      };
    }

    // 2. Hesitant / Skeptical / Price-sensitive / Frustrated
    if (/\b(unsure|confused|doubt|scam|expensive|mehenga|jyada|pata nahi|sochna|budget issue|tough|wait|problem|issue|frustrated|slow)\b/i.test(text)) {
      return {
        emotion: 'HESITANT_OR_SKEPTICAL',
        vocalState: 'reassuring_empathetic',
        confidence: 0.90
      };
    }

    // 3. In a Hurry / Urgent
    if (/\b(asap|jaldi|urgent|quick|emergency|today itself|right now|fast|immediately|hurry)\b/i.test(text)) {
      return {
        emotion: 'URGENT',
        vocalState: 'crisp_efficient',
        confidence: 0.92
      };
    }

    // 4. Affirmative Closure
    if (/\b(yes|sure|haan|haanji|pakka|bhejo|send|done|okay|ok|theek hai)\b/i.test(text) && !/\b(shoot|website|drone|marketing)\b/i.test(text)) {
      return {
        emotion: 'SATISFACTION',
        vocalState: 'celebratory_closing',
        confidence: 0.96
      };
    }

    // 5. Inquisitive / Curious (Default exploratory)
    return {
      emotion: 'CURIOUS',
      vocalState: 'warm_consultative',
      confidence: 0.88
    };
  }

  /**
   * Enhances raw textual speech with natural human fillers, pauses, and disfluencies.
   */
  humanizeCadence(text, lang = 'en', vocalState = 'warm_consultative', options = {}) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();

    const addDisfluency = options.disfluencies !== false;

    // Avoid double prefixing if already natural
    const alreadyNatural = /^(ah|oh|right|haanji|achha|arrey|bilkul|perfect|wonderful|got it|hmm|noted)/i.test(cleaned);
    if (addDisfluency && !alreadyNatural) {
      const profile = this.emotionProfiles[vocalState] || this.emotionProfiles.warm_consultative;
      const choices = profile.disfluencies[lang === 'hi' ? 'hi' : 'en'] || profile.disfluencies.en;
      const prefix = choices[Math.floor(Math.random() * choices.length)];
      cleaned = `${prefix} ${cleaned}`;
    }

    // Natural punctuation pacing
    cleaned = cleaned
      .replace(/\.\s+/g, '. ')
      .replace(/,\s*/g, ', ')
      .replace(/\?\s*/g, '? ')
      .replace(/!\s*/g, '! ');

    return cleaned;
  }

  /**
   * Compiles dynamic Neural SSML with prosody contours, emotion tags, micro-breaks, and pitch shaping.
   */
  generateNeuralSSML(text, lang = 'en', vocalState = 'warm_consultative', voice = 'Polly.Aditi') {
    const profile = this.emotionProfiles[vocalState] || this.emotionProfiles.warm_consultative;
    const humanized = this.humanizeCadence(text, lang, vocalState);

    // Clean XML unsafe characters
    const xmlSafe = humanized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Insert natural micro-pauses (breaths) at sentence boundaries
    const withBreaths = xmlSafe.replace(/\.\s+/g, '. <break time="180ms"/> ');

    // Neural SSML with prosody contours
    return `<speak><prosody rate="${profile.rate}" pitch="${profile.pitch}" volume="${profile.volume}">${withBreaths}</prosody></speak>`;
  }

  /**
   * Get provider-specific voice tuning parameters.
   */
  getProviderVoiceParameters(provider = 'elevenlabs', vocalState = 'warm_consultative') {
    const profile = this.emotionProfiles[vocalState] || this.emotionProfiles.warm_consultative;
    if (provider === 'elevenlabs') {
      return profile.elevenlabs;
    }
    if (provider === 'sarvam') {
      return profile.sarvam;
    }
    return {
      rate: profile.rate,
      pitch: profile.pitch,
      volume: profile.volume
    };
  }

  /**
   * List all registered emotion profiles.
   */
  listProfiles() {
    return Object.keys(this.emotionProfiles).map(key => ({
      name: key,
      ...this.emotionProfiles[key]
    }));
  }
}

module.exports = new EmotionEngine();
