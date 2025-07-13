import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class TextWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `<div style="font-size:28px;text-align:center;line-height:1.5;display:flex;justify-content:center;align-items:center;height:100%;">--</div>`;
    this.el = this.container.firstElementChild;
  }

  onMessage(payload) {
    const val = decode(payload, this.jsonPath);
    this.el.textContent = val == null ? '--' : String(val);
  }

  getConfigForm() {
    return super.getBaseConfigForm();
  }

  saveConfig() {
    super.saveBaseConfig();
  }

  getOptions() {
      return { topic: this.topic, jsonPath: this.jsonPath };
  }

  setOptions(o) {
      super.setOptions(o);
  }
}