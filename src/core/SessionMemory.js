/**
 * Enterprise Production Session & Memory Manager
 * Tracks multi-turn dialogue, caller emotional trajectory, extracted entities, and TTL cleanup.
 */

class SessionMemoryStore {
  constructor(options = {}) {
    this.sessions = new Map();
    this.ttlMs = options.ttlMs || 3600000; // 1 hour default
  }

  getSession(sessionId = 'default') {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        state: 'GREETING',
        detectedLanguage: 'en',
        currentVocalState: 'warm_consultative',
        emotionalHistory: [],
        turns: [],
        entities: {
          service: null,
          location: null,
          date: null,
          pricingRequested: false,
          confirmed: false,
          custom: {}
        }
      });
    }

    const session = this.sessions.get(sessionId);
    session.updatedAt = new Date().toISOString();
    return session;
  }

  recordTurn(sessionId, userText, agentText, metadata = {}) {
    const session = this.getSession(sessionId);

    if (metadata.emotionalState) {
      session.currentVocalState = metadata.emotionalState.vocalState || session.currentVocalState;
      session.emotionalHistory.push({
        emotion: metadata.emotionalState.emotion,
        vocalState: metadata.emotionalState.vocalState,
        confidence: metadata.emotionalState.confidence,
        timestamp: new Date().toISOString()
      });
    }

    if (userText) {
      session.turns.push({
        role: 'user',
        text: userText,
        lang: metadata.lang || session.detectedLanguage,
        timestamp: new Date().toISOString()
      });
    }

    if (agentText) {
      session.turns.push({
        role: 'agent',
        text: agentText,
        intent: metadata.intent || 'GENERAL_INQUIRY',
        vocalState: session.currentVocalState,
        timestamp: new Date().toISOString()
      });
    }

    if (metadata.entities) {
      Object.assign(session.entities, metadata.entities);
    }

    if (metadata.state) {
      session.state = metadata.state;
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  resetSession(sessionId = 'default') {
    this.sessions.delete(sessionId);
    return this.getSession(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      const updated = new Date(session.updatedAt).getTime();
      if (now - updated > this.ttlMs) {
        this.sessions.delete(id);
      }
    }
  }
}

module.exports = new SessionMemoryStore();
