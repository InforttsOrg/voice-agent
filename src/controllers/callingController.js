const voiceCallingService = require('../services/voiceCallingService');

exports.handleInboundCall = (req, res) => {
  const caller = req.body.From || req.query.From || 'Unknown Caller';
  console.log(`[Voice Inbound] Call received from ${caller}`);

  const twiml = voiceCallingService.generateInboundTwiML(caller);
  res.type('text/xml');
  res.send(twiml);
};

exports.processSpeechTurn = (req, res) => {
  const speechResult = req.body.SpeechResult || req.body.transcript || req.body.text || '';
  const sessionId = req.body.sessionId || req.body.CallSid || 'default';
  console.log(`[Voice Speech] [Session: ${sessionId}] User said: "${speechResult}"`);

  const outcome = voiceCallingService.processVoiceTurn(speechResult, sessionId);

  // Return TwiML XML if requested or from Twilio, otherwise JSON for web test bench
  const isJsonClient = (req.headers && req.headers.accept && req.headers.accept.includes('application/json')) || (typeof req.is === 'function' && req.is('json'));

  const responseTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">${outcome.reply}</Say>
    <Gather input="speech" action="/api/calling/process-speech" method="POST" speechTimeout="auto" timeout="3">
        <Say voice="Polly.Aditi">What date or time works best for you?</Say>
    </Gather>
</Response>`;

  if (isJsonClient) {
    return res.json({
      success: true,
      data: {
        reply: outcome.reply,
        intent: outcome.intent,
        detectedLanguage: outcome.detectedLanguage,
        voice: outcome.voice,
        memory: outcome.memory,
        twiml: responseTwiml,
      },
    });
  }

  res.type('text/xml');
  res.send(responseTwiml);
};

exports.getSessionMemory = (req, res) => {
  const sessionId = req.params?.sessionId || req.query?.sessionId || req.body?.sessionId || 'default';
  const session = voiceCallingService.getSession(sessionId);
  res.json({
    success: true,
    data: session,
  });
};

exports.resetSessionMemory = (req, res) => {
  const sessionId = req.params?.sessionId || req.query?.sessionId || req.body?.sessionId || 'default';
  const session = voiceCallingService.resetSession(sessionId);
  res.json({
    success: true,
    message: `Session memory for ${sessionId} reset successfully`,
    data: session,
  });
};

exports.triggerOutboundLeadCall = (req, res) => {
  const { phone, name, serviceCategory } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: { message: 'Phone number is required to trigger automated voice call', code: 'VALIDATION_ERROR' },
    });
  }

  const payload = voiceCallingService.generateOutboundLeadPayload({ phone, name, serviceCategory });

  console.log(`[Voice Outbound] Triggering AI Calling Agent to ${phone} for lead ${name}`);

  res.json({
    success: true,
    message: `Autonomous AI Calling Agent dispatched to ${phone}`,
    data: payload,
  });
};
