/**
 * Enterprise Conversational Dialogue & State Manager
 * Decouples state-machine transitions, barge-in detection, entity extraction,
 * and emotion-steered prompt formatting.
 */

const emotionEngine = require('./EmotionEngine');
const sessionMemory = require('./SessionMemory');
const tenantConfig = require('./TenantConfig');

const LOCAL_LANGUAGE_CUES = {
  pa: ['sat sri akal', 'kiddan', 'chahida', 'daso', 'veere', 'karaange'],
  ta: ['vanakkam', 'epdi', 'venum', 'solunga', 'pananum', 'evvalo'],
  te: ['namaskaram', 'ela', 'kavali', 'cheppandi', 'entha'],
  mr: ['namaskar', 'kay', 'pahije', 'sanga', 'kiti', 'karaayche'],
  hi: [
    'namaste', 'kya', 'hai', 'mujhe', 'chahiye', 'kitna', 'hoga', 'daam',
    'batao', 'karega', 'humko', 'karna', 'paise', 'bhai', 'haan', 'nahi'
  ]
};

class DialogueManager {
  constructor() {
    this.tenantConfig = tenantConfig;
  }

  /**
   * Detects caller language / dialect from natural speech transcript.
   */
  detectLanguage(transcript = '') {
    const text = transcript.toLowerCase();
    for (const [lang, cues] of Object.entries(LOCAL_LANGUAGE_CUES)) {
      if (cues.some(cue => new RegExp(`\\b${cue}\\b`, 'i').test(text))) {
        return lang;
      }
    }
    return 'en';
  }

