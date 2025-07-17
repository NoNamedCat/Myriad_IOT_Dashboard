import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class SvgWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        sizing: 'contain',
        backgroundColor: 'rgba(255, 255, 255, 0)',
    };
    this.render();
  }

  render() {
    this.container.innerHTML = `<div class="svg-container" style="width:100%; height:100%;"></div>`;
    this.svgContainer = this.container.firstElementChild;
    this.applyStyles();
  }

  applyStyles() {
    this.svgContainer.style.backgroundColor = this.config.backgroundColor || 'transparent';
  }

  _renderSvg(svgString) {
    if (!svgString) {
        this.svgContainer.innerHTML = '';
        return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.querySelector('svg');

    if (!svgElement || doc.querySelector('parsererror')) {
        this.svgContainer.textContent = 'Invalid SVG data received';
        return;
    }
    if (this.config.sizing !== 'natural') {
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        let preserveAspectRatio = 'xMidYMid meet';
        if (this.config.sizing === 'cover') preserveAspectRatio = 'xMidYMid slice';
        else if (this.config.sizing === 'fill') preserveAspectRatio = 'none';
        svgElement.setAttribute('preserveAspectRatio', preserveAspectRatio);
    } else {
        svgElement.style.width = '';
        svgElement.style.height = '';
        svgElement.removeAttribute('preserveAspectRatio');
    }
    this.svgContainer.innerHTML = '';
    this.svgContainer.appendChild(svgElement);
  }

  onMessage(payload) {
    super.onMessage(payload);
    const svgString = String(decode(payload, this.jsonPath));
    this._renderSvg(svgString);
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        const lastSvg = logs[logs.length-1].payload;
        this._renderSvg(lastSvg);
    }
  }
  
  getConfigForm() {
    return super.getBaseConfigForm() + `
      <hr>
      <label for="cfg_sizing">Sizing Mode:</label>
      <select id="cfg_sizing">
          <option value="contain" ${this.config.sizing === 'contain' ? 'selected' : ''}>Contain</option>
          <option value="cover" ${this.config.sizing === 'cover' ? 'selected' : ''}>Cover</option>
          <option value="fill" ${this.config.sizing === 'fill' ? 'selected' : ''}>Fill</option>
          <option value="natural" ${this.config.sizing === 'natural' ? 'selected' : ''}>Natural</option>
      </select>
      <br><br>
      <label for="cfg_backgroundColor">Background Color:</label>
      <input type="color" id="cfg_backgroundColor" value="${this.config.backgroundColor}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.sizing = document.getElementById('cfg_sizing').value;
    this.config.backgroundColor = document.getElementById('cfg_backgroundColor').value;
    this.applyStyles();
  }

  getOptions() {
    return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath, ...this.config };
  }

  setOptions(o) {
    super.setOptions(o);
    this.config = { ...this.config, ...o };
    this.applyStyles();
    this.loadFromLogger();
  }
}