let map;
let trackData = [];
let cyclistMarker;

let selectedResolution = { width: 1280, height: 720 };

initMap([-5.904324, 43.544351]); // Avilés


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
            'https://tiles.stadiamaps.com/tiles/stamen-terrain/{z}/{x}/{y}.png'
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

  class MapLayerControl {
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
        drawTrack();
        if (trackData.length > 0) {
          const { lon, lat } = trackData[0];
          drawCyclistPoint(lon, lat);
        }
      });
    }
  }

  map.addControl(new MapLayerControl(), 'top-right');
  map.addControl(new maplibregl.NavigationControl());
  map.addControl(
    new maplibregl.TerrainControl({
      source: 'terrainSource',
      exaggeration: 1.5
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
          let bearing = 0;
          if (index > 0) {
            const prev = pointsData[index - 1];
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
        smoothBearingsCircular(50);
        drawTrack();
        drawCyclistPoint(trackData[0].lat, trackData[0].lon);

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
        currentProgress += 0.05;
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

function drawCyclistPoint(lon, lat) {
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
  
  

function moveCyclist(progress) {
  const index = Math.floor(progress * (trackData.length - 1));
  const point = trackData[index];

  drawCyclistPoint(point.lon, point.lat);

  if (index < trackData.length - 1) {
    const nextPoint = trackData[index + 1];

    const cameraDistance = 0.0005; // Más cerca (~5 metros aprox)
    const cameraOffset = offsetPosition(point.lat, point.lon, point.bearing + 180, cameraDistance);

    map.easeTo({
      center: [cameraOffset.lon, cameraOffset.lat],
      zoom: 15,
      bearing: point.bearing,
      pitch: 60,
      duration: 100
    });
  }
}

function smoothBearingsCircular(windowSize = 5) {
    const halfWindow = Math.floor(windowSize / 2);
    const smoothedBearings = [];
  
    for (let i = 0; i < trackData.length; i++) {
      let sumSin = 0;
      let sumCos = 0;
      let count = 0;
  
      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        if (j >= 0 && j < trackData.length) {
          const angle = (trackData[j].bearing * Math.PI) / 180;
          sumSin += Math.sin(angle);
          sumCos += Math.cos(angle);
          count++;
        }
      }
  
      const avgAngle = Math.atan2(sumSin / count, sumCos / count);
      const avgBearing = (avgAngle * 180) / Math.PI;
      smoothedBearings.push((avgBearing + 360) % 360); // Normalizar entre 0 y 360
    }
  
    for (let i = 0; i < trackData.length; i++) {
      trackData[i].bearing = smoothedBearings[i];
    }
  }
  
  

function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
    const θ = Math.atan2(y, x);
    const bearing = ((θ * 180) / Math.PI + 360) % 360;
    return bearing;
  }

  function offsetPosition(lat, lon, bearing, distance) {
    const R = 6371e3; // Radio terrestre en metros
    const δ = distance / R; // Distancia angular
    const θ = (bearing * Math.PI) / 180;
  
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lon * Math.PI) / 180;
  
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) +
        Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
  
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      );
  
    return {
      lat: (φ2 * 180) / Math.PI,
      lon: (λ2 * 180) / Math.PI
    };
  }
  
  

    

function getMinMax(property) {
  const values = trackData.map((p) => p[property]).filter((v) => !isNaN(v));
  return { min: Math.min(...values), max: Math.max(...values) };
}




document.getElementById('recordButton').addEventListener('click', () => {
  document.getElementById('resolutionModal').style.display = 'flex';
});

document.querySelectorAll('.resolutionOption').forEach(button => {
  button.addEventListener('click', () => {
    selectedResolution.width = parseInt(button.dataset.width);
    selectedResolution.height = parseInt(button.dataset.height);
    document.getElementById('resolutionModal').style.display = 'none';
    recordTrackAnimation();
  });
});

document.getElementById('customResolutionBtn').addEventListener('click', () => {
  document.getElementById('customResolutionInputs').style.display = 'block';
});

document.getElementById('confirmCustomResolution').addEventListener('click', () => {
  const customWidth = parseInt(document.getElementById('customWidth').value);
  const customHeight = parseInt(document.getElementById('customHeight').value);

  if (customWidth > 0 && customHeight > 0) {
    selectedResolution.width = customWidth;
    selectedResolution.height = customHeight;
    document.getElementById('resolutionModal').style.display = 'none';
    recordTrackAnimation();
  } else {
    alert('Introduce una resolución válida');
  }
});


function recordTrackAnimation() {
  if (trackData.length < 2) {
    console.error('No hay track cargado');
    return;
  }

  let FPS = 30;
  const originalWidth = map._container.clientWidth;
  const originalHeight = map._container.clientHeight;
  const originalPosition = map._container.style.position;
  const originalTop = map._container.style.top;
  const originalLeft = map._container.style.left;

  // Redimensionar y centrar el canvas del mapa
  map._container.style.width = `${selectedResolution.width}px`;
  map._container.style.height = `${selectedResolution.height}px`;
  map._container.style.position = 'fixed';
  map._container.style.top = '50%';
  map._container.style.left = '50%';
  map._container.style.transform = 'translate(-50%, -50%)';
  map.resize();

  const canvas = map.getCanvas();

  const stream = canvas.captureStream(FPS);
  const options = {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 10 * 1024 * 1024 // 10 Mbps
  };

  const recorder = new MediaRecorder(stream, options);

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'track_animation.webm';
    a.click();
    cleanup();
  };

  let currentFrame = 0;
  const durationMs = 60000; // 60 segundos
  const totalFrames = FPS * durationMs / 1000;
  const intervalMs = durationMs / totalFrames;

  const recordingModal = document.getElementById('recordingModal');
  const recordingProgressBar = document.getElementById('recordingProgressBar');
  const cancelRecordingButton = document.getElementById('cancelRecordingButton');

  recordingModal.style.display = 'flex';
  recordingProgressBar.value = 0;

  let cancelRequested = false;

  function cancelRecording() {
    cancelRequested = true;
    recorder.stop();
  }

  cancelRecordingButton.onclick = cancelRecording;

  recorder.start();

  function animateFrame() {
    if (cancelRequested) {
      cleanup();
      return;
    }

    const progress = currentFrame / (totalFrames - 1);
    moveCyclist(progress);

    map.triggerRepaint();

    currentFrame++;
    recordingProgressBar.value = (currentFrame / totalFrames) * 100;

    if (currentFrame < totalFrames) {
      setTimeout(animateFrame, intervalMs);
    } else {
      recorder.stop();
    }
  }

  function cleanup() {
    recordingModal.style.display = 'none';
    map._container.style.width = `${originalWidth}px`;
    map._container.style.height = `${originalHeight}px`;
    map._container.style.position = originalPosition;
    map._container.style.top = originalTop;
    map._container.style.left = originalLeft;
    map._container.style.transform = 'none';
    map.resize();
  }

  animateFrame();
}
  