import BaseWidget from './base.js';
import { decode } from './utils.js';

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
      this.createChart();
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

  onMessage(payload) {
    if (!this.chart) return;
    const val = decode(payload, this.jsonPath);
    const num = Math.min(Math.max(parseFloat(val) || 0, 0), 100);
    this.chart.data.datasets[0].data = [num, 100 - num];
    this.chart.update('none');
  }

  onThemeChanged() {
      this.createChart();
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
  }

  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath, ...this.config }; }
  
  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o };
  }
  
  destroy() { if (this.chart) this.chart.destroy(); }
}