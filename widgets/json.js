import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class JsonWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `<textarea style="width:100%;height:100%;border:none;resize:none;font-family:monospace;font-size:12px; background-color: var(--widget-bg-color); color: var(--text-color);" readonly></textarea>`;
    this.el = this.container.firstElementChild;
  }

  onMessage(payload) {
    const val = decode(payload, this.jsonPath);
    try {
      this.el.value = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    } catch {
      this.el.value = String(val);
    }
  }

  getConfigForm() { return super.getBaseConfigForm(); }
  saveConfig() { super.saveBaseConfig(); }
  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath }; }
  setOptions(o) { super.setOptions(o); }
}