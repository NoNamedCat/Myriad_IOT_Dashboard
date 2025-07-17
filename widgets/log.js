import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class LogWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = { max_lines: 50 };
    this.render();
  }

  render() {
    this.container.innerHTML = `<pre style="width:100%;height:100%;margin:0;overflow-y:auto;font-family:monospace;font-size:12px;white-space:pre-wrap;"></pre>`;
    this.logArea = this.container.firstElementChild;
  }

  // MÉTODO NUEVO para cargar el historial
  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;

    const logs = this.logger.getLogs();
    if (!logs || logs.length === 0) return;

    logs.forEach(log => {
      // Usamos el timestamp guardado en el log
      this._addLogLine(log.payload, new Date(log.ts));
    });
  }

  // Lógica de añadir una línea, extraída para reutilizar
  _addLogLine(value, timestamp) {
    const timeString = timestamp.toLocaleTimeString();
    const newLogEntry = document.createElement('div');
    newLogEntry.innerHTML = `<strong>[${timeString}]</strong> ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`;
    
    this.logArea.appendChild(newLogEntry);

    while (this.logArea.children.length > this.config.max_lines) {
      this.logArea.removeChild(this.logArea.firstChild);
    }

    this.logArea.scrollTop = this.logArea.scrollHeight;
  }

  onMessage(payload) {
    super.onMessage(payload); // Guarda el log a través de la clase base
    const val = decode(payload, this.jsonPath);
    this._addLogLine(val, new Date()); // Añade el nuevo mensaje a la vista
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Maximum lines to show:</label>
      <input id="cfg_max_lines" type="number" value="${this.config.max_lines}">`;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.max_lines = parseInt(document.getElementById('cfg_max_lines').value, 10) || 50;
  }

  getOptions() { 
      return { topic: this.topic, jsonPath: this.jsonPath, ...this.config }; 
  }

  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o };
      this.render(); 
      this.loadFromLogger(); // Cargar historial después de configurar
  }
}