import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class InputWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = { placeholder: 'Type and press Enter' };
    this.render();
  }

  render() {
    this.container.innerHTML = `<input type="text" style="width:100%;height:100%;box-sizing:border-box; background-color: var(--widget-bg-color); color: var(--text-color); border: none;" placeholder="${this.config.placeholder}">`;
    this.inp = this.container.firstElementChild;
    this.inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && this.inp.value.trim()) {
        this.publish(this.topic, this.inp.value.trim());
        this.inp.value = '';
      }
    });
  }

  onMessage(payload) {
    const val = decode(payload, this.jsonPath);
    if (val != null) this.inp.value = val;
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Placeholder text:</label>
      <input id="cfg_placeholder" value="${this.config.placeholder}">`;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.placeholder = document.getElementById('cfg_placeholder').value;
    this.render();
  }

  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath, ...this.config }; }
  setOptions(o) { super.setOptions(o); this.config = { ...this.config, ...o }; this.render(); }
}