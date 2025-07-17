import BaseWidget from './base.js';
import { decode } from './utils.js';
import { getDataLogger } from '../libs/datalogger.js';

const TILE_PROVIDERS = {
  'OpenStreetMap': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  'OpenTopoMap': {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    }
  },
  'Stadia_AlidadeSmoothDark': {
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }
  },
   'Esri_WorldImagery': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
         attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }
   },
};

export default class DeviceMapWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    
    this.config = {
        zoom: 13,
        defaultLocation: '0,0',
        autoclear: true, 
        defaultIconUrl: '', 
        mapTheme: 'OpenStreetMap',
        baseUrl: 'http://localhost:8080/#view=client&c=1&data={{DASHBOARD_DATA}}',
        baseSubscriptionTopic: 'devices/+/location',
        staticMarkers: [], 
    };
    
    this.topic = this.config.baseSubscriptionTopic;
    this.dynamicMarkers = {};
    this.staticMarkerObjects = {};
    this.render();
  }

  render() {
    this.container.style.position = 'relative'; 
    this.container.innerHTML = `
      <div id="${this.id}_map" style="width:100%; height:100%;"></div>
      <div id="${this.id}_coords" style="position: absolute; bottom: 10px; right: 10px; background-color: rgba(0,0,0,0.5); color: white; padding: 2px 5px; border-radius: 3px; font-family: monospace; z-index: 1000; pointer-events: none;">
        --
      </div>
    `;
    this.initMap();
  }

  initMap() {
    let lastView = { center: null, zoom: null };
    if (this.map) {
        lastView.center = this.map.getCenter();
        lastView.zoom = this.map.getZoom();
        this.map.remove();
    }
    const coordsDisplay = this.container.querySelector(`#${this.id}_coords`);
    try {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'libs/images/marker-icon-2x.png',
        iconUrl: 'libs/images/marker-icon.png',
        shadowUrl: 'libs/images/marker-shadow.png',
      });
    } catch (e) { console.error("Error setting up Leaflet icon paths", e); }
    let initialCoords = [0, 0];
    try {
        const parts = this.config.defaultLocation.split(',');
        if (parts.length === 2) initialCoords = [parseFloat(parts[0]), parseFloat(parts[1])];
    } catch(e) { console.error("Error parsing default location:", e); }
    const viewCenter = lastView.center || initialCoords;
    const viewZoom = lastView.zoom || this.config.zoom;
    this.map = L.map(`${this.id}_map`).setView(viewCenter, viewZoom);
    this.map.attributionControl.setPrefix('');
    const provider = TILE_PROVIDERS[this.config.mapTheme] || TILE_PROVIDERS['OpenStreetMap'];
    L.tileLayer(provider.url, provider.options).addTo(this.map);
    if(provider.options.attribution) {
        this.map.attributionControl.addAttribution(provider.options.attribution);
    }
    const updateCoords = (e) => {
        const zoom = this.map.getZoom();
        const lat = e.latlng.lat.toFixed(5);
        const lng = e.latlng.lng.toFixed(5);
        coordsDisplay.textContent = `Lat: ${lat}, Lng: ${lng} | Zoom: ${zoom}`;
    };
    this.map.on('mousemove', updateCoords);
    this.map.on('zoomend', (e) => {
        const center = this.map.getCenter();
        updateCoords({ latlng: center });
    });
    this.map.on('mouseout', () => { coordsDisplay.textContent = '--'; });
    this.map.on('contextmenu', (e) => {
        e.originalEvent.preventDefault();
        const coordsString = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
        navigator.clipboard.writeText(coordsString).then(() => {
            coordsDisplay.textContent = 'Copied!';
            setTimeout(() => {
                 if (this.map) {
                    const zoom = this.map.getZoom();
                    coordsDisplay.textContent = `Lat: ${e.latlng.lat.toFixed(5)}, Lng: ${e.latlng.lng.toFixed(5)} | Zoom: ${zoom}`;
                 }
            }, 1000);
        }).catch(err => { console.error('Could not copy text: ', err); });
    });
    this._renderStaticMarkers();
  }
  
  _renderStaticMarkers() {
      for (const id in this.staticMarkerObjects) {
          this.map.removeLayer(this.staticMarkerObjects[id]);
      }
      this.staticMarkerObjects = {};
      (this.config.staticMarkers || []).forEach(markerData => {
          if (!markerData || !markerData.id || !('lat' in markerData) || !('lng' in markerData)) return;
          const latLng = new L.LatLng(markerData.lat, markerData.lng);
          this.staticMarkerObjects[markerData.id] = this._createMarker(markerData.id, latLng, markerData);
      });
  }
  
  _updateMarkers(data) {
    if (!this.map) return;
    const receivedMarkers = Array.isArray(data) ? data : [data];
    const receivedIds = new Set();
    receivedMarkers.forEach(markerData => {
        if (!markerData || typeof markerData !== 'object' || !markerData.id || !('lat' in markerData) || !('lng' in markerData)) return;
        const id = markerData.id;
        receivedIds.add(id);
        const newLatLng = new L.LatLng(markerData.lat, markerData.lng);
        if (this.dynamicMarkers[id]) {
            this.dynamicMarkers[id].setLatLng(newLatLng);
        } else {
            this.dynamicMarkers[id] = this._createMarker(id, newLatLng, markerData);
        }
        const marker = this.dynamicMarkers[id];
        if (markerData.popup) marker.unbindPopup().bindPopup(markerData.popup);
        if (markerData.title) marker.unbindTooltip().bindTooltip(markerData.title, { permanent: true, direction: 'top', offset: [0, -10] });
    });
    if (this.config.autoclear) {
        for (const id in this.dynamicMarkers) {
            if (!receivedIds.has(id)) {
                this.map.removeLayer(this.dynamicMarkers[id]);
                delete this.dynamicMarkers[id];
            }
        }
    }
  }

  onMessage(payload, topic) {
    super.onMessage(payload);
    const data = decode(payload, this.jsonPath);
    this._updateMarkers(data);
  }

  loadFromLogger() {
    if (!this.config.loggingEnabled || !this.logger) return;
    const logs = this.logger.getLogs();
    if (logs.length > 0) {
        const lastLog = logs[logs.length-1].payload;
        try {
            const parsed = JSON.parse(lastLog);
            this._updateMarkers(parsed);
        } catch(e) {
            // No hacer nada si no es un JSON válido
        }
    }
  }

  _createMarker(id, latLng, data) {
      let markerOptions = {};
      const iconUrl = data.icon || this.config.defaultIconUrl;
      if (iconUrl) {
          markerOptions.icon = L.icon({
              iconUrl: iconUrl, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
          });
      }
      const marker = L.marker(latLng, markerOptions).addTo(this.map);
      if (data.childDashboardTemplate && data.variables) {
          marker.on('click', () => {
              try {
                  const templateString = resolveTemplate(JSON.stringify(data.childDashboardTemplate), data.variables);
                  const finalState = JSON.parse(templateString);
                  const compressed = pako.deflate(JSON.stringify(finalState), { level: 9 });
                  const dataToEncode = btoa(String.fromCharCode.apply(null, compressed));
                  const url = new URL(window.location.origin + window.location.pathname);
                  const params = new URLSearchParams();
                  params.set('data', dataToEncode);
                  params.set('c', '1');
                  params.set('view', 'client');
                  url.hash = params.toString();
                  window.open(url.toString(), '_blank');
              } catch (e) {
                  console.error("Error generating dynamic dashboard URL", e);
                  alert("Error generating the dynamic URL. Check the console for details.");
              }
          });
      }
      return marker;
  }
  
  onResize() {
    if (this.map) setTimeout(() => this.map.invalidateSize(), 100);
  }

  getConfigForm() {
    let themeOptions = '';
    for (const name in TILE_PROVIDERS) {
      themeOptions += `<option value="${name}" ${this.config.mapTheme === name ? 'selected' : ''}>${name}</option>`;
    }
    let staticMarkersHtml = (this.config.staticMarkers || []).map(m => this._createStaticMarkerFormRow(m)).join('');
    return super.getBaseConfigForm() + `
      <hr>
      <h4>Map Settings</h4>
      <label>Map Theme:</label> <select id="cfg_mapTheme">${themeOptions}</select>
      <label>Zoom Level:</label> <input id="cfg_zoom" type="number" min="1" max="18" value="${this.config.zoom}">
      <label>Default Location (lat,lng):</label> <input id="cfg_defaultLocation" type="text" value="${this.config.defaultLocation}">
      <label>Default Marker Icon URL:</label> <input id="cfg_defaultIconUrl" type="text" value="${this.config.defaultIconUrl}">
      <br><br>
      <label><input type="checkbox" id="cfg_autoclear" ${this.config.autoclear ? 'checked' : ''}> Automatically remove old markers</label>
      <hr>
      <h4>Static Markers & Dynamic Links</h4>
      <div id="static-markers-container" style="max-height: 200px; overflow-y: auto; padding: 5px; border: 1px dashed var(--border-color);">
        ${staticMarkersHtml}
      </div>
      <button type="button" id="add-static-marker-btn" style="margin-top: 10px;">Add Static Marker</button>
    `;
  }
  
  _createStaticMarkerFormRow(marker = {}) {
      const m = { id: '', lat: '', lng: '', popup: '', icon: '', variables: {}, childDashboardTemplate: '', ...marker };
      const variables = (String(m.childDashboardTemplate).match(/\{(\w+)\}/g) || []).map(v => v.slice(1, -1));
      let variablesHtml = [...new Set(variables)].map(v => `
        <label style="font-weight: bold;">Value for <code>{${v}}</code>:</label>
        <input type="text" class="cfg-sm-var" data-variable="${v}" value="${m.variables[v] || ''}">
      `).join('');

      return `
        <div class="static-marker-row" style="border: 1px solid var(--border-color); padding: 8px; margin-bottom: 10px; border-radius: 4px;">
            <label>ID:</label> <input type="text" class="cfg-sm-id" value="${m.id}" placeholder="unique_marker_id">
            <label>Lat, Lng:</label> <div style="display:flex;"><input type="text" class="cfg-sm-lat" value="${m.lat}"><input type="text" class="cfg-sm-lng" value="${m.lng}"></div>
            <label>Popup Text:</label> <input type="text" class="cfg-sm-popup" value="${m.popup}">
            <label>Icon URL:</label> <input type="text" class="cfg-sm-icon" value="${m.icon}">
            <label>Child Dashboard Template:</label> <textarea class="cfg-sm-template" rows="5" placeholder="Paste layout JSON template here...">${m.childDashboardTemplate}</textarea>
            ${variablesHtml}
            <button type="button" class="remove-static-marker-btn" style="float: right; background-color: var(--danger-color); color: white; border: none; cursor: pointer;">Remove</button>
        </div>`;
  }

  onConfigFormRendered() {
      super.onConfigFormRendered();
      document.getElementById('add-static-marker-btn').onclick = () => {
          const container = document.getElementById('static-markers-container');
          const newRow = this._createStaticMarkerFormRow();
          container.insertAdjacentHTML('beforeend', newRow);
          const addedRow = container.lastElementChild;
          addedRow.querySelector('.remove-static-marker-btn').onclick = () => addedRow.remove();
      };
      
      document.querySelectorAll('.remove-static-marker-btn').forEach(btn => {
          btn.onclick = () => btn.parentElement.remove();
      });
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.mapTheme = document.getElementById('cfg_mapTheme').value;
    this.config.zoom = parseInt(document.getElementById('cfg_zoom').value, 10) || 13;
    this.config.defaultLocation = document.getElementById('cfg_defaultLocation').value.trim();
    this.config.defaultIconUrl = document.getElementById('cfg_defaultIconUrl').value.trim();
    this.config.autoclear = document.getElementById('cfg_autoclear').checked;
    
    this.config.staticMarkers = [];
    document.querySelectorAll('.static-marker-row').forEach(row => {
        const id = row.querySelector('.cfg-sm-id').value.trim();
        if (id) {
            let markerConfig = {
                id: id,
                lat: parseFloat(row.querySelector('.cfg-sm-lat').value),
                lng: parseFloat(row.querySelector('.cfg-sm-lng').value),
                popup: row.querySelector('.cfg-sm-popup').value,
                icon: row.querySelector('.cfg-sm-icon').value,
                childDashboardTemplate: row.querySelector('.cfg-sm-template').value,
                variables: {}
            };
            row.querySelectorAll('.cfg-sm-var').forEach(input => {
                markerConfig.variables[input.dataset.variable] = input.value;
            });
            this.config.staticMarkers.push(markerConfig);
        }
    });

    this.initMap();
    this.loadFromLogger();
  }

  getOptions() { 
      return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath, ...this.config };
  }

  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o }; 
      this.topic = this.config.baseSubscriptionTopic;
      this.dynamicMarkers = {};
      this.staticMarkerObjects = {};
      this.initMap();
      this.loadFromLogger();
  }
  
  destroy() {
    if (this.map) this.map.remove();
  }
}