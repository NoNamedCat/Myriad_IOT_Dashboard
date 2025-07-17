import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

export default class DataTableWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        columns: '',
        title: ''
    };
    this.data = [];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display:flex; flex-direction: column; height: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 5px;">
              <h5 id="${this.id}_title" style="margin: 0; font-size: 1rem;"></h5>
              <button id="${this.id}_export_btn" style="padding: 2px 8px; font-size: 11px; background-color: var(--primary-color); color: var(--primary-text-color); border:none; border-radius:4px;">Export CSV</button>
          </div>
          <div style="flex-grow: 1; overflow-y: auto;">
              <table id="${this.id}_table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <thead></thead>
                  <tbody></tbody>
              </table>
          </div>
      </div>
    `;
    this.table = this.container.querySelector(`#${this.id}_table`);
    this.titleEl = this.container.querySelector(`#${this.id}_title`);
    this.exportBtn = this.container.querySelector(`#${this.id}_export_btn`);
    
    this.titleEl.textContent = this.config.title;
    this.exportBtn.onclick = () => this.exportToCsv();
    this.updateTable();
  }
  
  updateTable() {
    const headers = this.config.columns.split(',').map(h => h.trim()).filter(Boolean);
    if(headers.length === 0 && this.data.length > 0) {
        // Auto-detect headers from first data object if not specified
        Object.keys(this.data[0]).forEach(h => headers.push(h));
    }

    const thead = this.table.querySelector('thead');
    thead.innerHTML = `<tr>${headers.map(h => `<th style="text-align:left; padding:4px; border-bottom: 1px solid var(--border-color);">${h}</th>`).join('')}</tr>`;
    
    const tbody = this.table.querySelector('tbody');
    tbody.innerHTML = '';
    this.data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = headers.map(h => `<td style="padding: 4px; border-bottom: 1px solid var(--border-color);">${row[h] || ''}</td>`).join('');
        tbody.appendChild(tr);
    });
  }
  
  onMessage(payload) {
    super.onMessage(payload);
    const newData = decode(payload, this.jsonPath);
    if(Array.isArray(newData)) {
        this.data = newData;
    } else if (typeof newData === 'object' && newData !== null) {
        this.data.push(newData);
        if(this.data.length > 500) this.data.shift(); // Limit history
    }
    this.updateTable();
  }

  loadFromLogger() {
      if (!this.config.loggingEnabled || !this.logger) return;
      const logs = this.logger.getLogs();
      if(logs.length > 0) {
          const loadedData = [];
          logs.forEach(log => {
              try {
                  const item = JSON.parse(log.payload);
                  if (Array.isArray(item)) {
                      loadedData.push(...item);
                  } else {
                      loadedData.push(item);
                  }
              } catch(e) {}
          });
          this.data = loadedData;
          this.updateTable();
      }
  }
  
  exportToCsv() {
      const headers = this.config.columns.split(',').map(h => h.trim()).filter(Boolean);
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += headers.join(",") + "\r\n";

      this.data.forEach(row => {
          let csvRow = headers.map(h => {
              let val = row[h] === undefined ? '' : String(row[h]);
              return `"${val.replace(/"/g, '""')}"`;
          }).join(",");
          csvContent += csvRow + "\r\n";
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${this.config.title || 'table_export'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <hr>
      <h4>Table Settings</h4>
      <label>Title:</label> <input id="cfg_title" type="text" value="${this.config.title}">
      <label>Columns (comma-separated, optional):</label>
      <input id="cfg_columns" type="text" value="${this.config.columns}">
      <small>If empty, columns are auto-detected. Expected payload is a JSON object or array of objects.</small>
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.title = document.getElementById('cfg_title').value;
    this.config.columns = document.getElementById('cfg_columns').value;
    this.render();
    this.loadFromLogger();
  }

  getOptions() { return { ...super.getOptions(), ...this.config }; }
  
  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o };
      this.render();
      this.loadFromLogger();
  }
}