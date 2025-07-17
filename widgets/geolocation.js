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

export default class GeolocationWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    
    this.config = {
        zoom: 13,
        defaultLocation: '0,0',
        mapTheme: 'OpenStreetMap',
        // --- NUEVAS OPCIONES PARA LA ESTELA ---
        showTrail: true,
        trailLength: 100,
        trailColor: 'var(--primary-color)'
    };
    
    this.map = null;
    this.marker = null;
    // --- NUEVO: Para guardar la línea y las coordenadas ---
    this.trailLine = null;
    this.pathCoordinates = [];

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

  initMap(preserveView = false) {
    let lastView = null;
    if (preserveView && this.map) {
        lastView = {
            center: this.map.getCenter(),
            zoom: this.map.getZoom()
        };
    }
    
    if (this.map) {
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

    let defaultCoords = [0, 0];
    try {
        const parts = this.config.defaultLocation.split(',').map(s => s.trim());
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                defaultCoords = [lat, lng];
            }
        }
    } catch(e) { console.error("Error parsing default location:", e); }

    const viewCenter = lastView ? lastView.center : defaultCoords;
    const viewZoom = lastView ? lastView.zoom : this.config.zoom;
    
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
        if (coordsDisplay.textContent !== 'Copied!') {
            coordsDisplay.textContent = `Lat: ${lat}, Lng: ${lng} | Zoom: ${zoom}`;
        }
    };

    this.map.on('mousemove', updateCoords);
    this.map.on('zoomend', (e) => {
        const center = this.map.getCenter();
        updateCoords({ latlng: center });
    });
    this.map.on('mouseout', () => {
        coordsDisplay.textContent = '--';
    });
    
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
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    });

    this.marker = L.marker(defaultCoords).addTo(this.map)
      .bindPopup('Waiting for data...');
  }

  _parseCoords(val) {
      let lat, lng;
      if (typeof val === 'object' && val !== null && 'lat' in val && 'lng' in val) {
        lat = parseFloat(val.lat);
        lng = parseFloat(val.lng);
      } else if (typeof val === 'string' && val.includes(',')) {
        const parts = val.split(',');
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      } else {
        return null;
      }
      if (isNaN(lat) || isNaN(lng)) return null;
      return new L.LatLng(lat, lng);
  }

  _updateMarker(val) {
      if (!this.map || !this.marker) return;
      const newLatLng = this._parseCoords(val);
      if (!newLatLng) return;

      try {
        // Mover marcador existente
        this.marker.setLatLng(newLatLng)
                   .setPopupContent(`Lat: ${newLatLng.lat.toFixed(5)}, Lng: ${newLatLng.lng.toFixed(5)}`);
        
        // Añadir a la estela
        if (this.config.showTrail) {
            this.pathCoordinates.push(newLatLng);
            while(this.pathCoordinates.length > this.config.trailLength) {
                this.pathCoordinates.shift();
            }
            this._updateTrail();
        }

        this.map.panTo(newLatLng);

      } catch (e) { console.error("Error processing coordinates:", e); }
  }

  _updateTrail() {
      if (this.trailLine) {
          this.map.removeLayer(this.trailLine);
      }
      if (this.config.showTrail && this.pathCoordinates.length > 1) {
          const colorVar = getComputedStyle(document.documentElement).getPropertyValue(this.config.trailColor.slice(4,-1)).trim() || this.config.trailColor;
          this.trailLine = L.polyline(this.pathCoordinates, { color: colorVar }).addTo(this.map);
      }
  }

  onMessage(payload) {
    super.onMessage(payload);
    const val = decode(payload, this.jsonPath);
    this._updateMarker(val);
  }
  
  loadFromLogger() {
      if (!this.config.loggingEnabled || !this.logger) return;
      const logs = this.logger.getLogs();
      if (logs.length > 0) {
          // Limpiar historial actual antes de cargar el guardado
          this.pathCoordinates = [];
          
          logs.forEach(log => {
              let val;
              try { val = JSON.parse(log.payload); } catch { val = log.payload; }
              const coords = this._parseCoords(val);
              if (coords) this.pathCoordinates.push(coords);
          });

          if(this.pathCoordinates.length > 0) {
              const lastCoords = this.pathCoordinates[this.pathCoordinates.length-1];
              this.marker.setLatLng(lastCoords)
                         .setPopupContent(`Lat: ${lastCoords.lat.toFixed(5)}, Lng: ${lastCoords.lng.toFixed(5)}`);
              this.map.panTo(lastCoords);
              this._updateTrail();
          }
      }
  }

  onResize() {
    if (this.map) setTimeout(() => this.map.invalidateSize(), 100);
  }

  onThemeChanged() {
    this._updateTrail();
  }
  
  getConfigForm() {
    let themeOptions = '';
    for (const name in TILE_PROVIDERS) {
      themeOptions += `<option value="${name}" ${this.config.mapTheme === name ? 'selected' : ''}>${name}</option>`;
    }

    return super.getBaseConfigForm() + `
      <hr>
      <h4>Map Settings</h4>
      <label>Map Theme:</label>
      <select id="cfg_mapTheme">${themeOptions}</select>
      <label>Zoom Level:</label>
      <input id="cfg_zoom" type="number" min="1" max="18" value="${this.config.zoom}">
      <label>Default Location (lat,lng):</label>
      <input id="cfg_defaultLocation" type="text" value="${this.config.defaultLocation}" placeholder="e.g.: 40.71,-74.00">
      <hr>
      <h4>Trail Settings</h4>
      <label><input type="checkbox" id="cfg_showTrail" ${this.config.showTrail ? 'checked' : ''}> Show trail</label>
      <br><br>
      <label>Trail Length (max points):</label>
      <input type="number" id="cfg_trailLength" min="2" max="1000" value="${this.config.trailLength}">
      <label>Trail Color:</label>
      <input type="color" id="cfg_trailColor" value="${this.config.trailColor}">
    `;
  }

  saveConfig() {
    super.saveBaseConfig();
    this.config.zoom = parseInt(document.getElementById('cfg_zoom').value, 10) || 13;
    this.config.defaultLocation = document.getElementById('cfg_defaultLocation').value.trim();
    this.config.mapTheme = document.getElementById('cfg_mapTheme').value;
    
    // Guardar configuración de la estela
    this.config.showTrail = document.getElementById('cfg_showTrail').checked;
    this.config.trailLength = parseInt(document.getElementById('cfg_trailLength').value, 10) || 100;
    this.config.trailColor = document.getElementById('cfg_trailColor').value;

    // Si se deshabilita la estela, se limpia del mapa
    if (!this.config.showTrail && this.trailLine) {
        this.map.removeLayer(this.trailLine);
        this.trailLine = null;
    } else {
        this._updateTrail(); // Actualizar por si cambió el color
    }
    this.initMap(true);
  }

  getOptions() { 
      return { ...super.getOptions(), topic: this.topic, jsonPath: this.jsonPath, ...this.config };
  }

  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o }; 
      this.initMap(false);
      this.loadFromLogger();
  }
  
  destroy() {
    if (this.map) this.map.remove();
  }
}