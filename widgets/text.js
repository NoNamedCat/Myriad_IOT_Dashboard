import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class TextWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `<div style="font-size:28px;text-align:center;line-height:1.5;display:flex;justify-content:center;align-items:center;height:100%;">--</div>`;
    this.el = this.container.firstElementChild;
  }
  
  _updateText(val) {
      this.el.textContent = val == null ? '--' : String(val);
  }

  onMessage(payload) {
    super.onMessage(payload);
    const val = decode(payload, this.jsonPath);
    this._updateText(val);
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        const lastValue = logs[logs.length - 1].payload;
        this._updateText(lastValue);
    }
  }

  getConfigForm() {
    return super.getBaseConfigForm();
  }

  saveConfig() {
    super.saveBaseConfig();
  }

  getOptions() {
      return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath };
  }

  setOptions(o) {
      super.setOptions(o);
      this.loadFromLogger();
  }
}