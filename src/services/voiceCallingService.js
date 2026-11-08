/**
 * Autonomous Multilingual AI Voice Calling Service
 * Supports Hindi, Hinglish, Punjabi, Tamil, Telugu, Marathi, and English.
 * Implements low-latency barge-in, entity extraction, state machine routing, and session memory.
 */

const LOCAL_LANGUAGE_CUES = {
  pa: [
    'sat sri akal', 'kiddan', 'chahida', 'daso', 'veere', 'karaange'
  ],
  ta: [
    'vanakkam', 'epdi', 'venum', 'solunga', 'pananum', 'evvalo'
  ],
  te: [
    'namaskaram', 'ela', 'kavali', 'cheppandi', 'entha'
  ],
  mr: [
    'namaskar', 'kay', 'pahije', 'sanga', 'kiti', 'karaayche'
  ],
  hi: [
    'namaste', 'kya', 'hai', 'mujhe', 'chahiye', 'kitna', 'hoga', 'daam',
    'batao', 'karega', 'humko', 'karna', 'paise', 'bhai', 'haan', 'nahi'
  ]
};

const VOCAB_HINTS = 'drone, FPV, cinematography, 4K shoot, website, mobile app, Flutter, Next.js, WhatsApp bot, pricing, GrowthHikes, Infortts, SEO, portfolio';

class VoiceCallingService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Get or initialize session memory.
   */
  getSession(sessionId = 'default') {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        state: 'GREETING',
        detectedLanguage: 'en',
        turns: [],
        entities: {
          service: null,
          location: null,
          date: null,
          pricingRequested: false,
          confirmed: false,
        },
      });
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Reset session memory.
   */
  resetSession(sessionId = 'default') {
    this.sessions.delete(sessionId);
    return this.getSession(sessionId);
  }

  /**
   * Get all active sessions.
   */
  getAllSessions() {
    const list = [];
    for (const [id, s] of this.sessions.entries()) {
      list.push(s);
    }
    return list;
  }

  /**
   * Detects caller language / dialect from natural transcript.
   */
  detectLanguage(transcript = '') {
    const text = transcript.toLowerCase();
    
    // Check regional cues in priority order (specific regional before general Hindi)
    for (const [lang, cues] of Object.entries(LOCAL_LANGUAGE_CUES)) {
      const match = cues.some(cue => new RegExp(`\\b${cue}\\b`, 'i').test(text));
      if (match) return lang;
    }

    return 'en';
  }

  /**
   * Extract business entities from transcript.
   */
  extractEntities(text) {
    const entities = {};
    const lower = text.toLowerCase();

    // Service identification
    if (/\b(drone|shoot|video|camera|fpv|cinematography)\b/i.test(lower)) {
      entities.service = 'DRONE_CINEMATOGRAPHY';
    } else if (/\b(website|app|apps|application|software|flutter|react|portal|code)\b/i.test(lower)) {
      entities.service = 'SOFTWARE_DEVELOPMENT';
    }

    // Location extraction
    const cities = ['delhi', 'noida', 'gurgaon', 'gurugram', 'mumbai', 'bangalore', 'bengaluru', 'chandigarh', 'pune', 'hyderabad'];
    for (const city of cities) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(lower)) {
        entities.location = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }

    // Pricing intent
    if (/\b(pricing|cost|price|rate|kitna|daam|paisa|charge|fees)\b/i.test(lower)) {
      entities.pricingRequested = true;
    }

    // Confirmation
    if (/\b(haan|haanji|yes|sure|bhejo|send|kar do)\b/i.test(lower)) {
      entities.confirmed = true;
    }

    return entities;
  }

  /**
   * Generates bilingual/multilingual TwiML inbound response with barge-in support.
   */
  generateInboundTwiML(caller) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="/api/calling/process-speech" method="POST" speechTimeout="auto" timeout="4" bargeIn="true" hints="${VOCAB_HINTS}" language="en-IN">
        <Say voice="Polly.Aditi">Hello! Thank you for calling Infortts &amp; GrowthHikes. Namaste! I am your AI assistant. Aap English ya Hindi me baat kar sakte hain. How can I help you today with our marketing, drone shoots, or software services?</Say>
    </Gather>
    <Say voice="Polly.Aditi">Aapki aawaz nahi aayi. Please tell me what project you are looking to build or scale.</Say>
