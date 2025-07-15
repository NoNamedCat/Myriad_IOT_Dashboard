import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class ConsoleWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
      placeholder: 'Type a command...',
      max_lines: 100,
      echoEnabled: true, // Opción de eco activada por defecto
    };
    this.publishTopic = this.topic;
    this.render();
  }

  render() {
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.height = '100%';

    this.container.innerHTML = `
      <pre id="${this.id}_log" style="flex-grow:1; margin:0; overflow-y:auto; font-family:monospace; font-size:12px; white-space:pre-wrap; border-bottom: 1px solid var(--border-color);"></pre>
      <div id="${this.id}_input_area" style="display:flex; padding-top:8px;">
        <input type="text" id="${this.id}_input" style="flex-grow:1; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--bg-color); color: var(--text-color);" placeholder="${this.config.placeholder}">
        <button id="${this.id}_send_btn" style="margin-left:8px; background-color:var(--primary-color); color:var(--primary-text-color); border:none; border-radius:4px; padding: 0 10px;">Send</button>
      </div>
    `;

    this.logArea = this.container.querySelector(`#${this.id}_log`);
    this.inputBox = this.container.querySelector(`#${this.id}_input`);
    this.sendButton = this.container.querySelector(`#${this.id}_send_btn`);

    this.sendButton.addEventListener('click', () => this.sendCommand());
    this.inputBox.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.sendCommand();
    });
  }

  // --- LÓGICA DE ENVÍO ACTUALIZADA ---
  sendCommand() {
    const command = this.inputBox.value.trim();
    if (command) {
      this.publish(this.publishTopic, command);

      // Solo muestra el eco si está activado o si los topics son diferentes
      if (this.config.echoEnabled || this.publishTopic !== this.topic) {
        this.addLogEntry(`> ${command}`, 'sent');
      }
      
      this.inputBox.value = '';
    }
  }

  onMessage(payload) {
    const val = decode(payload, this.jsonPath);
    this.addLogEntry(val, 'received');
  }

  addLogEntry(value, type = 'received') {
    const timestamp = new Date().toLocaleTimeString();
    const newLogEntry = document.createElement('div');
    
    if (type === 'sent') {
      newLogEntry.style.color = 'var(--primary-color)';
      newLogEntry.innerHTML = `<strong>[${timestamp}]</strong> ${String(value)}`;
    } else {
      newLogEntry.innerHTML = `<strong>[${timestamp}]</strong> ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`;
    }
    
    this.logArea.appendChild(newLogEntry);

    while (this.logArea.children.length > this.config.max_lines) {
      this.logArea.removeChild(this.logArea.firstChild);
    }
    this.logArea.scrollTop = this.logArea.scrollHeight;
  }

  // --- FORMULARIO DE CONFIGURACIÓN ACTUALIZADO ---
  getConfigForm() {
    return `
      <label>Subscription Topic (Incoming):</label>
      <input id="cfg_topic" type="text" value="${this.topic}">
      <label>Publish Topic (Outgoing):</label>
      <input id="cfg_publishTopic" type="text" value="${this.publishTopic}">
      <hr>
      <label>
        <input type="checkbox" id="cfg_echoEnabled" ${this.config.echoEnabled ? 'checked' : ''}>
        Enable Echo (show sent messages)
      </label>
      <small>If disabled, sent messages will only be hidden if Subscription and Publish topics are the same.</small>
      <hr>
      <label>Placeholder Text:</label>
      <input id="cfg_placeholder" type="text" value="${this.config.placeholder}">
      <label>Max Lines:</label>
      <input id="cfg_max_lines" type="number" value="${this.config.max_lines}">
    `;
  }

  saveConfig() {
    // No se llama a super.saveBaseConfig() para manejar los dos topics por separado
    this.oldTopic = this.topic;
    this.topic = document.getElementById('cfg_topic').value.trim();
    this.publishTopic = document.getElementById('cfg_publishTopic').value.trim();
    this.config.placeholder = document.getElementById('cfg_placeholder').value;
    this.config.max_lines = parseInt(document.getElementById('cfg_max_lines').value, 10) || 100;
    this.config.echoEnabled = document.getElementById('cfg_echoEnabled').checked;
    this.render();
  }

  getOptions() {
      return { 
          topic: this.topic, 
          jsonPath: this.jsonPath, 
          publishTopic: this.publishTopic, 
          ...this.config 
      };
  }

  setOptions(o) {
      super.setOptions(o);
      this.publishTopic = o.publishTopic !== undefined ? o.publishTopic : this.topic;
      this.config = { ...this.config, ...o };
      this.render();
  }
}
