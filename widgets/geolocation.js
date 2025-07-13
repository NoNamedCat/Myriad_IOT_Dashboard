import BaseWidget from './base.js';
import { decode } from './utils.js';

export default class GeolocationWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        zoom: 13,
        defaultLocation: '0,0' 
    };
    this.map = null;
    this.marker = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `<div id="${this.id}_map" style="width:100%; height:100%;"></div>`;
    this.initMap();
  }

  initMap() {
    if (this.map) {
      this.map.remove();
    }
    
    let initialCoords = [0, 0];
    try {
        const parts = this.config.defaultLocation.split(',');
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                initialCoords = [lat, lng];
            }
        }
    } catch(e) { console.error("Error parsing default location:", e); }

    this.map = L.map(`${this.id}_map`).setView(initialCoords, this.config.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.marker = L.marker(initialCoords).addTo(this.map)
      .bindPopup('Waiting for data...');
  }

  onMessage(payload) {
    if (!this.map || !this.marker) return;

    const val = decode(payload, this.jsonPath);
    let lat, lng;

    try {
      if (typeof val === 'object' && val !== null && 'lat' in val && 'lng' in val) {
        lat = parseFloat(val.lat);
        lng = parseFloat(val.lng);
      } else if (typeof val === 'string' && val.includes(',')) {
        const parts = val.split(',');
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      } else {
        return; 
      }
      
      if (isNaN(lat) || isNaN(lng)) return;

      const newLatLng = new L.LatLng(lat, lng);
      this.marker.setLatLng(newLatLng)
                 .setPopupContent(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
      this.map.setView(newLatLng, this.config.zoom);

    } catch (e) {
      console.error("Error processing coordinates:", e);
    }
  }
  
  onResize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }

  getConfigForm() {
    return super.getBaseConfigForm() + `
      <label>Zoom Level:</label>
      <input id="cfg_zoom" type="number" min="1" max="18" value="${this.config.zoom}">
      <label>Default Location (lat,lng):</label>
      <input id="cfg_defaultLocation" type="text" value="${this.config.defaultLocation}" placeholder="e.g.: 40.71,-74.00">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.zoom = parseInt(document.getElementById('cfg_zoom').value, 10) || 13;
    this.config.defaultLocation = document.getElementById('cfg_defaultLocation').value.trim();
    this.initMap();
  }

  getOptions() { 
      return { topic: this.topic, jsonPath: this.jsonPath, ...this.config };
  }

  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o }; 
      this.initMap();
  }
  
  destroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}