const { describe, it } = require('node:test');
const assert = require('node:assert');
const callingController = require('../../src/controllers/callingController');

describe('Calling Controller Integration Tests', () => {
  function createMockResponse() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      type(contentType) {
        this.headers['content-type'] = contentType;
        return this;
      },
      send(data) {
        this.body = data;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  describe('handleInboundCall', () => {
    it('should return TwiML with status 200 and text/xml content-type for incoming caller', () => {
      const req = {
        body: { From: '+919992396866' },
        query: {},
      };
      const res = createMockResponse();

      callingController.handleInboundCall(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['content-type'], 'text/xml');
      assert.ok(res.body.includes('<Response>'));
      assert.ok(res.body.includes('Polly.Aditi'));
      assert.ok(res.body.includes('/api/calling/process-speech'));
    });
  });

  describe('processSpeechTurn', () => {
    it('should parse speech transcript and return contextual speech turn TwiML', () => {
      const req = {
        body: { SpeechResult: 'I am interested in drone cinematography shoots' },
      };
      const res = createMockResponse();

      callingController.processSpeechTurn(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['content-type'], 'text/xml');
      assert.ok(res.body.includes('<Response>'));
      assert.ok(res.body.includes('drone cinematography'));
      assert.ok(res.body.includes('<Gather input="speech"'));
    });

    it('should return JSON structured response with memory for json clients', () => {
      const req = {
        headers: { accept: 'application/json' },
        body: { SpeechResult: 'Drone shoot chahiye Delhi me', sessionId: 'test-session-1' },
      };
      const res = createMockResponse();

      callingController.processSpeechTurn(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.detectedLanguage, 'hi');
      assert.strictEqual(res.body.data.intent, 'DRONE_BOOKING');
      assert.strictEqual(res.body.data.memory.entities.location, 'Delhi');
    });

    it('should return session memory via getSessionMemory', () => {
      const req = { query: { sessionId: 'test-session-1' } };
      const res = createMockResponse();

      callingController.getSessionMemory(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, 'test-session-1');
      assert.strictEqual(res.body.data.entities.location, 'Delhi');
    });

    it('should reset session memory via resetSessionMemory', () => {
      const req = { body: { sessionId: 'test-session-1' } };
      const res = createMockResponse();

      callingController.resetSessionMemory(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.entities.location, null);
    });
  });

  describe('triggerOutboundLeadCall', () => {
    it('should successfully dispatch outbound call payload for +919992396866', () => {
      const req = {
        body: {
          phone: '+919992396866',
          name: 'Sahil',
          serviceCategory: 'software',
        },
      };
      const res = createMockResponse();

      callingController.triggerOutboundLeadCall(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.message.includes('+919992396866'));
      assert.strictEqual(res.body.data.to, '+919992396866');
      assert.strictEqual(res.body.data.scriptType, 'lead_qualification');
    });

    it('should return 400 validation error if phone number is missing', () => {
      const req = {
        body: { name: 'Sahil' },
      };
      const res = createMockResponse();

      callingController.triggerOutboundLeadCall(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });
  });
});
