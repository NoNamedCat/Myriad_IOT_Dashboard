import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class ImageWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `<img style="width:100%; height:100%; object-fit:contain;" alt="Waiting for image on topic: ${this.topic}">`;
    this.imgEl = this.container.firstElementChild;
  }

  _updateImage(val) {
    if (val.startsWith('http') || val.startsWith('data:image')) {
      this.imgEl.src = val;
    } else {
      this.imgEl.src = `data:image/jpeg;base64,${val}`;
    }
  }

  onMessage(payload) {
    super.onMessage(payload);
    const val = String(decode(payload, this.jsonPath));
    this._updateImage(val);
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        const lastLog = logs[logs.length - 1];
        this._updateImage(lastLog.payload);
    }
  }
  
  getConfigForm() { return super.getBaseConfigForm(); }
  saveConfig() { super.saveBaseConfig(); this.render(); }
  getOptions() { return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath }; }
  setOptions(o) { 
      super.setOptions(o); 
      this.render();
      this.loadFromLogger();
  }
}