  /**
   * Extracts business entities from text based on tenant catalog.
   */
  extractEntities(text) {
    const entities = {};
    const lower = text.toLowerCase();
    const services = this.tenantConfig.getServices();

    // Catalog matching
    for (const service of services) {
      if (service.keywords && service.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower))) {
        entities.service = service.id;
        break;
      }
    }

    // Heuristic fallbacks if not matched in catalog
    if (!entities.service) {
      if (/\b(drone|shoot|video|camera|fpv|cinematography)\b/i.test(lower)) {
        entities.service = 'DRONE_CINEMATOGRAPHY';
      } else if (/\b(website|app|apps|application|software|flutter|react|portal|code)\b/i.test(lower)) {
        entities.service = 'SOFTWARE_DEVELOPMENT';
      } else if (/\b(marketing|reels|instagram|seo|growth|ads|meta)\b/i.test(lower)) {
        entities.service = 'CREATIVE_MARKETING';
      }
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
    if (/\b(pricing|cost|costs|price|prices|rate|rates|kitna|daam|paisa|charge|charges|fee|fees)\b/i.test(lower)) {
      entities.pricingRequested = true;
    }

    // Confirmation
    if (/\b(haan|haanji|yes|sure|bhejo|send|kar do|pakka)\b/i.test(lower)) {
      entities.confirmed = true;
    }

    return entities;
  }

  /**
   * Builds an emotion-steered system instruction for LLM generation.
   */
  buildSystemPrompt(callerEmotion, lang = 'en') {
    const brand = this.tenantConfig.getBrand();
    const persona = this.tenantConfig.getPersona();
    const services = this.tenantConfig.getServices();

    const servicesText = services.map((s, i) => `${i + 1}. ${s.name}: ${s.shortDescription}`).join('\n');

    return `You are ${persona.agentName}, the AI voice receptionist for ${brand.name}.
Primary Objective: Warmly greet callers, identify intent, answer concisely, and qualify leads with human emotional resonance.

Services Offered:
${servicesText || '1. Creative Marketing\n2. Drone Cinematography\n3. Custom Software Development'}

Current Caller Emotional State: ${callerEmotion.emotion} (Vocal profile: ${callerEmotion.vocalState}).
Emotional Adaptation Guidance:
- If ENTHUSIASTIC: Match high energy, be encouraging, celebrate their vision.
- If HESITANT_OR_SKEPTICAL: Speak gently, be reassuring, transparent, and remove friction.
- If URGENT: Be crisp, direct, and confirm action immediately.
- If SATISFACTION: Warmly celebrate agreement and confirm next steps.
- If CURIOUS: Be informative, welcoming, and open-ended.

Critical Voice Telephony Rules:
- Keep answers STRICTLY to 1 or 2 concise, natural sentences (under 30 words). Never output bullet points.
- Match caller's language naturally (English, Hindi, Hinglish, Punjabi, etc.).
- Contact for escalations: ${brand.contact?.phone || '+91 9625213480'}.

Output format: Return STRICTLY valid JSON with keys:
"reply": (string, 1-2 sentences natural spoken text),
"intent": ("MARKETING_INQUIRY" | "DRONE_BOOKING" | "SOFTWARE_DEV" | "PRICING_REQUEST" | "CONFIRMATION" | "GENERAL_INQUIRY"),
"entities": {"service": string|null, "location": string|null, "date": string|null, "pricingRequested": boolean, "confirmed": boolean}`;
  }

  /**
   * Deterministic fast heuristic fallback (<5ms)
   */
  getDeterministicFallback(text, lang, emotionalState) {
    let reply = '';
    let intent = 'GENERAL_INQUIRY';
    let nextState = 'QUALIFYING';

    if (/\b(haan|haanji|yes|sure|bhejo|send|kar do)\b/i.test(text) && !/\b(shoot|website|drone)\b/i.test(text)) {
      intent = 'CONFIRMATION';
      nextState = 'CONFIRMED';
      reply = lang === 'hi'
        ? "Bahut badiya! Maine details note kar li hain aur aapko WhatsApp par update bhej diya hai. Have a wonderful day!"
        : "Perfect! I have recorded your requirements and sent the confirmation over WhatsApp. Thank you and have a wonderful day!";
    } else if (/\b(drone|shoot|video|camera|fpv)\b/i.test(text)) {
      intent = 'DRONE_BOOKING';
      if (lang === 'hi') {
        reply = "Bilkul! Hamari drone team 4K aur FPV indoor walkthrough shoots karti hai certified pilots ke saath. Aapka shoot kis location aur date par planned hai?";
      } else if (lang === 'pa') {
        reply = "Sat Sri Akal ji! Saadi drone cinematography team 4K te FPV shoots kardi hai. Shoot kehdi location te kis tareek nu karna hai?";
      } else {
        reply = "Our drone cinematography team covers 4K aerials and indoor FPV walkthroughs with certified pilots. What location and dates are you planning for the shoot?";
      }
    } else if (/\b(website|app|apps|application|software|flutter|react|portal|code)\b/i.test(text)) {
      intent = 'SOFTWARE_DEV';
      reply = lang === 'hi'
        ? "Hamari custom engineering team high-performance Next.js web applications, Flutter iOS aur Android apps develop karti hai. Aapke application ke core features kya honge?"
        : "Our custom engineering team builds production Next.js web applications and Flutter iOS/Android apps. What core features does your MVP or business need?";
    } else if (/\b(marketing|reels|instagram|seo|growth|ads|meta|ad|lead|branding)\b/i.test(text)) {
      intent = 'MARKETING_INQUIRY';
      reply = lang === 'hi'
        ? "Hamari growth team viral Reels, Meta ad funnels aur Google Business rankings manage karti hai. Aapka business kis niche me hai?"
        : "GrowthHikes manages high-conversion viral Reels, Meta ad campaigns, and local SEO rankings. What industry is your brand in?";
    } else if (/\b(pricing|cost|price|rate|kitna|daam|paisa|charge|fees)\b/i.test(text)) {
      intent = 'PRICING_REQUEST';
      nextState = 'PROPOSAL';
      reply = lang === 'hi'
        ? "Hamare packages customized pilot projects se lekar full monthly retainers tak available hain. Mai aapke WhatsApp number par itemized estimate abhi bhej sakti hu. Kya mai send kar du?"
        : "Our packages range from customized pilot projects to monthly full-service retainers. I can send an instant itemized estimate to your WhatsApp right now. Should I do that?";
    } else {
      reply = lang === 'hi'
        ? "Namaste! GrowthHikes & Infortts me aapka swagat hai. Kya aap creative marketing, 4K drone shoots, ya software development ke bare me janna chahte hain?"
        : "Welcome to GrowthHikes & Infortts! Are you looking for our creative marketing funnels, 4K drone shoots, or custom software development?";
    }

    return {
      reply,
      intent,
      nextState,
      emotionalState
    };
  }
}

module.exports = new DialogueManager();
