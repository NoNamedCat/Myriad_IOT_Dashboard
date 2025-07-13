import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class SelectWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
      options: 'Option 1:val1,Option 2:val2'
    };
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display:flex; align-items:center; height:100%;">
        <select id="${this.id}_select" style="width:100%; font-size: 1rem; padding: 8px; background-color: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color);"></select>
      </div>
    `;
    this.selectEl = this.container.querySelector(`#${this.id}_select`);
    this.populateOptions();

    this.selectEl.addEventListener('change', () => {
      const selectedValue = this.selectEl.value;
      if (selectedValue) {
        this.publish(this.topic, selectedValue);
      }
    });
  }
  
  populateOptions() {
      this.selectEl.innerHTML = '';
      try {
        const pairs = this.config.options.split(',');
        pairs.forEach(pair => {
            const parts = pair.split(':');
            if (parts.length === 2) {
                const option = document.createElement('option');
                option.textContent = parts[0].trim();
                option.value = parts[1].trim();
                this.selectEl.appendChild(option);
            }
        });
      } catch (e) {
        console.error("Error parsing select widget options:", e);
      }
  }

  onMessage(payload) {
    const val = String(decode(payload, this.jsonPath));
    if ([...this.selectEl.options].some(o => o.value === val)) {
        this.selectEl.value = val;
    }
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Options (format <code>Text:value</code>, comma-separated):</label>
      <textarea id="cfg_options" style="width:100%; height: 80px;">${this.config.options}</textarea>
      <small>Example: Slow Fan:slow,Fast Fan:fast</small>
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.options = document.getElementById('cfg_options').value;
    this.populateOptions();
  }
  
  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath, ...this.config }; }
  setOptions(o) { super.setOptions(o); this.config = { ...this.config, ...o }; this.render(); }
}