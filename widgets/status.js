import BaseWidget from './base.js';
import { decode } from './utils.js';

/**
 * A default SVG icon to display when no state matches or for a new state.
 * It's a simple question mark circle.
 */
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:100%; height:100%;">
  <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-1.212-2.433-1.88-4.12-1.88-2.495 0-4.522 2.022-4.522 4.502 0 .399.052.788.146 1.158.122.484.512.93.978 1.258.462.324.993.535 1.559.638.43.074.858.14.992.493l.013.041c.084.26.168.518.253.771.042.126.11.246.195.357.085.112.183.214.29.303.11.09.227.17.353.236.23.12.486.208.752.261.262.05.534.074.81.074.262 0 .518-.02.77-.064.247-.044.48-.113.702-.2a4.52 4.52 0 002.898-4.226c0-2.476-2.01-4.492-4.491-4.492z" clip-rule="evenodd" />
</svg>`;


/**
 * StatusWidget displays a different SVG icon based on the received message payload.
 * It supports an arbitrary number of states, each with a unique message value and a
 * corresponding SVG graphic.
 */
export default class StatusWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);

    /**
     * The widget's configuration object.
     * @property {Array<object>} states - An array where each object defines a state.
     * @property {string} states[].value - The exact string value to match from the MQTT message.
     * @property {string} states[].svg - The raw SVG string to display for that state.
     * @property {string} defaultSvg - A fallback SVG to show when no state matches.
     */
    this.config = {
        states: [
            { value: 'online', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="green"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z"/></svg>` },
            { value: 'offline', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>` },
        ],
        defaultSvg: DEFAULT_SVG
    };
    
    this.lastValue = null;
    this.render();
  }

  /**
   * Initializes the widget's HTML structure and renders the initial state.
   */
  render() {
    this.container.innerHTML = `<div class="status-svg-container" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;"></div>`;
    this.svgContainer = this.container.firstElementChild;
    this.updateIndicator();
  }
  
  /**
   * Finds the matching SVG for the current value and renders it.
   * If no match is found, it displays the default SVG.
   */
  updateIndicator() {
      if (!this.svgContainer) return;
      const currentState = this.config.states.find(s => s.value === this.lastValue);
      this.svgContainer.innerHTML = currentState ? currentState.svg : this.config.defaultSvg;
  }

  /**
   * Handles incoming MQTT messages by updating the last known value and re-rendering the indicator.
   * @param {Uint8Array} payload - The message payload.
   */
  onMessage(payload) {
    this.lastValue = String(decode(payload, this.jsonPath));
    this.updateIndicator();
  }

  // --- Dynamic Configuration Form Management ---

  /**
   * Generates the HTML for a single state's configuration row in the settings modal.
   * @param {object} state - The state object containing a value and an SVG string.
   * @returns {string} The HTML string for the row.
   */
  _createStateConfigRow(state = { value: '', svg: DEFAULT_SVG }) {
    return `
      <div class="state-config-row" style="border:1px solid var(--border-color); padding: 8px; margin-bottom: 10px; border-radius: 4px;">
        <label>Message Value:</label>
        <input type="text" class="cfg-state-value" value="${state.value}" placeholder="e.g., 'online', '200', 'error'">
        <label>SVG Code:</label>
        <textarea class="cfg-state-svg" rows="5" style="width:100%; font-family:monospace;">${state.svg}</textarea>
        <button type="button" onclick="this.parentElement.remove()" style="float: right; margin-top:5px; background-color: var(--danger-color); color: white;">Remove</button>
      </div>
    `;
  }

  getConfigForm() {
    const statesHtml = this.config.states.map(s => this._createStateConfigRow(s)).join('');
    
    return super.getBaseConfigForm() + `
      <hr>
      <h4>States & Icons</h4>
      <div id="states-config-container" style="max-height: 300px; overflow-y: auto; padding: 5px;">
        ${statesHtml}
      </div>
      <button type="button" id="add-state-btn" style="margin-top: 10px;">Add New State</button>
      <hr>
      <label>Default SVG (if no match):</label>
      <textarea id="cfg_defaultSvg" rows="5" style="width:100%; font-family:monospace;">${this.config.defaultSvg}</textarea>
    `;
  }
  
  onConfigFormRendered() {
    document.getElementById('add-state-btn').onclick = () => {
        const container = document.getElementById('states-config-container');
        container.insertAdjacentHTML('beforeend', this._createStateConfigRow());
    };
  }

  saveConfig() {
    super.saveBaseConfig();
    
    this.config.states = [];
    document.querySelectorAll('.state-config-row').forEach(row => {
        const value = row.querySelector('.cfg-state-value').value;
        const svg = row.querySelector('.cfg-state-svg').value;
        if (value) { // Only save states that have a value
            this.config.states.push({ value, svg });
        }
    });
    
    this.config.defaultSvg = document.getElementById('cfg_defaultSvg').value;
    this.updateIndicator();
  }
  
  getOptions() { 
    return { 
      topic: this.topic, 
      jsonPath: this.jsonPath, 
      ...this.config 
    }; 
  }
  
  setOptions(o) { 
    super.setOptions(o); 
    this.config = { ...this.config, ...o };
    if (!Array.isArray(this.config.states)) { // Ensure states is always an array
        this.config.states = [];
    }
    this.render();
  }
}