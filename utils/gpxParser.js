import { decimatePoints } from './geoUtils.js';
import { drawTrack, drawCyclistPoint } from '../map/trackRenderer.js';
import { haversineDistance, calculateBearing } from './geoUtils.js';
import { smoothBearingsCircular } from './geoUtils.js';

export function setupGPXFileInput(map, onTrackLoaded) {
  const input = document.getElementById('gpxFileInput');
  input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();

    reader.onload = (e) => {
      const gpxText = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxText, 'application/xml');
      const points = parseGPX(xmlDoc);

      const decimatedPoints = decimatePoints(points, 10);

      let trackData = decimatedPoints.map((point, index) => {
        let slope = 0;
        let speed = 0;
        let bearing = 0;
        if (index > 0) {
          const prev = decimatedPoints[index - 1];
          const distance = haversineDistance(prev.lat, prev.lon, point.lat, point.lon);
          const elevationDiff = point.ele - prev.ele;
          slope = distance > 0 ? elevationDiff / distance : 0;

          if (point.time && prev.time) {
            const timeDiff = (point.time - prev.time) / 1000; // segundos
            speed = timeDiff > 0 ? distance / timeDiff : 0; // m/s
          }

          bearing = calculateBearing(prev.lat, prev.lon, point.lat, point.lon);
        }
        return { ...point, slope, speed, bearing };
      });

      smoothBearingsCircular(trackData, 100);



      onTrackLoaded(trackData, fileName);

      drawTrack(map, trackData);
      drawCyclistPoint(map, decimatedPoints[0].lon, decimatedPoints[0].lat);

      map.once('idle', () => {
        const bounds = new maplibregl.LngLatBounds();
        decimatedPoints.forEach((p) => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 50 });
      });
    };

    reader.readAsText(file);
  });
}

function parseGPX(xmlDoc) {
  return Array.from(xmlDoc.getElementsByTagName('trkpt')).map((point) => ({
    lat: parseFloat(point.getAttribute('lat')),
    lon: parseFloat(point.getAttribute('lon')),
    ele: parseFloat(point.getElementsByTagName('ele')[0].textContent),
    time: point.getElementsByTagName('time')[0]?.textContent
      ? new Date(point.getElementsByTagName('time')[0].textContent).getTime()
      : null
  }));
}
