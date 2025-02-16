import { drawTrack, drawCyclistPoint } from './trackRenderer.js';

export class MapLayerControl {
    constructor(getTrackData) {
      this.getTrackData = getTrackData;
    }

    onAdd(map) {
      this._map = map;
      this._container = document.createElement('div');
      this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      this._container.innerHTML = `
        <select id="mapLayerSelect" class="maplibregl-ctrl-select">
          <option value="satellite">Satélite</option>
          <option value="roads">Carreteras</option>
          <option value="relief">Relieve</option>
        </select>
      `;
      this._container
        .querySelector('select')
        .addEventListener('change', this._onChange.bind(this));
      return this._container;
    }
  
    onRemove() {
      this._container.parentNode.removeChild(this._container);
      this._map = undefined;
    }
  
    _onChange(event) {
      const selectedLayer = event.target.value;
      this._map.setStyle({
        version: 8,
        sources: this._map.getStyle().sources,
        layers: [
          {
            id: 'base-layer',
            type: 'raster',
            source: selectedLayer
          }
        ],
        terrain: {
          source: 'terrainSource',
          exaggeration: 1.5
        }
      });
  
      // Redibujar track y ciclista tras cambiar el estilo
      this._map.once('styledata', () => {
        const trackData = this.getTrackData();
        if (trackData.length > 0) {
          drawTrack(this._map, trackData);
          const { lon, lat } = trackData[0];
          drawCyclistPoint(this._map, lon, lat);
        }
      });
    }
  }