import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

// --- FUNCIONES AUXILIARES ---
const randomColor = () => `hsl(${Math.random() * 360}, 70%, 60%)`;
const resolveColor = (colorVar) => {
    if (!colorVar) return '#000000';
    try {
        // Asegura que el DOM está listo antes de intentar acceder a los estilos computados
        if (document.readyState !== 'complete') return colorVar; 
        return colorVar.startsWith('var(') ? getComputedStyle(document.documentElement).getPropertyValue(colorVar.slice(4, -1)).trim() : colorVar;
    } catch (e) {
        console.error("Error resolving color:", colorVar, e);
        return '#000000'; // Devuelve un color por defecto en caso de error
    }
};

// --- WIDGET DE GRÁFICA DE LÍNEA (VERSIÓN CORREGIDA) ---
export default class LineWidget extends BaseWidget {
    constructor(id, container, publishFn, parentGrid) {
        super(id, container, publishFn, parentGrid);
        
        // La configuración por defecto se hereda de BaseWidget
        this.config = {
            ...this.config,
            series: [{ topic: 'no/topic/defined', jsonPath: '', label: 'Series 1', color: 'var(--primary-color)' }],
            xAxisType: 'time',
            tension: 0.2,
            maxDataPoints: 100,
            title: ''
        };
        
        // Prepara el canvas, pero NO crea el gráfico todavía
        this.container.style.height = '100%';
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.chart = null; // El gráfico se inicializará en setOptions
    }

    // `setOptions` es llamado por el dashboard después del constructor con la config guardada
    setOptions(o) { 
        super.setOptions(o); // Esto es crucial: configura el logger si está habilitado
        this.config = { ...this.config, ...o };
        this.topic = [...new Set(this.config.series.map(s => s.topic).filter(Boolean))];
        
        // Ahora que la configuración está completa (incluido el logger), creamos el gráfico
        this.createChart();
    }

