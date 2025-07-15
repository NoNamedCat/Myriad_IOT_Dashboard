import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class LogWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = { max_lines: 50 };
    this.render();
  }

  render() {
    this.container.innerHTML = `<pre style="width:100%;height:100%;margin:0;overflow-y:auto;font-family:monospace;font-size:12px;white-space:pre-wrap;"></pre>`;
    this.logArea = this.container.firstElementChild;
  }

  onMessage(payload) {
    const val = decode(payload, this.jsonPath);
    const timestamp = new Date().toLocaleTimeString();
    
    const newLogEntry = document.createElement('div');
    newLogEntry.innerHTML = `<strong>[${timestamp}]</strong> ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`;
    
    this.logArea.appendChild(newLogEntry);

    while (this.logArea.children.length > this.config.max_lines) {
      this.logArea.removeChild(this.logArea.firstChild);
    }

    this.logArea.scrollTop = this.logArea.scrollHeight;
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Maximum lines to show:</label>
      <input id="cfg_max_lines" type="number" value="${this.config.max_lines}">`;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.max_lines = parseInt(document.getElementById('cfg_max_lines').value, 10) || 50;
  }
  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath, ...this.config }; }
  setOptions(o) { super.setOptions(o); this.config = { ...this.config, ...o }; this.render(); }
}