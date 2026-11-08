const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const callingController = require('./controllers/callingController');
const { renderDashboard } = require('./views/dashboard');
const rateLimiter = require('./middleware/rateLimiter');
const voiceCallingService = require('./services/voiceCallingService');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 26002;

// Security hardening
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline Web Audio/Speech API simulator
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting (120 requests/min per IP)
app.use(rateLimiter({ windowMs: 60000, max: 120 }));

// Serve static assets from public/
app.use(express.static(path.join(__dirname, '../public')));

// Helper to mask sensitive strings
function mask(str, visibleChars = 4) {
  if (!str) return 'NOT_CONFIGURED';
  if (str.length <= visibleChars * 2) return '******';
  return `${str.substring(0, visibleChars)}...${str.substring(str.length - visibleChars)}`;
}

// Live Status & Telemetry Data Provider
function getSystemStatus() {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;

  return {
    service: 'infortts-voice-agent',
    status: 'ONLINE',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    phone: process.env.ANDROID_PHONE_NUMBER || '+919992396866',
    twilio: {
      connected: Boolean(twilioSid && twilioToken),
      maskedSid: mask(twilioSid, 4),
      friendlyName: 'My First Twilio Account',
      type: 'Trial',
    },
    sip: {
      configured: Boolean(process.env.LINPHONE_SIP_ADDRESS),
      address: process.env.LINPHONE_SIP_ADDRESS || 'sip:infortts@sip.linphone.org',
      proxy: process.env.LINPHONE_SIP_PROXY || 'sip:sip.linphone.org',
      wsBridge: 'wss://growthhikes-voice-agent.onrender.com/ws/sip',
    },
    speechBrain: {
      vad: 'ACTIVE',
      languages: ['en', 'hi', 'pa', 'ta', 'te', 'mr'],
      voice: 'Polly.Aditi',
    },
    memory: {
      activeSessions: voiceCallingService.getAllSessions().length,
    },
  };
}

// 1. Static / Test Workbench Routes
app.get(['/test', '/workbench'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test.html'));
});

// Server-rendered dashboard on /dashboard
app.get('/dashboard', (req, res) => {
  const status = getSystemStatus();
  const html = renderDashboard(status);
  res.type('text/html').send(html);
});

// Fallback to static test.html on /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test.html'));
});

// 2. JSON Health & Telemetry Endpoint
app.get('/health', (req, res) => {
  res.json(getSystemStatus());
});

// 3. Telephony Webhooks (Twilio / Linphone / VoIP)
app.post('/api/calling/inbound', callingController.handleInboundCall);
app.post('/api/calling/process-speech', callingController.processSpeechTurn);
app.post('/api/calling/outbound-dispatch', callingController.triggerOutboundLeadCall);

// 4. Client Gateway Authorization & License Enforcement
app.post('/api/gateway/auth', (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;
  const validKey = process.env.VOICE_API_KEY || '27DuRfGq7V7RNQk0bzen26CvmbiGCNJIvGzvwH4I';

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({
      success: false,
      error: { message: 'Unauthorized: Invalid or missing Infortts Voice License Key', code: 'UNAUTHORIZED' }
    });
  }

  res.json({
    success: true,
    message: 'Authorized Gateway Client',
    tenant: 'infortts-client-prod',
    tier: 'enterprise-voice',
    validUntil: '2027-12-31T23:59:59Z'
  });
});

// 5. Memory Management Endpoints
app.get('/api/memory', callingController.getSessionMemory);
app.post('/api/memory/reset', callingController.resetSessionMemory);

// Create HTTP server
const server = http.createServer(app);

// 5. WebSocket Server for real-time Audio & SIP stream
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  const url = req.url;
  const isSip = url.includes('/ws/sip');
  console.log(`[WebSocket] Client connected: ${url} (SIP=${isSip})`);

  ws.send(JSON.stringify({
    type: 'ready',
    service: 'infortts-voice-agent',
    protocol: isSip ? 'SIP/2.0-over-WSS' : 'VOICE-STREAM',
    timestamp: new Date().toISOString(),
  }));

  ws.on('message', (message) => {
    try {
      const text = message.toString();
      // Handle JSON messages (voice events from browser or mobile client)
      if (text.startsWith('{')) {
        const data = JSON.parse(text);
        if (data.type === 'user_turn') {
          const outcome = voiceCallingService.processVoiceTurn(data.text || '', data.sessionId || 'default');
          ws.send(JSON.stringify({
            type: 'agent_turn',
            reply: outcome.reply,
            intent: outcome.intent,
            detectedLanguage: outcome.detectedLanguage,
            memory: outcome.memory,
          }));
        }
      } else if (isSip) {
        // Echo / acknowledge SIP message
        console.log(`[SIP-WSS Frame Received]: ${text.substring(0, 80)}`);
        if (text.startsWith('OPTIONS') || text.startsWith('REGISTER')) {
          ws.send('SIP/2.0 200 OK\r\n\r\n');
        }
      }
    } catch (err) {
      console.error('[WebSocket Error]', err.message);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected`);
  });
});

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  if (pathname.startsWith('/ws/voice') || pathname.startsWith('/ws/sip') || pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Infortts Voice Agent] Running securely on port ${PORT}`);
  });
}

module.exports = server;
