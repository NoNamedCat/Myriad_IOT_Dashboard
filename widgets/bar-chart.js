import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

const resolveColor = (colorVar) => {
    if (!colorVar) return '#000000';
    try {
        if (document.readyState !== 'complete') return colorVar; 
        return colorVar.startsWith('var(') ? getComputedStyle(document.documentElement).getPropertyValue(colorVar.slice(4, -1)).trim() : colorVar;
    } catch (e) {
        console.error("Error resolving color:", colorVar, e);
        return '#000000';
    }
};

export default class BarChartWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        labels: 'Label 1,Label 2,Label 3',
        datasetLabel: 'Values',
        title: '',
        backgroundColor: 'var(--primary-color)'
    };
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.chart = null;
  }

  setOptions(o) {
      super.setOptions(o);
      this.config = { ...this.config, ...o };
      this.createChart();
  }

  createChart() {
    if (this.chart) this.chart.destroy();

    const labels = this.config.labels.split(',');
    const initialData = new Array(labels.length).fill(0);

    this.chart = new Chart(this.canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: this.config.datasetLabel,
          data: initialData,
          backgroundColor: resolveColor(this.config.backgroundColor),
          borderColor: resolveColor(this.config.backgroundColor),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          title: { display: !!this.config.title, text: this.config.title, color: resolveColor('var(--text-color)') }
        },
        scales: {
          y: { 
              beginAtZero: true,
              ticks: { color: resolveColor('var(--text-color)') },
              grid: { color: resolveColor('var(--border-color)') }
          },
          x: {
              ticks: { color: resolveColor('var(--text-color)') },
              grid: { display: false }
          }
        }
      }
    });
    this.loadFromLogger();
  }

  onMessage(payload) {
    super.onMessage(payload);
    const data = decode(payload, this.jsonPath);
    if (!this.chart || typeof data !== 'object' || data === null) return;
    
    const labels = this.chart.data.labels;
    let dataUpdated = false;

    Object.keys(data).forEach(key => {
        const index = labels.indexOf(key);
        if (index !== -1) {
            const value = parseFloat(data[key]);
            if (!isNaN(value)) {
                this.chart.data.datasets[0].data[index] = value;
                dataUpdated = true;
            }
        }
    });

    if(dataUpdated) {
        this.chart.update('none');
    }
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger || !this.chart) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        try {
            const lastData = JSON.parse(logs[logs.length-1].payload);
            const labels = this.chart.data.labels;
            Object.keys(lastData).forEach(key => {
                const index = labels.indexOf(key);
                if (index !== -1) {
                    this.chart.data.datasets[0].data[index] = parseFloat(lastData[key]) || 0;
                }
            });
            this.chart.update('none');
        } catch(e) {
            console.error("Could not parse bar chart data from log", e);
        }
    }
  }
  
  onThemeChanged() {
      if(this.chart) this.createChart();
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <hr>
      <h4>Chart Settings</h4>
      <label>Title:</label> <input id="cfg_title" type="text" value="${this.config.title}">
      <label>Dataset Label:</label> <input id="cfg_datasetLabel" type="text" value="${this.config.datasetLabel}">
      <label>Categories (comma-separated):</label> <input id="cfg_labels" type="text" value="${this.config.labels}">
      <small>Expects a JSON object with keys matching these categories.</small><br>
      <label>Bar Color:</label> <input id="cfg_backgroundColor" type="color" value="${this.config.backgroundColor}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.title = document.getElementById('cfg_title').value;
    this.config.datasetLabel = document.getElementById('cfg_datasetLabel').value;
    this.config.labels = document.getElementById('cfg_labels').value;
    this.config.backgroundColor = document.getElementById('cfg_backgroundColor').value;
    this.createChart();
  }

  getOptions() { return { ...super.getOptions(), ...this.config }; }

  destroy() { if (this.chart) this.chart.destroy(); }
}