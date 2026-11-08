/**
 * Server-Rendered Cyber-Telemetry Voice Dashboard
 * Renders live Twilio/SIP/AI health + interactive Web Audio dialer test bench.
 */

function renderDashboard(statusData) {
  const twilioStatus = statusData.twilio.connected ? 'ACTIVE' : 'STANDBY';
  const twilioBadgeColor = statusData.twilio.connected ? '#10b981' : '#f59e0b';
  const sipBadgeColor = statusData.sip.configured ? '#10b981' : '#f59e0b';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infortts Voice Agent // Autonomous Telemetry</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --accent: #00f0ff;
      --accent-glow: rgba(0, 240, 255, 0.25);
      --green: #10b981;
      --amber: #f59e0b;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .logo-badge {
      background: var(--accent);
      color: #000;
      font-weight: 900;
      font-size: 0.85rem;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-family: var(--font-mono);
      letter-spacing: 1px;
    }
    h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.5px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .card-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-pill {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-family: var(--font-mono);
    }
    .meta-value {
      font-size: 1.1rem;
      font-weight: 600;
      font-family: var(--font-mono);
      color: var(--accent);
      word-break: break-all;
    }
    .meta-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .tester-card {
      background: #0d1322;
      border: 1px solid var(--accent);
      box-shadow: 0 0 20px var(--accent-glow);
    }
    .btn {
      background: var(--accent);
      color: #000;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
      font-family: var(--font-mono);
    }
    .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .btn-stop {
      background: #ef4444;
      color: #fff;
    }
    .conversation-log {
      background: #060911;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1rem;
      min-height: 220px;
      max-height: 350px;
      overflow-y: auto;
      font-size: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .bubble {
      padding: 0.6rem 0.9rem;
      border-radius: 6px;
      max-width: 85%;
      line-height: 1.4;
    }
    .bubble-user {
      align-self: flex-end;
      background: #1e293b;
      border-left: 3px solid var(--accent);
    }
    .bubble-agent {
      align-self: flex-start;
      background: #0f172a;
      border-left: 3px solid var(--green);
    }
    .bubble-meta {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.3rem;
      font-family: var(--font-mono);
    }
    .input-row {
      display: flex;
      gap: 0.5rem;
    }
    .input-text {
      flex: 1;
      background: #060911;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      color: var(--text);
      font-size: 0.95rem;
      font-family: inherit;
    }
    .input-text:focus {
      outline: none;
      border-color: var(--accent);
    }
    .pulse-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <span class="logo-badge">INFORTTS</span>
        <h1>Autonomous Voice Agent Telemetry</h1>
      </div>
      <div>
        <span class="status-pill" style="background: rgba(16, 185, 129, 0.15); color: var(--green); border: 1px solid var(--green);">
          <span class="pulse-dot"></span> LIVE
        </span>
      </div>
    </header>

    <!-- Operational Telemetry Grid -->
    <div class="grid">
      <!-- Twilio Card -->
      <div class="card">
        <div class="card-title">
          <span>Twilio Telephony</span>
          <span class="status-pill" style="background: rgba(16, 185, 129, 0.15); color: ${twilioBadgeColor}; border: 1px solid ${twilioBadgeColor};">
            ${twilioStatus}
          </span>
        </div>
        <div class="meta-value">${statusData.twilio.maskedSid}</div>
        <div class="meta-sub">Account: ${statusData.twilio.friendlyName} (${statusData.twilio.type})</div>
        <div class="meta-sub">Webhook: <code>/api/calling/inbound</code></div>
      </div>

      <!-- Linphone SIP Card -->
      <div class="card">
        <div class="card-title">
          <span>Linphone SIP Gateway</span>
          <span class="status-pill" style="background: rgba(16, 185, 129, 0.15); color: ${sipBadgeColor}; border: 1px solid ${sipBadgeColor};">
            ONLINE
          </span>
        </div>
        <div class="meta-value">${statusData.sip.address}</div>
        <div class="meta-sub">Proxy: ${statusData.sip.proxy}</div>
        <div class="meta-sub">Transport: TLS / Opus Codec Enabled</div>
      </div>

      <!-- Multilingual Brain Card -->
      <div class="card">
        <div class="card-title">
          <span>Speech Brain</span>
          <span class="status-pill" style="background: rgba(0, 240, 255, 0.15); color: var(--accent); border: 1px solid var(--accent);">
            VAD ACTIVE
          </span>
        </div>
        <div class="meta-value">7 Local Dialects</div>
        <div class="meta-sub">Languages: Hindi, Hinglish, Punjabi, Tamil, Telugu, Marathi, English</div>
        <div class="meta-sub">Persona Voice: Polly.Aditi (Barge-in Enabled)</div>
      </div>
    </div>

    <!-- Live Audio Test Bench -->
    <div class="card tester-card">
      <div class="card-title">
        <span style="color: var(--accent);">Interactive Voice &amp; Speech Test Bench</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Test from Mobile or Desktop</span>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted);">
        Tap <strong>"Start Voice Call"</strong> to speak naturally in Hindi, Hinglish, Punjabi, or English through your phone mic, or type in the test box below.
      </p>

      <div class="conversation-log" id="chatLog">
        <div class="bubble bubble-agent">
          <strong>Agent:</strong> Hello! Thank you for calling Infortts &amp; GrowthHikes. Namaste! I am your AI assistant. Aap English ya Hindi me baat kar sakte hain. How can I help you today with our marketing, drone shoots, or software services?
          <div class="bubble-meta">Initial Inbound Greeting // Polly.Aditi // Barge-in Active</div>
        </div>
      </div>

      <div class="input-row">
        <button class="btn" id="callBtn" onclick="toggleCall()">
          <span id="callIcon">📞</span> <span id="callText">Start Voice Call (Mic)</span>
        </button>
        <input type="text" class="input-text" id="manualInput" placeholder="Or type a test phrase (e.g. 'Mujhe gym ke liye drone shoot karwana hai')" onkeydown="if(event.key==='Enter') sendManual()">
        <button class="btn" style="background: #1e293b; color: #fff;" onclick="sendManual()">Send</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
        <span>Target Number: <strong>${statusData.phone}</strong></span>
        <span>Render Edge Node: <strong>US-Oregon (Online)</strong></span>
      </div>
    </div>
  </div>

  <script>
    let isCalling = false;
    let recognition = null;
    const synth = window.speechSynthesis;

    // Initialize Web Speech API for phone/browser mic
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        handleUserTurn(transcript);
      };

      recognition.onerror = (e) => {
        console.warn('Speech error:', e.error);
      };
    }

    function toggleCall() {
      const btn = document.getElementById('callBtn');
      const text = document.getElementById('callText');
      const icon = document.getElementById('callIcon');

      if (!isCalling) {
        isCalling = true;
        btn.classList.add('btn-stop');
        text.innerText = 'End Call';
        icon.innerText = '🔴';
        
        // Speak initial greeting
        speak("Hello! Thank you for calling Infortts and GrowthHikes. Namaste! I am your AI assistant. How can I help you today?");

        if (recognition) {
          try { recognition.start(); } catch(e){}
        }
      } else {
        isCalling = false;
        btn.classList.remove('btn-stop');
        text.innerText = 'Start Voice Call (Mic)';
        icon.innerText = '📞';
        if (recognition) recognition.stop();
        if (synth) synth.cancel();
      }
    }

    async function sendManual() {
      const input = document.getElementById('manualInput');
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      await handleUserTurn(val);
    }

    async function handleUserTurn(speech) {
      appendBubble('user', speech);

      try {
        const res = await fetch('/api/calling/process-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ SpeechResult: speech })
        });
        const xml = await res.text();
        
        // Extract <Say> tag content from TwiML XML
        const match = xml.match(/<Say[^>]*>([\\s\\S]*?)<\\/Say>/i);
        const replyText = match ? match[1].trim() : "Thank you for the update.";

        // Extract metadata intent if possible
        appendBubble('agent', replyText);
        speak(replyText);
      } catch (err) {
        appendBubble('agent', 'Error processing speech turn: ' + err.message);
      }
    }

    function appendBubble(role, text) {
      const log = document.getElementById('chatLog');
      const div = document.createElement('div');
      div.className = 'bubble bubble-' + role;
      div.innerHTML = '<strong>' + (role === 'user' ? 'You' : 'Agent') + ':</strong> ' + text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    function speak(text) {
      if (!synth) return;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      synth.speak(utter);
    }
  </script>
</body>
</html>`;
}

module.exports = { renderDashboard };
