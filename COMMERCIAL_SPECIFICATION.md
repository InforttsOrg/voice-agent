# Autonomous Voice Agent — Enterprise Commercial Specification
**Commercial Asset Document for TAF (The Agency Foundry) & Enterprise Licensees**  
**Lead Architect**: Sahil Rathee (`sahil.artits.rathee@gmail.com` | `+91 9625213480`)  
**Production Endpoint**: `https://growthhikes-voice-agent.onrender.com`  
**License**: Enterprise Asset Purchase & Commercial Transfer  

---

## 1. Executive Summary & Asset Overview

The **Autonomous Multilingual Voice Agent** is a commercial-grade, human-indistinguishable conversational voice system designed for high-conversion inbound qualification, outbound dispatch, and assistant agents.

Key Differentiators:
- **Indistinguishable From a Human**: Integrates real-time emotional sentiment detection, contextual micro-disfluencies (conversational fillers like *"Ah, got it"*, *"Haanji bilkul"*), breathing pauses (`<break time="180ms"/>`), and dynamic vocal prosody contours.
- **Sub-400ms Latency Flow**: Dual-speed execution engine pairing an ultra-fast deterministic heuristic router (<5ms) with asynchronous Google Gemini 2.5 Flash LLM generation (<350ms) ensures callers never experience unnatural robotic silence.
- **True Multilingual Regional Coverage**: Native handling of Indian English, Hindi, Hinglish, Punjabi, Tamil, Telugu, and Marathi with localized phonetic vocab hints.
- **100% White-Label Multi-Tenant Architecture**: Decoupled from hardcoded branding via `config/tenant.config.json`. Resellers or enterprise clients can alter brand names, services, pricing, agent personas, and webhooks in seconds without recompilation.
- **Universal Voice Provider Layer**: Native plug-and-play abstractions for **AWS Polly Neural / Twilio**, **ElevenLabs Cloned Expressive Audio**, and **Sarvam AI Bulbul Indic Voice**.
- **Project Meeseeks Ready**: Directly integrated into the Meeseeks autonomous orchestrator daemon and mobile applications for verbal task dispatch and ecosystem event narration.

---

## 2. Emotional Prosody & Human-Realism Engine

### 2.1 Emotion Taxonomy & Vocal States

The system continuously classifies caller sentiment during live speech and dynamically adapts the synthesizer across 5 calibrated emotional states:

| Emotional State | Vocal Profile | Pitch | Rate | Volume | Target Intent & Human Realism |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **ENTHUSIASTIC** | `energetic_enthusiastic` | `+6%` | `104%` | `+1.5dB` | High energy, upbeat excitement, validates caller's ambition. |
| **HESITANT / SKEPTICAL** | `reassuring_empathetic` | `-2%` | `93%` | `-0.5dB` | Calm, disarming, empathetic; removes budget friction and uncertainty. |
| **URGENT** | `crisp_efficient` | `+0%` | `106%` | `+0dB` | Direct, fast cadence, rapid confirmation for busy executives. |
| **SATISFACTION** | `celebratory_closing` | `+4%` | `100%` | `+1.0dB` | Warm closing cadence, solidifies agreements. |
| **CURIOUS** | `warm_consultative` | `+2%` | `98%` | `+0dB` | Default welcoming, professional front-desk persona. |

### 2.2 Human Cadence & Micro-Disfluency Injection
Robotic voice assistants fail the Turing test because of clinical perfection. This engine injects:
1. **Conversational Fillers**: Natural prefixes matched to language (`"Right, absolutely"`, `"Hmm, let me check that"`, `"Haanji bilkul"`, `"Achha, samajh gaya"`).
2. **Punctuation Breathing Breaks**: Generates `<break time="180ms"/>` micro-pauses at sentence boundaries simulating human inhalation before speaking.
3. **Dynamic Prosody Shaping**: Applies pitch contours (e.g. `(0%,+0st) (30%,+2st) (80%,-1st) (100%,-2st)`) to reflect human inflection.

---

## 3. System Architecture & Latency Budget

```
[Inbound Caller (Phone / SIP / Web)]
             │
             ▼
   [Twilio / WSS Gateway] (Barge-In Enabled, Speech Gather, 8kHz/16kHz)
             │
             ▼
   [Express Gateway Router] ──▶ Rate Limiter & Tenant Validator
             │
             ├────────────────────────────────────────┐
             ▼                                        ▼
   [Deterministic Fast Router] (<5ms)       [Emotion & Dialogue Engine]
   - Regional Dialect Detection              - Sentiment Analysis
   - Regex Keyword Intent Extraction         - Gemini 2.5 Flash Context Model
   - Immediate Fallback Payload Generation   - Entity Ledger Extraction
             │                                        │
             └───────────────────┬────────────────────┘
                                 ▼
                     [Speech Synthesizer Layer]
                     - Twilio Neural SSML
                     - ElevenLabs API (Voice Cloning)
                     - Sarvam AI Bulbul (Indic TTS)
                                 │
                                 ▼
                     [TwiML / Audio / JSON Stream] (Sub-400ms roundtrip)
```

---

## 4. Multi-Tenant White-Label Configuration

All tenant parameters reside in `config/tenant.config.json` and can be queried or modified via `/api/v1/voice/config`:

```json
{
  "tenantId": "taf-enterprise-client",
  "brand": {
    "name": "GrowthHikes & Infortts",
    "shortName": "GrowthHikes",
    "tagline": "Autonomous AI Voice Operations",
    "contact": {
      "phone": "+91 9625213480",
      "email": "sahil.artits.rathee@gmail.com"
    }
  },
  "persona": {
    "agentName": "Aria",
    "defaultLanguage": "en",
    "voiceProfile": "warm_consultative",
    "humanRealism": {
      "enableDisfluencies": true,
      "enableBreathingPauses": true,
      "enableEmotionAdaptation": true
    }
  },
  "servicesCatalog": [
    {
      "id": "DRONE_CINEMATOGRAPHY",
      "name": "4K Aerial & Indoor FPV Cinematography",
      "keywords": ["drone", "fpv", "shoot", "camera"],
      "startingPrice": "₹15,000 / shoot"
    }
  ]
}
```

---

## 5. Dedicated API Specification for Project Meeseeks & Assistant Apps

### 5.1 Speech Synthesis Endpoint
`POST /api/v1/voice/speak`
- Synthesizes arbitrary text from Python orchestrators or mobile apps into expressive speech with emotion tags and SSML.

### 5.2 Conversational Dialogue Endpoint
`POST /api/v1/voice/converse`
- Full-duplex conversational turn. Accepts spoken transcript or text, resolves caller emotion, executes Gemini turn, updates session state, and returns rich vocal metadata.

### 5.3 Emotion Profiles
`GET /api/v1/voice/profiles`
- Returns all 5 emotion profiles with pitch, rate, contour, and multi-provider parameters.

---

## 6. Verification & Test Suite

The codebase includes 30 automated integration and unit tests passing in `<400ms`:
```bash
npm test
# Result: 30 passed, 0 failed, 100% coverage across:
# - Emotion Engine sentiment and prosody generation
# - Multilingual understanding (English, Hindi, Punjabi)
# - White-label tenant config management
# - Telephony TwiML generation & barge-in gathers
# - Session memory persistence & TTL cleanup
```
