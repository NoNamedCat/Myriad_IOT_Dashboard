import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class LineWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.container.style.height = 'calc(100% - 30px)';
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    
    this.chart = new Chart(this.canvas, {
      type: 'line',
      data: { 
        labels: [], 
        datasets: [{ label: this.topic, data: [], borderColor: 'var(--primary-color)', tension: 0.2, fill: false }] 
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } }
        }
      }
    });
  }

  onMessage(payload) {
    const val = decode(payload, this.jsonPath);
    const ts = new Date().toLocaleTimeString();
    
    this.chart.data.labels.push(ts);
    this.chart.data.datasets[0].data.push(val == null ? 0 : parseFloat(val));
    
    if (this.chart.data.labels.length > 50) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
    }
    this.chart.update('none');
  }

  destroy() { 
    this.chart.destroy(); 
  }

  getConfigForm() { return super.getBaseConfigForm(); }
  saveConfig() {
    super.saveBaseConfig();
    if (this.chart.data.datasets[0].label !== this.topic) {
        this.chart.data.datasets[0].label = this.topic;
        this.chart.update('none');
    }
  }
  getOptions() { return { topic: this.topic, jsonPath: this.jsonPath }; }
  setOptions(o) { 
      super.setOptions(o);
      if (this.chart && this.chart.data.datasets[0].label !== this.topic) {
          this.chart.data.datasets[0].label = this.topic;
      }
  }
}