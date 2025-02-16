import { MapLayerControl } from './mapLayerControl.js';

export function initMap(centerCoords) {
    let map = new maplibregl.Map({
      container: 'map',
      zoom: 13,
      center: centerCoords,
      pitch: 60,
      maxPitch: 85,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 20,
            attribution: '&copy; Esri & contributors'
          },
          roads: {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          },
          relief: {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            maxzoom: 18,
            attribution: '&copy; Stadia Maps &copy; OpenStreetMap contributors'
          },
          terrainSource: {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            maxzoom: 14,
            encoding: 'terrarium'
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite'
          }
        ],
        terrain: {
          source: 'terrainSource',
          exaggeration: 1.5
        }
      }
    });
  

    map.addControl(new MapLayerControl(), 'top-right');
    map.addControl(new maplibregl.NavigationControl());
    map.addControl(
      new maplibregl.TerrainControl({
        source: 'terrainSource',
        exaggeration: 1.5
      })
    );

    return map;
  }
  