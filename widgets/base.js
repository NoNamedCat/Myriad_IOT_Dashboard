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
    
    // El logger se inicializará en setOptions, no aquí.
  }

  onMessage(payload, topic) {
      if (this.config.loggingEnabled && this.logger) {
          const textPayload = new TextDecoder().decode(payload);
          this.logger.log(textPayload);
      }
  }

  onThemeChanged() {}

  // MÉTODO CORREGIDO Y AÑADIDO
  onConfigFormRendered() {
    const viewLogBtn = document.getElementById('viewLogBtn');
    if (viewLogBtn) {
      viewLogBtn.onclick = () => {
        if (this.logger) {
          // La función openLogViewer está disponible globalmente en index.html
          window.openLogViewer(this.id); 
        } else {
          alert('Logging is not enabled for this widget.');
        }
      };
    }

    const clearLogBtn = document.getElementById('clearLogBtn');
    if (clearLogBtn) {
      clearLogBtn.onclick = () => {
        if (this.logger && confirm('Are you sure you want to delete all logged data for this widget?')) {
          this.logger.clear();
          const usageEl = document.getElementById('logUsage');
          if (usageEl) {
              usageEl.textContent = this.logger.getUsage();
          }
          alert('Log data cleared.');
        } else if (!this.logger) {
            alert('Logging is not enabled for this widget.');
        }
      };
    }
  }

  getTopicConfigForm() {
      return `
        <label>Subscription Topic:</label>
        <input id="cfg_topic" type="text" value="${this.topic}">
        <label>JSON Path (optional):</label>
        <input id="cfg_jsonPath" type="text" value="${this.jsonPath}" placeholder="e.g. data.value">
        <hr>
      `;
  }
  
  getLoggingConfigForm() {
      const usage = this.logger ? this.logger.getUsage() : '0.00';
      return `
        <h4>Data Logging</h4>
        <label>
          <input type="checkbox" id="cfg_loggingEnabled" ${this.config.loggingEnabled ? 'checked' : ''}>
          Enable Local Logging
        </label>
        <label for="cfg_loggingLimit">Storage Limit (KB):</label>
        <input id="cfg_loggingLimit" type="number" value="${this.config.loggingLimit}" min="1">
        <small>Current Usage: <b id="logUsage">${usage} KB</b></small>
        <div style="display:flex; gap: 5px; margin-top: 5px;">
          <button type="button" id="viewLogBtn" style="flex-grow:1; background-color: var(--primary-color);">View Log</button>
          <button type="button" id="clearLogBtn" style="flex-grow:1; background-color: var(--danger-color);">Clear Log Data</button>
        </div>
        <hr>
      `;
  }
  
  getBaseConfigForm() {
    return this.getTopicConfigForm() + this.getLoggingConfigForm();
  }
  
  saveBaseConfig() {
      const topicEl = document.getElementById('cfg_topic');
      if (topicEl) {
          this.oldTopic = this.topic;
          this.topic = topicEl.value.trim();
      }

      const jsonPathEl = document.getElementById('cfg_jsonPath');
      if (jsonPathEl) {
          this.jsonPath = jsonPathEl.value.trim();
      }

      this.config.loggingEnabled = document.getElementById('cfg_loggingEnabled').checked;
      this.config.loggingLimit = parseInt(document.getElementById('cfg_loggingLimit').value, 10) || 50;

      if (this.config.loggingEnabled) {
          this.logger = getDataLogger(this.id, this.config.loggingLimit);
          console.log(`[saveBaseConfig] Logger for widget ${this.id} is now ENABLED.`);
      } else {
          this.logger?.clear();
          this.logger = null;
          console.log(`[saveBaseConfig] Logger for widget ${this.id} is now DISABLED.`);
      }
  }

  getConfigForm() { return this.getBaseConfigForm(); }
  saveConfig() { this.saveBaseConfig(); }

  getOptions() { 
      return { 
          topic: this.topic, 
          jsonPath: this.jsonPath, 
          loggingEnabled: this.config.loggingEnabled,
          loggingLimit: this.config.loggingLimit,
      }; 
  }

  setOptions(options) {
      console.log(`[setOptions] Widget ${this.id} receiving options:`, options);
      this.topic = options.topic || this.topic;
      this.jsonPath = options.jsonPath || this.jsonPath;
      this.config.loggingEnabled = options.loggingEnabled === true; // Asegúrate de que es booleano
      this.config.loggingLimit = options.loggingLimit || 50;

      if (this.config.loggingEnabled) {
          this.logger = getDataLogger(this.id, this.config.loggingLimit);
          console.log(`%c[setOptions] Logger INSTANTIATED for widget ID: ${this.id}`, 'color: green; font-weight: bold;');
      } else {
          this.logger?.clear();
          this.logger = null;
           console.log(`%c[setOptions] Logger NOT instantiated for widget ID: ${this.id}`, 'color: red;');
      }
  }

  destroy() {}
}