// widgets/base.js

// --- CORRECCIÓN: La ruta ahora usa '../' para subir un nivel de directorio ---
import { getDataLogger } from '../libs/datalogger.js';

export default class BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    this.id = id;
    this.container = container;
    this.publish = publishFn;
    this.parentGrid = parentGrid;
    
    this.topic = 'no/topic/defined';
    this.jsonPath = '';

    this.config = {
      ...this.config,
      loggingEnabled: false,
      loggingLimit: 50,
    };
    
    if (this.config.loggingEnabled) {
        this.logger = getDataLogger(this.id, this.config.loggingLimit);
    }
  }

  onMessage(payload, topic) {
      if (this.config.loggingEnabled && this.logger) {
          const textPayload = new TextDecoder().decode(payload);
          this.logger.log(textPayload);
      }
  }

  onThemeChanged() {}
  onConfigFormRendered() {}

  getBaseConfigForm() {
    const usage = this.logger ? this.logger.getUsage() : '0.00';
    return `
      <label>Subscription Topic:</label>
      <input id="cfg_topic" type="text" value="${this.topic}">
      <label>JSON Path (optional):</label>
      <input id="cfg_jsonPath" type="text" value="${this.jsonPath}" placeholder="e.g. data.value">
      <hr>
      <h4>Data Logging</h4>
      <label>
        <input type="checkbox" id="cfg_loggingEnabled" ${this.config.loggingEnabled ? 'checked' : ''}>
        Enable Local Logging
      </label>
      <label for="cfg_loggingLimit">Storage Limit (KB):</label>
      <input id="cfg_loggingLimit" type="number" value="${this.config.loggingLimit}" min="1">
      <small>Current Usage: <b id="logUsage">${usage} KB</b></small>
      <button type="button" id="clearLogBtn" style="background-color: var(--danger-color); margin-top: 5px;">Clear Log Data</button>
      <hr>
    `;
  }
  
  saveBaseConfig() {
      const newTopic = document.getElementById('cfg_topic').value.trim();
      this.oldTopic = this.topic; 
      this.topic = newTopic;
      this.jsonPath = document.getElementById('cfg_jsonPath').value.trim();

      this.config.loggingEnabled = document.getElementById('cfg_loggingEnabled').checked;
      this.config.loggingLimit = parseInt(document.getElementById('cfg_loggingLimit').value, 10) || 50;

      if (this.config.loggingEnabled) {
          this.logger = getDataLogger(this.id, this.config.loggingLimit);
      } else {
          this.logger?.clear();
          this.logger = null;
      }
  }

  getConfigForm() { return 'No configuration options available.'; }
  saveConfig() {}

  getOptions() { 
      return { 
          topic: this.topic, 
          jsonPath: this.jsonPath, 
          loggingEnabled: this.config.loggingEnabled,
          loggingLimit: this.config.loggingLimit,
      }; 
  }

  setOptions(options) {
      this.topic = options.topic || this.topic;
      this.jsonPath = options.jsonPath || this.jsonPath;
      this.config.loggingEnabled = options.loggingEnabled || false;
      this.config.loggingLimit = options.loggingLimit || 50;

      if (this.config.loggingEnabled) {
          this.logger = getDataLogger(this.id, this.config.loggingLimit);
      }
  }

  destroy() {}
}
