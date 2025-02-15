let map;
let trackData = [];
let cyclistMarker;

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
      pitch: 70,
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




document.getElementById('recordButton').addEventListener('click', recordTrackAnimation);


function recordTrackAnimation() {
    if (trackData.length < 2) {
      console.error('No hay track cargado');
      return;
    }
  
    let FPS = 20;
    const canvas = map.getCanvas();
    const stream = canvas.captureStream(FPS);

    const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 10 * 1024 * 1024 // 50 Mbps
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
      progressBar.style.display = 'none'; // Ocultar la barra tras finalizar
    };
  
    let currentFrame = 0;
    const durationMs = 60000; // 60 segundos
    const totalFrames = FPS * durationMs/1000; // Más frames para fluidez
    const intervalMs = durationMs / totalFrames;
  

    const recordingProgressContainer = document.getElementById('recordingProgressContainer');
    const recordingProgressBar = document.getElementById('recordingProgressBar');
    
    recordingProgressContainer.style.display = 'block';
  
    recorder.start();
  
    function animateFrame() {
      const progress = currentFrame / (totalFrames - 1);
      moveCyclist(progress);
  
      // FORZAR REPAINT del mapa
      map.triggerRepaint();
  
      currentFrame++;
      recordingProgressBar.value = (currentFrame / totalFrames) * 100;
  
      if (currentFrame < totalFrames) {
        setTimeout(animateFrame, intervalMs);
      } else {
        recorder.stop();
        recordingProgressContainer.style.display = 'none'; // Ocultar la barra al finalizar
      }
    }
  
    animateFrame();
  }
  
  