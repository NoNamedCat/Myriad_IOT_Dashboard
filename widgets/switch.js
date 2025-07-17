import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class SwitchWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        onMsg: '1',
        offMsg: '0',
        label: 'Switch',
        onColor: 'var(--primary-color)',
        offColor: 'var(--secondary-color)'
    };
    this.state = false;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; height: 100%; padding: 0 15px;">
        <span id="${this.id}_label" style="font-size: 1.2rem; font-weight: bold;">${this.config.label}</span>
        <label class="switch-control">
          <input type="checkbox" id="${this.id}_checkbox">
          <span class="slider round"></span>
        </label>
      </div>
      <style>
        .switch-control { position: relative; display: inline-block; width: 60px; height: 34px; }
        .switch-control input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${this.config.offColor}; transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
        input:checked + .slider { background-color: ${this.config.onColor}; }
        input:checked + .slider:before { transform: translateX(26px); }
        .slider.round { border-radius: 34px; }
        .slider.round:before { border-radius: 50%; }
      </style>
    `;
    this.checkbox = this.container.querySelector(`#${this.id}_checkbox`);
    this.checkbox.addEventListener('change', () => this.toggle());
    this.updateVisuals();
  }
  
  updateVisuals() {
      this.checkbox.checked = this.state;
      const slider = this.container.querySelector('.slider');
      if(slider) {
          slider.style.backgroundColor = this.state ? this.config.onColor : this.config.offColor;
      }
  }

  toggle() {
    this.state = this.checkbox.checked;
    const payload = this.state ? this.config.onMsg : this.config.offMsg;
    this.publish(this.topic, payload);
    if (this.config.loggingEnabled && this.logger) {
        this.logger.log(payload);
    }
  }

  onMessage(payload) {
    super.onMessage(payload);
    const val = decode(payload, this.jsonPath);
    this.state = String(val) === this.config.onMsg;
    this.updateVisuals();
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        const lastLog = logs[logs.length - 1];
        this.state = String(lastLog.payload) === this.config.onMsg;
        this.updateVisuals();
    }
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <hr>
      <label>Label:</label><input id="cfg_label" value="${this.config.label}">
      <label>ON Message:</label><input id="cfg_onMsg" value="${this.config.onMsg}">
      <label>OFF Message:</label><input id="cfg_offMsg" value="${this.config.offMsg}">
      <label>ON Color:</label><input id="cfg_onColor" type="color" value="${this.config.onColor}">
      <label>OFF Color:</label><input id="cfg_offColor" type="color" value="${this.config.offColor}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.label = document.getElementById('cfg_label').value;
    this.config.onMsg = document.getElementById('cfg_onMsg').value;
    this.config.offMsg = document.getElementById('cfg_offMsg').value;
    this.config.onColor = document.getElementById('cfg_onColor').value;
    this.config.offColor = document.getElementById('cfg_offColor').value;
    this.render();
    this.loadFromLogger();
  }

  getOptions() { 
      return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath, ...this.config };
  }

  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o };
      this.render(); 
      this.loadFromLogger();
  }
}