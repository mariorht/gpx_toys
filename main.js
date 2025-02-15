let map;
let trackData = [];
let cyclistMarker;

initMap([-5.84, 43.36]); // Avilés

function initMap(centerCoords) {
  map = new maplibregl.Map({
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
        exaggeration: 1
      }
    }
  });

  map.addControl(new maplibregl.NavigationControl());
  map.addControl(
    new maplibregl.TerrainControl({
      source: 'terrainSource',
      exaggeration: 1
    })
  );

  // Subir GPX
  document.getElementById('gpxFileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const gpxText = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, 'application/xml');
        const trackPoints = Array.from(xmlDoc.getElementsByTagName('trkpt'));

        const pointsData = trackPoints.map((point) => {
          const lat = parseFloat(point.getAttribute('lat'));
          const lon = parseFloat(point.getAttribute('lon'));
          const ele = parseFloat(point.getElementsByTagName('ele')[0].textContent);
          const timeNode = point.getElementsByTagName('time')[0];
          const time = timeNode ? new Date(timeNode.textContent).getTime() : null;
          return { lat, lon, ele, time };
        });

        trackData = pointsData.map((point, index) => {
          let slope = 0;
          let speed = 0;
          if (index > 0) {
            const prev = pointsData[index - 1];
            const distance = haversineDistance(prev.lat, prev.lon, point.lat, point.lon);
            const elevationDiff = point.ele - prev.ele;
            slope = distance > 0 ? elevationDiff / distance : 0;

            if (point.time && prev.time) {
              const timeDiff = (point.time - prev.time) / 1000; // segundos
              speed = timeDiff > 0 ? distance / timeDiff : 0; // m/s
            }
          }
          return { ...point, slope, speed };
        });

        drawTrack();
        placeCyclistMarker(trackData[0].lat, trackData[0].lon);

        const bounds = new maplibregl.LngLatBounds();
        trackData.forEach((p) => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 50 });

        document.getElementById('trackControls').style.display = 'block';
      };
      reader.readAsText(file);
    }
  });

  // Cambiar modo de color dinámicamente
  document.getElementById('colorMode').addEventListener('change', () => {
    const mode = document.getElementById('colorMode').value;
    const colorPicker = document.getElementById('fixedColorPicker');
    colorPicker.style.display = mode === 'fixed' ? 'inline-block' : 'none';
    drawTrack();
  });

  document.getElementById('fixedColorPicker').addEventListener('input', drawTrack);

  // Control de ciclista
  const progressBar = document.getElementById('progressBar');
  const playButton = document.getElementById('playButton');
  let animationInterval = null;

  progressBar.addEventListener('input', (e) => {
    const progress = parseFloat(e.target.value) / 100;
    moveCyclist(progress);
  });

  playButton.addEventListener('click', () => {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
      playButton.textContent = 'Play';
    } else {
      let currentProgress = parseFloat(progressBar.value);

      animationInterval = setInterval(() => {
        currentProgress += 0.1;
        if (currentProgress > 100) {
          currentProgress = 0;
        }
        progressBar.value = currentProgress;
        moveCyclist(currentProgress / 100);
      }, 30);

      playButton.textContent = 'Pause';
    }
  });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function drawTrack() {
  if (trackData.length < 2) return;

  const mode = document.getElementById('colorMode').value;
  const fixedColor = document.getElementById('fixedColorPicker').value;

  const segments = trackData.slice(0, -1).map((p, i) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[p.lon, p.lat], [trackData[i + 1].lon, trackData[i + 1].lat]] },
    properties: { slope: p.slope, elevation: p.ele, speed: p.speed }
  }));

  if (map.getSource('gpx-track')) {
    map.removeLayer('gpx-track-line');
    map.removeSource('gpx-track');
  }

  map.addSource('gpx-track', { type: 'geojson', data: { type: 'FeatureCollection', features: segments } });

  const { min, max } = getMinMax(mode);
  const colorPaint = mode === 'fixed' || min === max
    ? fixedColor
    : ['interpolate', ['linear'], ['get', mode], min, '#00ff00', (min + max) / 2, '#ffff00', max, '#ff0000'];

  map.addLayer({
    id: 'gpx-track-line',
    type: 'line',
    source: 'gpx-track',
    layout: {},
    paint: { 'line-width': 4, 'line-color': colorPaint }
  });
}

function placeCyclistMarker(lat, lon) {
    if (!cyclistMarker) {
      const markerEl = document.createElement('div');
      markerEl.style.width = '16px';
      markerEl.style.height = '16px';
      markerEl.style.backgroundColor = 'orange';
      markerEl.style.border = '2px solid black';
      markerEl.style.borderRadius = '50%'; // Hace que sea círculo
      markerEl.style.boxSizing = 'border-box'; // Para que el borde no aumente el tamaño
  
      cyclistMarker = new maplibregl.Marker({
        element: markerEl
      }).setLngLat([lon, lat]).addTo(map);
    } else {
      cyclistMarker.setLngLat([lon, lat]);
    }
  }
  

function moveCyclist(progress) {
  const i = Math.floor(progress * (trackData.length - 1));
  placeCyclistMarker(trackData[i].lat, trackData[i].lon);
}

function getMinMax(property) {
  const values = trackData.map((p) => p[property]).filter((v) => !isNaN(v));
  return { min: Math.min(...values), max: Math.max(...values) };
}
