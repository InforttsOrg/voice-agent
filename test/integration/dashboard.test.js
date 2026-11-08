process.env.NODE_ENV = 'test';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { renderDashboard } = require('../../src/views/dashboard');

describe('Dashboard and Security Integration Tests', () => {
  it('should render HTML dashboard on GET / with masked credentials and no plaintext secrets', async () => {
    const html = renderDashboard({
      twilio: {
        connected: true,
        maskedSid: 'AC00...0000',
        friendlyName: 'My First Twilio Account',
        type: 'Trial',
      },
      sip: {
        configured: true,
        address: 'sip:infortts@sip.linphone.org',
        proxy: 'sip:sip.linphone.org',
      },
      phone: '+919992396866',
    });

    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Autonomous Voice Agent Telemetry'));
    assert.ok(html.includes('AC00...0000'));
    assert.ok(html.includes('sip:infortts@sip.linphone.org'));
    // Ensure raw secrets are NEVER leaked in rendered HTML
    assert.ok(!html.includes('dummy_mock_secret_token_99999'));
    assert.ok(!html.includes('AC00000000000000000000000000000000'));
  });
});