</Response>`;
  }

  /**
   * Generates outbound lead dispatch payload.
   */
  generateOutboundLeadPayload(lead) {
    return {
      to: lead.phone,
      initialGreeting: `Hi ${lead.name || 'there'}! This is the automated AI coordinator from GrowthHikes & Infortts following up on your request for ${lead.serviceCategory || 'our services'}. Do you have two minutes to discuss your timeline?`,
      scriptType: 'lead_qualification',
      state: 'INITIATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Processes conversational turn with multilingual understanding, entity extraction, and memory persistence.
   */
  processVoiceTurn(userSpeechTranscript, sessionId = 'default') {
    const raw = userSpeechTranscript || '';
    const text = raw.toLowerCase();
    const lang = this.detectLanguage(text);
    const session = this.getSession(sessionId);

    let reply = '';
    let intent = 'GENERAL_INQUIRY';
    const voice = 'Polly.Aditi'; // High-fidelity bilingual Indian English & Hindi

    // Extract entities and update session
    const extracted = this.extractEntities(text);
    Object.assign(session.entities, extracted);
    session.detectedLanguage = lang;
    session.updatedAt = new Date().toISOString();

    // 1. Affirmative Closure (Yes / Haan / Sure / Bhej do) - check first
    if (/\b(haan|haanji|yes|sure|bhejo|send|kar do)\b/i.test(text) && !/\b(shoot|website|drone)\b/i.test(text)) {
      intent = 'CONFIRMATION';
      session.state = 'CONFIRMED';
      if (lang === 'hi') {
        reply = "Bahut badiya! Maine details note kar li hain aur aapko WhatsApp par update bhej diya hai. Have a wonderful day!";
      } else {
        reply = "Perfect! I have recorded your requirements and sent the confirmation over WhatsApp. Thank you and have a wonderful day!";
      }
    }
    // 2. Drone & Cinematography Intent
    else if (/\b(drone|shoot|video|camera|fpv)\b/i.test(text)) {
      intent = 'DRONE_BOOKING';
      session.state = 'QUALIFYING';
      if (lang === 'hi') {
        reply = "Bilkul! Hamari drone team 4K aur FPV indoor walkthrough shoots karti hai certified pilots ke saath. Aapka shoot kis location aur date par planned hai?";
      } else if (lang === 'pa') {
        reply = "Sat Sri Akal ji! Saadi drone cinematography team 4K te FPV shoots kardi hai. Shoot kehdi location te kis tareek nu karna hai?";
      } else {
        reply = "Our drone cinematography team covers 4K aerials and indoor FPV walkthroughs with certified pilots. What location and dates are you planning for the shoot?";
      }
    } 
    // 3. Custom Software & App Development Intent (\bapp\b so it doesn't match 'whatsapp')
    else if (/\b(website|app|apps|application|software|flutter|react|portal|code)\b/i.test(text)) {
      intent = 'SOFTWARE_DEV';
      session.state = 'QUALIFYING';
      if (lang === 'hi') {
        reply = "Hamari custom engineering team high-performance Next.js web applications, Flutter iOS aur Android apps develop karti hai. Aapke application ke core features kya honge?";
      } else {
        reply = "Our custom engineering team builds production Next.js web applications and Flutter iOS/Android apps. What core features does your MVP or business need?";
      }
    } 
    // 4. Pricing, Cost & Package Inquiry
    else if (/\b(pricing|cost|price|rate|kitna|daam|paisa|charge|fees)\b/i.test(text)) {
      intent = 'PRICING_REQUEST';
      session.state = 'PROPOSAL';
      if (lang === 'hi') {
        reply = "Hamare packages customized pilot projects se lekar full monthly retainers tak available hain. Mai aapke WhatsApp number par itemized estimate abhi bhej sakti hu. Kya mai send kar du?";
      } else {
        reply = "Our packages range from customized pilot projects to monthly full-service retainers. I can send an instant itemized estimate to your WhatsApp right now. Should I do that?";
      }
    } 
    // 5. Fallback / General Inquiry
    else {
      if (lang === 'hi') {
        reply = "Aapka project kafi interesting lag raha hai! Kya aap hamare lead engineer ke sath 15 minute ka quick Google Meet demo schedule karna chahenge?";
      } else {
        reply = "That sounds exciting! We can certainly help you with that. Would you prefer a quick Google Meet demo or an in-person meeting?";
      }
    }

    // Save turn into session memory
    session.turns.push({
      role: 'user',
      text: raw,
      lang,
      timestamp: new Date().toISOString(),
    });
    session.turns.push({
      role: 'agent',
      text: reply,
      intent,
      timestamp: new Date().toISOString(),
    });

    return {
      reply,
      intent,
      detectedLanguage: lang,
      voice,
      continueCall: intent !== 'CONFIRMATION',
      suggestedNextStep: intent === 'PRICING_REQUEST' ? 'SEND_WHATSAPP_ESTIMATE' : 'SCHEDULE_MEETING',
      memory: {
        sessionId: session.id,
        state: session.state,
        entities: session.entities,
        turnCount: session.turns.length,
      },
    };
  }
}

module.exports = new VoiceCallingService();
