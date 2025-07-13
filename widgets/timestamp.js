import BaseWidget from './base.js';

export default class TimestampWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.lastMessageTime = null;
    this.updateInterval = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; height:100%;">
        <div style="font-size:1rem; color:var(--text-color); opacity: 0.8;">Last message received:</div>
        <div id="${this.id}_time" style="font-size:1.5rem; font-weight:bold; margin-top:5px;">Never</div>
      </div>
    `;
    this.timeEl = this.container.querySelector(`#${this.id}_time`);
  }

  onMessage(payload) {
    this.lastMessageTime = new Date();
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => this.updateDisplay(), 1000);
    }
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.lastMessageTime) {
      this.timeEl.textContent = 'Never';
      return;
    }

    const seconds = Math.floor((new Date() - this.lastMessageTime) / 1000);

    if (seconds < 2) {
        this.timeEl.textContent = 'Just now';
    } else if (seconds < 60) {
      this.timeEl.textContent = `${seconds}s ago`;
    } else if (seconds < 3600) {
      this.timeEl.textContent = `${Math.floor(seconds / 60)}m ago`;
    } else {
      this.timeEl.textContent = `> ${Math.floor(seconds / 3600)}h ago`;
    }
  }
  
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
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
  }
}