import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class ColorWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%;">
        <label for="${this.id}_picker">Select a color:</label>
        <input type="color" id="${this.id}_picker" value="#ffffff" style="width: 80%; height: 50px; border: none; padding: 0; background: none;">
        <div id="${this.id}_hex_value" style="margin-top: 10px; font-family: monospace;">#ffffff</div>
      </div>
    `;

    this.colorPicker = this.container.querySelector(`#${this.id}_picker`);
    this.hexValueDiv = this.container.querySelector(`#${this.id}_hex_value`);

    this.colorPicker.addEventListener('change', () => {
      const color = this.colorPicker.value;
      this.publish(this.topic, color);
      this.hexValueDiv.textContent = color;
    });

    this.colorPicker.addEventListener('input', () => {
      this.hexValueDiv.textContent = this.colorPicker.value;
    });
  }

  onMessage(payload) {
    const val = String(decode(payload, this.jsonPath));
    if (/^#[0-9a-f]{6}$/i.test(val)) {
      this.colorPicker.value = val;
      this.hexValueDiv.textContent = val;
    }
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
      this.render();
  }
}