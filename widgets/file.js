import BaseWidget from './base.js';

export default class FileWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.render();
  }

  render() {
    this.container.innerHTML = `<label style="display:block;margin-bottom:5px;">Send file to <strong>${this.topic}</strong></label><input type="file">`;
    this.fileInput = this.container.querySelector('input[type=file]');
    this.fileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => this.publish(this.topic, new Uint8Array(reader.result));
      reader.readAsArrayBuffer(f);
    });
  }

  getConfigForm() { return super.getBaseConfigForm(); }
  saveConfig() { super.saveBaseConfig(); this.render(); }
  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath }; }
  setOptions(o) { super.setOptions(o); this.render(); }
}