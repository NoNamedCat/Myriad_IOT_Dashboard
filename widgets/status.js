import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class StatusWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        onMsg: 'online',
        onColor: 'var(--primary-color)',
        offMsg: 'offline',
        offColor: 'var(--danger-color)',
        defaultColor: 'var(--secondary-color)'
    };
    this.lastValue = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:100%;">
        <span id="${this.id}_indicator" style="width:50px; height:50px; border-radius:50%; transition: background-color 0.3s;"></span>
      </div>
    `;
    this.indicator = this.container.querySelector(`#${this.id}_indicator`);
    this.updateIndicator();
  }
  
  updateIndicator() {
      const val = this.lastValue;
      if (val === this.config.onMsg) {
        this.indicator.style.backgroundColor = this.config.onColor;
      } else if (val === this.config.offMsg) {
        this.indicator.style.backgroundColor = this.config.offColor;
      } else {
        this.indicator.style.backgroundColor = this.config.defaultColor;
      }
  }

  onMessage(payload) {
    this.lastValue = String(decode(payload, this.jsonPath));
    this.updateIndicator();
  }
  
  onThemeChanged() {
      this.updateIndicator();
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Message for 'ON':</label><input id="cfg_onMsg" value="${this.config.onMsg}">
      <label>Color for 'ON':</label><input id="cfg_onColor" type="color" value="${this.config.onColor}">
      <hr>
      <label>Message for 'OFF':</label><input id="cfg_offMsg" value="${this.config.offMsg}">
      <label>Color for 'OFF':</label><input id="cfg_offColor" type="color" value="${this.config.offColor}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.onMsg = document.getElementById('cfg_onMsg').value;
    this.config.onColor = document.getElementById('cfg_onColor').value;
    this.config.offMsg = document.getElementById('cfg_offMsg').value;
    this.config.offColor = document.getElementById('cfg_offColor').value;
    this.updateIndicator();
  }
  
  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath, ...this.config }; }
  
  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o }; 
      this.render(); 
  }
}