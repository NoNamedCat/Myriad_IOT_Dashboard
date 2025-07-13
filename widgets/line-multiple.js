import BaseWidget from './base.js';
import { decode } from './utils.js';

const randomColor = () => `hsl(${Math.random() * 360}, 70%, 60%)`;

const resolveColor = (colorVar) => {
    if (colorVar.startsWith('var(')) {
        return getComputedStyle(document.documentElement).getPropertyValue(colorVar.slice(4, -1)).trim();
    }
    return colorVar;
};

export default class LineWidget extends BaseWidget {
    constructor(id, container, publishFn, parentGrid) {
        super(id, container, publishFn, parentGrid);
        
        this.config = {
            series: [{
                topic: this.topic,
                jsonPath: '',
                label: 'Series 1',
                color: 'var(--primary-color)'
            }],
            gridColor: 'var(--border-color)',
            fontColor: 'var(--text-color)',
            backgroundColor: 'rgba(0,0,0,0)',
            tension: 0.2,
            maxDataPoints: 50,
        };
        
        // El widget ahora puede suscribirse a múltiples topics.
        this.topic = [this.config.series[0].topic];

        this.container.style.height = '100%';
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        
        this.createChart();
    }

    createChart() {
        if (this.chart) {
            this.chart.destroy();
        }
        
        const datasets = this.config.series.map(s => ({
            label: s.label,
            data: [],
            borderColor: resolveColor(s.color),
            backgroundColor: 'transparent',
            tension: this.config.tension,
            fill: false
        }));

        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: { 
                labels: [], 
                datasets: datasets 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        ticks: { 
                            maxRotation: 0, 
                            autoSkip: true, 
                            maxTicksLimit: 7,
                            color: resolveColor(this.config.fontColor),
                        },
                        grid: { color: resolveColor(this.config.gridColor) }
                    },
                    y: {
                        ticks: { color: resolveColor(this.config.fontColor) },
                        grid: { color: resolveColor(this.config.gridColor) }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: resolveColor(this.config.fontColor) }
                    }
                }
            }
        });
    }
  
    onMessage(payload, topic) {
        if (!this.chart) return;

        this.config.series.forEach((seriesConfig, index) => {
            if (seriesConfig.topic === topic) {
                const val = decode(payload, seriesConfig.jsonPath);
                if (val === null || val === undefined) return;

                const ts = new Date().toLocaleTimeString();
                
                this.chart.data.datasets[index].data.push(parseFloat(val) || 0);
                this.chart.data.labels.push(ts); // La etiqueta de tiempo es compartida.

                if (this.chart.data.labels.length > this.config.maxDataPoints) {
                    this.chart.data.labels.shift();
                    this.chart.data.datasets.forEach(d => d.data.shift());
                }
            }
        });
        
        this.chart.update('none');
    }

    onThemeChanged() {
        this.createChart();
    }
  
    destroy() { 
        if(this.chart) this.chart.destroy(); 
    }

    _createSeriesConfigRow(series = {}, index) {
        const s = {
            topic: series.topic || '',
            jsonPath: series.jsonPath || '',
            label: series.label || `Series ${index + 1}`,
            color: series.color || randomColor(),
        };
        
        return `
            <div class="series-config-row" style="border:1px solid var(--border-color); padding: 8px; margin-bottom: 10px; border-radius: 4px;">
                <label>Topic:</label>
                <input type="text" class="cfg-series-topic" value="${s.topic}">
                <label>JSON Path:</label>
                <input type="text" class="cfg-series-jsonPath" value="${s.jsonPath}" placeholder="(opcional)">
                <label>Label:</label>
                <input type="text" class="cfg-series-label" value="${s.label}">
                <label>Line Color:</label>
                <input type="color" class="cfg-series-color" value="${s.color}">
                <button type="button" onclick="this.parentElement.remove()" style="float: right; background-color: var(--danger-color); color: white;">Remove</button>
            </div>
        `;
    }

    getConfigForm() {
        let seriesHtml = this.config.series.map((s, i) => this._createSeriesConfigRow(s, i)).join('');
        
        return `
            <div id="series-config-container">
                ${seriesHtml}
            </div>
            <button type="button" id="add-series-btn">Add New Series</button>
            <hr>
            <h4>General Chart Settings</h4>
            <label>Grid & Font Color:</label>
            <input type="color" id="cfg_gridColor" value="${this.config.gridColor}">
            <label>Background Color:</label>
            <input type="color" id="cfg_backgroundColor" value="${this.config.backgroundColor}">
            <hr>
            <label>Line Tension:</label>
            <input type="number" id="cfg_tension" min="0" max="1" step="0.1" value="${this.config.tension}">
            <label>Max Data Points:</label>
            <input type="number" id="cfg_maxDataPoints" min="5" max="200" step="1" value="${this.config.maxDataPoints}">
        `;
    }
    
    onConfigFormRendered() {
        document.getElementById('add-series-btn').onclick = () => {
            const container = document.getElementById('series-config-container');
            const newIndex = container.children.length;
            container.insertAdjacentHTML('beforeend', this._createSeriesConfigRow({}, newIndex));
        };
    }

    saveConfig() {
        this.oldTopic = [...this.topic];
        
        this.config.backgroundColor = document.getElementById('cfg_backgroundColor').value;
        this.config.gridColor = document.getElementById('cfg_gridColor').value;
        this.config.fontColor = this.config.gridColor;
        this.config.tension = parseFloat(document.getElementById('cfg_tension').value);
        this.config.maxDataPoints = parseInt(document.getElementById('cfg_maxDataPoints').value, 10);
        
        this.config.series = [];
        document.querySelectorAll('.series-config-row').forEach(row => {
            this.config.series.push({
                topic: row.querySelector('.cfg-series-topic').value.trim(),
                jsonPath: row.querySelector('.cfg-series-jsonPath').value.trim(),
                label: row.querySelector('.cfg-series-label').value,
                color: row.querySelector('.cfg-series-color').value,
            });
        });
        
        this.topic = [...new Set(this.config.series.map(s => s.topic).filter(t => t))];
        this.createChart();
    }
  
    getOptions() { 
        return { 
            topic: this.topic, 
            jsonPath: this.jsonPath, 
            ...this.config 
        }; 
    }
  
    setOptions(o) { 
        this.config = { ...this.config, ...o };
        this.topic = [...new Set(this.config.series.map(s => s.topic).filter(t => t))];
        this.createChart();
    }
}
