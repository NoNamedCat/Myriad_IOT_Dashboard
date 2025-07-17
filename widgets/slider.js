import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class SliderWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = { min: 0, max: 100, step: 1 };
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;">
        <label>Value: <span id="${this.id}_val">0</span></label>
        <input type="range" id="${this.id}_range" min="${this.config.min}" max="${this.config.max}" step="${this.config.step}" value="0" style="width:100%; accent-color: var(--primary-color);">
      </div>`;
    this.span = this.container.querySelector(`#${this.id}_val`);
    this.range = this.container.querySelector(`#${this.id}_range`);
    
    this.range.addEventListener('input', () => this.span.textContent = this.range.value);
    this.range.addEventListener('change', () => {
        this.publish(this.topic, this.range.value);
        if (this.config.loggingEnabled && this.logger) {
            this.logger.log(this.range.value);
        }
    });
  }

  _updateValue(val) {
      if (val != null) {
        this.range.value = val;
        this.span.textContent = val;
      }
  }

  onMessage(payload) {
    super.onMessage(payload);
    const val = decode(payload, this.jsonPath);
    this._updateValue(val);
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        const lastValue = logs[logs.length - 1].payload;
        this._updateValue(lastValue);
    }
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Min:</label><input id="cfg_min" type="number" value="${this.config.min}">
      <label>Max:</label><input id="cfg_max" type="number" value="${this.config.max}">
      <label>Step:</label><input id="cfg_step" type="number" value="${this.config.step}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.min = Number(document.getElementById('cfg_min').value);
    this.config.max = Number(document.getElementById('cfg_max').value);
    this.config.step = Number(document.getElementById('cfg_step').value);
    this.render();
  }

  getOptions() { return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath, ...this.config }; }
  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o }; 
      this.render();
      this.loadFromLogger();
  }
}