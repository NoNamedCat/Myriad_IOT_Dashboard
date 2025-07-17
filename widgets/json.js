import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class JsonWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `<textarea style="width:100%;height:100%;border:none;resize:none;font-family:monospace;font-size:12px; background-color: var(--widget-bg-color); color: var(--text-color);" readonly></textarea>`;
    this.el = this.container.firstElementChild;
  }
  
  _updateValue(val) {
      try {
        this.el.value = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
      } catch {
        this.el.value = String(val);
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
        const lastLog = logs[logs.length - 1];
        try {
            // El logger guarda strings, así que intentamos parsearlo de nuevo
            const parsedPayload = JSON.parse(lastLog.payload);
            this._updateValue(parsedPayload);
        } catch(e) {
            this._updateValue(lastLog.payload);
        }
    }
  }

  getConfigForm() { return super.getBaseConfigForm(); }
  saveConfig() { super.saveBaseConfig(); }
  getOptions() { return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath }; }
  setOptions(o) { 
      super.setOptions(o);
      this.loadFromLogger();
  }
}