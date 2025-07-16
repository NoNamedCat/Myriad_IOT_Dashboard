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
            xAxisType: 'category',
            gridColor: 'var(--border-color)',
            fontColor: 'var(--text-color)',
            backgroundColor: 'rgba(0,0,0,0)',
            tension: 0.2,
            maxDataPoints: 100,
        };
        
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

        let xAxisConfig;
        const chartData = { datasets };

        switch(this.config.xAxisType) {
            case 'timeseries':
                xAxisConfig = {
                    type: 'timeseries',
                    time: {
                        unit: 'second',
                        tooltipFormat: 'HH:mm:ss',
                        displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm', hour: 'HH:mm' }
                    },
                    ticks: { maxRotation: 0, autoSkip: true, color: resolveColor(this.config.fontColor) },
                    grid: { color: resolveColor(this.config.gridColor) }
                };
                // CORRECCIÓN CLAVE: No se debe definir 'labels' para ejes de tiempo.
                break;
            case 'linear':
                xAxisConfig = {
                    type: 'linear',
                    ticks: { color: resolveColor(this.config.fontColor) },
                    grid: { color: resolveColor(this.config.gridColor) }
                };
                break;
            case 'category':
            default:
                 xAxisConfig = {
                    type: 'category',
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10, color: resolveColor(this.config.fontColor) },
                    grid: { color: resolveColor(this.config.gridColor) }
                };
                // CORRECCIÓN CLAVE: 'labels' solo se define para el tipo 'category'.
                chartData.labels = []; 
                break;
        }

        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: xAxisConfig,
                    y: {
                        ticks: { color: resolveColor(this.config.fontColor) },
                        grid: { color: resolveColor(this.config.gridColor) }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: resolveColor(this.config.fontColor) }
                    },
                    zoom: {
                        pan: { enabled: true, mode: 'xy' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
                    },
                    decimation: {
                        enabled: true,
                        algorithm: 'lttb',
                        samples: 50,
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

                const dataset = this.chart.data.datasets[index];
                
                if (this.config.xAxisType === 'category') {
                    dataset.data.push(parseFloat(val) || 0);
                    this.chart.data.labels.push(new Date().toLocaleTimeString());
                    
                    if (this.chart.data.labels.length > this.config.maxDataPoints) {
                        this.chart.data.labels.shift();
                        dataset.data.shift();
                    }
                } else {
                    let newDataPoint;
                    if (typeof val === 'object' && val !== null && 'x' in val && 'y' in val) {
                        newDataPoint = {
                            x: this.config.xAxisType === 'timeseries' ? val.x : parseFloat(val.x) || 0,
                            y: parseFloat(val.y) || 0
                        };
                    } else {
                        newDataPoint = {
                            x: Date.now(),
                            y: parseFloat(val) || 0
                        };
                    }
                    
                    if (this.config.xAxisType === 'linear' && (typeof val !== 'object' || !('x' in val))) return;

                    dataset.data.push(newDataPoint);
                    
                    if (dataset.data.length > this.config.maxDataPoints) {
                        dataset.data.shift();
                    }
                }
            }
        });
        
        if (this.config.xAxisType !== 'category') {
            this.chart.data.datasets.forEach(d => {
                d.data.sort((a, b) => a.x - b.x);
            });
        }
        
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
            <div id="series-config-container" style="max-height: 250px; overflow-y: auto; margin-bottom: 10px; padding: 5px; border: 1px dashed var(--border-color);">
                ${seriesHtml}
            </div>
            <button type="button" id="add-series-btn">Add New Series</button>
            <hr>
            <h4>General Chart Settings</h4>
            <label for="cfg_xAxisType">X-Axis Type:</label>
            <select id="cfg_xAxisType">
                <option value="category" ${this.config.xAxisType === 'category' ? 'selected' : ''}>Category (Evenly Spaced)</option>
                <option value="timeseries" ${this.config.xAxisType === 'timeseries' ? 'selected' : ''}>Time Series (Time-based)</option>
                <option value="linear" ${this.config.xAxisType === 'linear' ? 'selected' : ''}>Linear (X, Y pairs)</option>
            </select>
            <small><b>Time Series</b> usa el tiempo real. <b>Linear</b> requiere datos {x,y}.</small>
            <hr>
            <label>Grid & Font Color:</label>
            <input type="color" id="cfg_gridColor" value="${this.config.gridColor}">
            <label>Line Tension:</label>
            <input type="number" id="cfg_tension" min="0" max="1" step="0.1" value="${this.config.tension}">
            <label>Max Data Points:</label>
            <input type="number" id="cfg_maxDataPoints" min="5" max="1000" step="1" value="${this.config.maxDataPoints}">
        `;
    }
    
    onConfigFormRendered() {
        document.getElementById('add-series-btn').onclick = () => {
            const container = document.getElementById('series-config-container');
            container.insertAdjacentHTML('beforeend', this._createSeriesConfigRow({}, container.children.length));
        };
    }

    saveConfig() {
        this.oldTopic = [...this.topic];
        
        this.config.gridColor = document.getElementById('cfg_gridColor').value;
        this.config.fontColor = this.config.gridColor;
        this.config.tension = parseFloat(document.getElementById('cfg_tension').value);
        this.config.maxDataPoints = parseInt(document.getElementById('cfg_maxDataPoints').value, 10);
        this.config.xAxisType = document.getElementById('cfg_xAxisType').value;
        
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
            ...super.getOptions(),
            ...this.config 
        }; 
    }
  
    setOptions(o) { 
        this.config = { ...this.config, ...o };
        this.topic = [...new Set(this.config.series.map(s => s.topic).filter(t => t))];
        this.createChart();
    }
}
