import { getMinMax } from '../utils/helpers.js';
import { offsetPosition } from '../utils/geoUtils.js';

export function drawTrack(map, trackData) {
    if (trackData.length < 2) return;
  
    const mode = document.getElementById('colorMode').value;
    const fixedColor = document.getElementById('fixedColorPicker').value;
  
    const segments = trackData.slice(0, -1).map((p, i) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[p.lon, p.lat], [trackData[i + 1].lon, trackData[i + 1].lat]] },
      properties: { slope: p.slope, elevation: p.ele, speed: p.speed }
    }));
  
    if (map.getLayer('gpx-track-line')) {
      map.removeLayer('gpx-track-line');
    }
    if (map.getSource('gpx-track')) {
      map.removeSource('gpx-track');
    }
  
    map.addSource('gpx-track', { type: 'geojson', data: { type: 'FeatureCollection', features: segments } });
  
    let min = 0;
    let max = 0;
    if (mode !== 'fixed') {
      const propertyValues = segments.map(s => s.properties[mode]);
      ({ min, max } = getMinMax(propertyValues));
    }
    
    let colorPaint;
    
    if (mode === 'fixed' || min === max) {
      colorPaint = fixedColor;
    } else if (mode === 'slope') {
      colorPaint = [
        'interpolate',
        ['linear'],
        ['get', 'slope'],
        -0.15, '#0000ff', // Azul - Pendientes muy negativas
        -0.10, '#0077ff', // Azul claro
        -0.05, '#00ff00', // Verde bajada suave
        -0.025, '#aaff00', // Verde lima
        0, '#ffff00',     // Amarillo llano
        0.025, '#ffaa00', // Naranja claro
        0.05, '#ff7f00',  // Naranja subida ligera
        0.10, '#ff0000',  // Rojo subida fuerte
        0.15, '#990000'   // Rojo oscuro - Rampas muy fuertes
      ];
    } else if (mode === 'speed') {
      colorPaint = [
        'interpolate',
        ['linear'],
        ['get', 'speed'],
        0, '#00ff00',       // 0 km/h (verde)
        5.5, '#ffff00',     // 20 km/h (amarillo)
        11.11, '#ff0000'    // 40 km/h (rojo)
      ];
    } else {
      colorPaint = [
        'interpolate',
        ['linear'],
        ['get', mode],
        min, '#00ff00',
        (min + max) / 2, '#ffff00',
        max, '#ff0000'
      ];
    }
    
    map.addLayer({
      id: 'gpx-track-line',
      type: 'line',
      source: 'gpx-track',
      layout: {},
      paint: { 'line-width': 4, 'line-color': colorPaint }
    });


  }

export function drawCyclistPoint(map, lon, lat) {
    const cyclistSourceId = 'cyclist-point';
    const cyclistLayerId = 'cyclist-point-layer';
  
    if (map.getSource(cyclistSourceId)) {
      map.getSource(cyclistSourceId).setData({
        type: 'Point',
        coordinates: [lon, lat]
      });
    } else {
      map.addSource(cyclistSourceId, {
        type: 'geojson',
        data: {
          type: 'Point',
          coordinates: [lon, lat]
        }
      });
  
      map.addLayer({
        id: cyclistLayerId,
        type: 'circle',
        source: cyclistSourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#FFA500', // Naranja
          'circle-stroke-color': '#000000',
          'circle-stroke-width': 2
        }
      });
    }
  }
  

export function moveCyclist(map, trackData, progress) { 
    const index = Math.floor(progress * (trackData.length - 1));
    const point = trackData[index];
  
    drawCyclistPoint(map, point.lon, point.lat);
  
    if (index < trackData.length - 1) {
      const nextPoint = trackData[index + 1];
  
      const cameraDistance = 0.0005; // Más cerca (~5 metros aprox)
      const cameraOffset = offsetPosition(point.lat, point.lon, point.bearing + 180, cameraDistance);
  
      map.easeTo({
        center: [cameraOffset.lon, cameraOffset.lat],
        zoom: 15,
        bearing: point.bearing,
        pitch: 50,
        duration: 100
      });
    }
  }