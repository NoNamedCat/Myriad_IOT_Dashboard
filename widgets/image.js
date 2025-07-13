import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class ImageWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `<img style="width:100%; height:100%; object-fit:contain;" alt="Waiting for image on topic: ${this.topic}">`;
    this.imgEl = this.container.firstElementChild;
  }

  onMessage(payload) {
    const val = String(decode(payload, this.jsonPath));
    if (val.startsWith('http') || val.startsWith('data:image')) {
      this.imgEl.src = val;
    } else {
      this.imgEl.src = `data:image/jpeg;base64,${val}`;
    }
  }
  
  getConfigForm() { return super.getBaseConfigForm(); }
  saveConfig() { super.saveBaseConfig(); this.render(); }
  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath }; }
  setOptions(o) { super.setOptions(o); this.render(); }
}