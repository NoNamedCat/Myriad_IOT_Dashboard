import BaseWidget from './base.js';
import { decode } from './utils.js';

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
        mapTheme: 'OpenStreetMap'
    };
    
    this.map = null;
    this.marker = null;
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
      this.map.panTo(newLatLng);

    } catch (e) { console.error("Error processing coordinates:", e); }
  }
  
  onResize() {
    if (this.map) setTimeout(() => this.map.invalidateSize(), 100);
  }

  getConfigForm() {
    let themeOptions = '';
    for (const name in TILE_PROVIDERS) {
      themeOptions += `<option value="${name}" ${this.config.mapTheme === name ? 'selected' : ''}>${name}</option>`;
    }

    return super.getBaseConfigForm() + `
      <hr>
      <label>Map Theme:</label>
      <select id="cfg_mapTheme">${themeOptions}</select>
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
    this.config.mapTheme = document.getElementById('cfg_mapTheme').value;
    this.initMap(true);
  }

  getOptions() { 
      return { topic: this.topic, jsonPath: this.jsonPath, ...this.config };
  }

  setOptions(o) { 
      super.setOptions(o); 
      this.config = { ...this.config, ...o }; 
      this.initMap(false);
  }
  
  destroy() {
    if (this.map) this.map.remove();
  }
}