    createChart() {
        if (this.chart) {
            this.chart.destroy();
        }

        const datasets = this.config.series.map(s => ({
            label: s.label,
            data: [], // Los datos se cargarán desde el logger
            borderColor: resolveColor(s.color),
            tension: this.config.tension,
            fill: false,
            parsing: false 
        }));

        const isCategory = this.config.xAxisType === 'category';
        
        let xAxisConfig = {
            type: this.config.xAxisType, 
            ticks: { color: resolveColor('var(--text-color)'), maxRotation: 0, autoSkip: true, source: 'auto' },
            grid: { color: resolveColor('var(--border-color)') }
        };

        if (this.config.xAxisType === 'time') {
            if (window.dateFns && window.dateFns.locale && window.dateFns.locale.es) {
                 xAxisConfig.adapters = { date: { locale: window.dateFns.locale.es } };
            }
            xAxisConfig.time = {
                unit: 'second',
                tooltipFormat: 'HH:mm:ss',
                displayFormats: { second: 'HH:mm:ss' }
            };
        }

        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: {
                labels: isCategory ? [] : undefined,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: { 
                    x: xAxisConfig, 
                    y: { 
                        ticks: { color: resolveColor('var(--text-color)') }, 
                        grid: { color: resolveColor('var(--border-color)') }
                    }
                },
                plugins: {
                    title: { display: !!this.config.title, text: this.config.title, color: resolveColor('var(--text-color)') },
                    legend: { labels: { color: resolveColor('var(--text-color)') }},
                    zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }},
                    decimation: { enabled: true, algorithm: 'lttb', samples: 50 }
                }
            }
        });
        
        // Carga los datos históricos AHORA, con todo ya configurado
        this.loadFromLogger();
    }

    loadFromLogger() {
        if (!this.config.loggingEnabled || !this.logger) {
            return;
        }

        const logs = this.logger.getLogs();
        if (!logs || logs.length === 0) {
            return;
        }
        
        const isCategory = this.config.xAxisType === 'category';
        const dataset = this.chart.data.datasets[0]; 
        
        if (!dataset) return;
        
        logs.forEach(log => {
            const val = log.payload;
            if (val === null || val === undefined) return;

            if (isCategory) {
                dataset.data.push(parseFloat(val) || 0);
                this.chart.data.labels.push(new Date(log.ts).toLocaleTimeString());
            } else {
                const newDataPoint = { x: log.ts, y: parseFloat(val) };
                 if (!isNaN(newDataPoint.x) && !isNaN(newDataPoint.y)) {
                    dataset.data.push(newDataPoint);
                }
            }
        });

        this.enforceDataLimit();
        this.chart.update('none');
    }

    enforceDataLimit() {
        if (this.config.xAxisType === 'category') {
            const labels = this.chart.data.labels;
            while (labels.length > this.config.maxDataPoints) {
                labels.shift();
                this.chart.data.datasets.forEach(d => d.data.shift());
            }
        } else {
             this.chart.data.datasets.forEach(d => {
                if(d.data.length > 0) {
                    d.data.sort((a, b) => a.x - b.x);
                    while (d.data.length > this.config.maxDataPoints) {
                        d.data.shift();
                    }
                }
            });
        }
    }
  
    onMessage(payload, topic) {
        super.onMessage(payload, topic);
        if (!this.chart) return;
        const isCategory = this.config.xAxisType === 'category';

        this.config.series.forEach((seriesConfig, index) => {
            if (seriesConfig.topic === topic) {
                const val = decode(payload, seriesConfig.jsonPath);
                if (val === null || val === undefined) return;
                const dataset = this.chart.data.datasets[index];
                
                if (isCategory) {
                    dataset.data.push(parseFloat(val) || 0);
                    this.chart.data.labels.push(new Date().toLocaleTimeString());
                } else {
                    const newDataPoint = (typeof val === 'object' && val !== null && 'x' in val && 'y' in val)
                        ? { x: parseFloat(val.x), y: parseFloat(val.y) }
                        : { x: Date.now(), y: parseFloat(val) };
                    if (!isNaN(newDataPoint.x) && !isNaN(newDataPoint.y)) {
                        dataset.data.push(newDataPoint);
                    }
                }
            }
        });
        this.enforceDataLimit();
        this.chart.update('none');
    }

    onThemeChanged() { 
        if (this.chart) this.createChart(); 
    }
  
    destroy() { 
        if (this.chart) this.chart.destroy(); 
    }

    _createSeriesConfigRow(series = {}, index) {
        const s = { topic: series.topic || '', jsonPath: series.jsonPath || '', label: series.label || `Series ${index + 1}`, color: series.color || randomColor() };
        return `<div class="series-config-row" style="border:1px solid var(--border-color); padding: 8px; margin-bottom: 10px; border-radius: 4px;"><label>Topic:</label><input type="text" class="cfg-series-topic" value="${s.topic}"><label>JSON Path:</label><input type="text" class="cfg-series-jsonPath" value="${s.jsonPath}" placeholder="(opcional)"><label>Label:</label><input type="text" class="cfg-series-label" value="${s.label}"><label>Line Color:</label><input type="color" class="cfg-series-color" value="${s.color}"><button type="button" onclick="this.parentElement.remove()" style="float: right; background-color: var(--danger-color); color: white;">Remove</button></div>`;
    }

    getConfigForm() {
        let seriesHtml = this.config.series.map((s, i) => this._createSeriesConfigRow(s, i)).join('');
        return super.getBaseConfigForm() + `
            <label>Title:</label>
            <input id="cfg_title" type="text" value="${this.config.title || ''}">
            <hr>
            <h4>Series Configuration</h4>
            <div id="series-config-container" style="max-height: 250px; overflow-y: auto; margin-bottom: 10px; padding: 5px; border: 1px dashed var(--border-color);">${seriesHtml}</div>
            <button type="button" id="add-series-btn">Add New Series</button>
            <hr>
            <h4>General Chart Settings</h4>
            <label for="cfg_xAxisType">X-Axis Type:</label>
            <select id="cfg_xAxisType">
                <option value="category" ${this.config.xAxisType === 'category' ? 'selected' : ''}>Category (Evenly Spaced)</option>
                <option value="linear" ${this.config.xAxisType === 'linear' ? 'selected' : ''}>Linear (X, Y pairs)</option>
                <option value="time" ${this.config.xAxisType === 'time' ? 'selected' : ''}>Time (Time-based)</option>
                <option value="logarithmic" ${this.config.xAxisType === 'logarithmic' ? 'selected' : ''}>Logarithmic</option>
            </select>
            <hr>
            <label>Line Tension:</label><input type="number" id="cfg_tension" min="0" max="1" step="0.1" value="${this.config.tension}">
            <label>Max Data Points:</label><input type="number" id="cfg_maxDataPoints" min="5" max="1000" step="1" value="${this.config.maxDataPoints}">
        `;
    }
    
    onConfigFormRendered() {
        document.getElementById('add-series-btn').onclick = () => {
            const container = document.getElementById('series-config-container');
            container.insertAdjacentHTML('beforeend', this._createSeriesConfigRow({}, container.children.length));
        };
        super.onConfigFormRendered();
    }

    saveConfig() {
        super.saveBaseConfig();
        this.config.title = document.getElementById('cfg_title').value;
        this.config.tension = parseFloat(document.getElementById('cfg_tension').value);
        this.config.maxDataPoints = parseInt(document.getElementById('cfg_maxDataPoints').value, 10);
        this.config.xAxisType = document.getElementById('cfg_xAxisType').value;
        this.oldTopic = [...this.topic];
        const newSeries = [];
        document.querySelectorAll('.series-config-row').forEach(row => {
            newSeries.push({
                topic: row.querySelector('.cfg-series-topic').value.trim(),
                jsonPath: row.querySelector('.cfg-series-jsonPath').value.trim(),
                label: row.querySelector('.cfg-series-label').value,
                color: row.querySelector('.cfg-series-color').value,
            });
        });
        this.config.series = newSeries;
        this.topic = [...new Set(this.config.series.map(s => s.topic).filter(Boolean))];
        this.createChart();
    }
  
    getOptions() { 
        return { ...this.config }; 
    }
}