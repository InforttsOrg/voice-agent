/**
 * Enterprise White-Label Tenant Configuration Manager
 * Decouples hardcoded business strings and allows multi-tenant white-labeling
 * for TAF commercial distribution.
 */

const fs = require('fs');
const path = require('path');

class TenantConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../../config/tenant.config.json');
    this.currentConfig = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[TenantConfig] Warning: Could not read tenant.config.json, using defaults:', err.message);
    }
    return this.getDefaults();
  }

  getDefaults() {
    return {
      tenantId: 'default',
      brand: {
        name: 'GrowthHikes & Infortts',
        shortName: 'GrowthHikes',
        contact: {
          phone: '+91 9625213480',
          email: 'sahil.artits.rathee@gmail.com'
        }
      },
      persona: {
        agentName: 'Aria',
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'hi', 'pa', 'ta', 'te', 'mr'],
        voiceProfile: 'warm_consultative',
        humanRealism: {
          enableDisfluencies: true,
          enableBreathingPauses: true,
          enableEmotionAdaptation: true,
          fillerFrequency: 0.4
        }
      },
      providers: {
        primaryTTS: 'twilio_neural',
        ttsVoices: {
          'en-IN': 'Polly.Aditi',
          'hi-IN': 'Polly.Kajal'
        }
      },
      servicesCatalog: []
    };
  }

  getConfig() {
    return this.currentConfig;
  }

  updateConfig(newConfig) {
    this.currentConfig = { ...this.currentConfig, ...newConfig };
    return this.currentConfig;
  }

  getBrand() {
    return this.currentConfig.brand;
  }

  getPersona() {
    return this.currentConfig.persona;
  }

  getServices() {
    return this.currentConfig.servicesCatalog || [];
  }
}

module.exports = new TenantConfigManager();
