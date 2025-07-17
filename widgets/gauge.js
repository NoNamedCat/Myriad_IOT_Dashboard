import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class GaugeWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        color: 'var(--primary-color)',
        bgColor: 'var(--secondary-color)'
    };
    this.chart = null;
    this.render();
  }
  
  render() {
      this.container.innerHTML = `<canvas></canvas>`;
      this.canvas = this.container.firstElementChild;
  }
  
  createChart() {
    if (this.chart) this.chart.destroy();

    const computedStyle = getComputedStyle(document.documentElement);
    const resolvedColor = this.config.color.startsWith('var(') ? computedStyle.getPropertyValue(this.config.color.slice(4, -1)) : this.config.color;
    const resolvedBgColor = this.config.bgColor.startsWith('var(') ? computedStyle.getPropertyValue(this.config.bgColor.slice(4, -1)) : this.config.bgColor;

    this.chart = new Chart(this.canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [0, 100],
          backgroundColor: [resolvedColor, resolvedBgColor],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { tooltip: { enabled: false } },
        animation: false
      }
    });
  }

  _updateGauge(value) {
    if (!this.chart) return;
    const num = Math.min(Math.max(parseFloat(value) || 0, 0), 100);
    this.chart.data.datasets[0].data = [num, 100 - num];
    this.chart.update('none');
  }

  onMessage(payload) {
    super.onMessage(payload); // <-- AÑADIDO
    const val = decode(payload, this.jsonPath);
    this._updateGauge(val);
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        const lastLog = logs[logs.length - 1];
        this._updateGauge(lastLog.payload);
    }
  }

  onThemeChanged() {
      this.createChart();
      this.loadFromLogger();
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Gauge Color:</label>
      <input type="color" id="cfg_color" value="${this.config.color}">
      <label>Background Color:</label>
      <input type="color" id="cfg_bgColor" value="${this.config.bgColor}">
      <small>Note: To use the theme color, leave the default value.</small>
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.color = document.getElementById('cfg_color').value;
    this.config.bgColor = document.getElementById('cfg_bgColor').value;
    this.createChart();
    this.loadFromLogger();
  }

  getOptions() { 
      return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath, ...this.config }; 
  }
  
  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o };
      this.createChart();
      this.loadFromLogger();
  }
  
  destroy() { if (this.chart) this.chart.destroy(); }
}