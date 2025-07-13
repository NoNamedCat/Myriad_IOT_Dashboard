import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class ButtonWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        onMsg: '1',
        offMsg: '0',
        onText: 'ON',
        offText: 'OFF',
        onColor: 'var(--primary-color)',
        offColor: 'var(--secondary-color)'
    };
    this.state = false;
    this.render();
  }

  render() {
    this.container.innerHTML = `<button style="width:100%;height:100%;font-size:1.5rem; border:none; color: var(--primary-text-color);"></button>`;
    this.btn = this.container.firstElementChild;
    this.btn.addEventListener('click', () => this.toggle());
    this.updateButtonVisuals();
  }

  toggle() {
    this.state = !this.state;
    this.updateButtonVisuals();
    this.publish(this.topic, this.state ? this.config.onMsg : this.config.offMsg);
  }

  onMessage(payload) {
    const val = decode(payload, this.jsonPath);
    this.state = String(val) === this.config.onMsg;
    this.updateButtonVisuals();
  }
  
  updateButtonVisuals() {
    this.btn.textContent = this.state ? this.config.onText : this.config.offText;
    const colorVar = this.state ? this.config.onColor : this.config.offColor;
    this.btn.style.backgroundColor = colorVar;
  }
  
  onThemeChanged() {
      this.updateButtonVisuals();
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>ON Message:</label><input id="cfg_onMsg" value="${this.config.onMsg}">
      <label>OFF Message:</label><input id="cfg_offMsg" value="${this.config.offMsg}">
      <label>ON Text:</label><input id="cfg_onText" value="${this.config.onText}">
      <label>OFF Text:</label><input id="cfg_offText" value="${this.config.offText}">
      <label>ON Button Color:</label><input id="cfg_onColor" type="color" value="${this.config.onColor}">
      <label>OFF Button Color:</label><input id="cfg_offColor" type="color" value="${this.config.offColor}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.onMsg   = document.getElementById('cfg_onMsg').value;
    this.config.offMsg  = document.getElementById('cfg_offMsg').value;
    this.config.onText  = document.getElementById('cfg_onText').value;
    this.config.offText = document.getElementById('cfg_offText').value;
    this.config.onColor = document.getElementById('cfg_onColor').value;
    this.config.offColor = document.getElementById('cfg_offColor').value;
    this.updateButtonVisuals();
  }

  getOptions() { 
      return { topic: this.topic, jsonPath: this.jsonPath, ...this.config };
  }

  setOptions(o) { 
      super.setOptions(o); 
      if (o.onText !== undefined) this.config.onText = o.onText;
      if (o.offText !== undefined) this.config.offText = o.offText;
      if (o.onMsg !== undefined) this.config.onMsg = o.onMsg;
      if (o.offMsg !== undefined) this.config.offMsg = o.offMsg;
      if (o.onColor !== undefined) this.config.onColor = o.onColor;
      if (o.offColor !== undefined) this.config.offColor = o.offColor;
      this.render(); 
  }
}
