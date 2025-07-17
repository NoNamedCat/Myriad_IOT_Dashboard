import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class StepperWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = { min: 0, max: 100, step: 1 };
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 1.5rem; gap: 15px;">
        <button class="stepper-btn" id="${this.id}_minus" style="width: 40px; height: 40px; border-radius: 50%; border: none; background-color: var(--secondary-color); font-size: 2rem;">-</button>
        <span id="${this.id}_val" style="font-weight: bold; min-width: 60px; text-align: center;">0</span>
        <button class="stepper-btn" id="${this.id}_plus" style="width: 40px; height: 40px; border-radius: 50%; border: none; background-color: var(--primary-color); font-size: 2rem; color: var(--primary-text-color);">+</button>
      </div>
    `;
    this.span = this.container.querySelector(`#${this.id}_val`);
    this.btnMinus = this.container.querySelector(`#${this.id}_minus`);
    this.btnPlus = this.container.querySelector(`#${this.id}_plus`);

    this.btnMinus.addEventListener('click', () => this.changeValue(-1));
    this.btnPlus.addEventListener('click', () => this.changeValue(1));
    this._updateValue(this.config.min); // Iniciar en el mínimo
  }

  changeValue(direction) {
    let currentValue = parseFloat(this.span.textContent);
    let newValue = currentValue + (direction * this.config.step);
    newValue = Math.min(Math.max(newValue, this.config.min), this.config.max);
    this._updateValue(newValue);
    this.publish(this.topic, String(newValue));
    if (this.config.loggingEnabled && this.logger) {
      this.logger.log(String(newValue));
    }
  }

  _updateValue(val) {
      if (val != null) {
          const num = parseFloat(val);
          this.span.textContent = num.toFixed(this.config.step < 1 ? 2 : 0);
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
        this._updateValue(logs[logs.length - 1].payload);
    }
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <hr>
      <label>Min:</label><input id="cfg_min" type="number" value="${this.config.min}">
      <label>Max:</label><input id="cfg_max" type="number" value="${this.config.max}">
      <label>Step:</label><input id="cfg_step" type="number" step="any" value="${this.config.step}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.min = Number(document.getElementById('cfg_min').value);
    this.config.max = Number(document.getElementById('cfg_max').value);
    this.config.step = Number(document.getElementById('cfg_step').value);
    this.render();
    this.loadFromLogger();
  }

  getOptions() { return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath, ...this.config }; }
  
  setOptions(o) { 
    super.setOptions(o); 
    this.config = { ...this.config, ...o }; 
    this.render(); 
    this.loadFromLogger();
  }
}