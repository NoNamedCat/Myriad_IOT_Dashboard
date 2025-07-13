import BaseWidget from './base.js';
import { decode } from './utils.js';

/**
 * SvgWidget is responsible for rendering raw SVG data received from an MQTT topic.
 * It provides configuration options for sizing and background color.
 */
export default class SvgWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    
    /**
     * The widget's configuration object.
     * @property {string} sizing - Defines how the SVG is resized ('natural', 'contain', 'cover', 'fill').
     * @property {string} backgroundColor - The background color for the widget container.
     */
    this.config = {
        sizing: 'contain',
        backgroundColor: 'rgba(255, 255, 255, 0)', // Default: transparent
    };

    this.render();
  }

  /**
   * Initializes the widget's HTML structure.
   */
  render() {
    this.container.innerHTML = `<div class="svg-container" style="width:100%; height:100%;"></div>`;
    this.svgContainer = this.container.firstElementChild;
    this.applyStyles();
  }

  /**
   * Applies the configured styles to the widget's container.
   */
  applyStyles() {
    this.svgContainer.style.backgroundColor = this.config.backgroundColor || 'transparent';
  }

  /**
   * Handles incoming MQTT messages, decodes the SVG string, modifies it
   * according to the sizing configuration, and renders it.
   * @param {Uint8Array} payload - The message payload containing the SVG data.
   */
  onMessage(payload) {
    const svgString = String(decode(payload, this.jsonPath));
    if (!svgString) {
        this.svgContainer.innerHTML = '';
        return;
    }

    // Use DOMParser to safely manipulate the SVG element without brittle regex
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.querySelector('svg');

    if (!svgElement || doc.querySelector('parsererror')) {
        this.svgContainer.textContent = 'Invalid SVG data received';
        return;
    }

    // Apply sizing logic by manipulating SVG attributes and styles
    if (this.config.sizing !== 'natural') {
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';

        let preserveAspectRatio = 'xMidYMid meet'; // Default for 'contain'
        if (this.config.sizing === 'cover') {
            preserveAspectRatio = 'xMidYMid slice';
        } else if (this.config.sizing === 'fill') {
            preserveAspectRatio = 'none';
        }
        svgElement.setAttribute('preserveAspectRatio', preserveAspectRatio);
    } else {
        // For 'natural' sizing, ensure no container styles interfere.
        svgElement.style.width = '';
        svgElement.style.height = '';
        svgElement.removeAttribute('preserveAspectRatio');
    }

    // Clear previous content and append the new, modified SVG element
    this.svgContainer.innerHTML = '';
    this.svgContainer.appendChild(svgElement);
  }
  
  /**
   * Builds the HTML string for the widget's configuration form.
   * @returns {string} The HTML for the form.
   */
  getConfigForm() {
    return super.getBaseConfigForm() + `
      <hr>
      <label for="cfg_sizing">Sizing Mode:</label>
      <select id="cfg_sizing">
          <option value="contain" ${this.config.sizing === 'contain' ? 'selected' : ''}>Contain</option>
          <option value="cover" ${this.config.sizing === 'cover' ? 'selected' : ''}>Cover</option>
          <option value="fill" ${this.config.sizing === 'fill' ? 'selected' : ''}>Fill</option>
          <option value="natural" ${this.config.sizing === 'natural' ? 'selected' : ''}>Natural</option>
      </select>
      <br><br>
      <label for="cfg_backgroundColor">Background Color:</label>
      <input type="color" id="cfg_backgroundColor" value="${this.config.backgroundColor}">
    `;
  }

  /**
   * Saves the configuration from the form and applies the changes.
   */
  saveConfig() {
    super.saveBaseConfig();
    this.config.sizing = document.getElementById('cfg_sizing').value;
    this.config.backgroundColor = document.getElementById('cfg_backgroundColor').value;
    this.applyStyles();
    // No need to call onMessage here, styles will apply to the next received SVG.
  }

  /**
   * Serializes the widget's current configuration for saving.
   * @returns {object} The widget's configuration options.
   */
  getOptions() {
    return { 
      topic: this.topic, 
      jsonPath: this.jsonPath,
      ...this.config
    };
  }

  /**
   * Applies a new configuration to the widget when loading from a layout.
   * @param {object} o - The configuration options object.
   */
  setOptions(o) {
    super.setOptions(o);
    this.config = { ...this.config, ...o };
    this.applyStyles();
  }
}