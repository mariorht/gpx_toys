let map;
let trackData = []; // Guardará puntos con lat, lon, ele, slope, speed

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

        // Extraer puntos (lat, lon, ele, time)
        const pointsData = trackPoints.map((point) => {
          const lat = parseFloat(point.getAttribute('lat'));
          const lon = parseFloat(point.getAttribute('lon'));
          const ele = parseFloat(
            point.getElementsByTagName('ele')[0].textContent
          );
          const timeNode = point.getElementsByTagName('time')[0];
          const time = timeNode ? new Date(timeNode.textContent).getTime() : null;
          return { lat, lon, ele, time };
        });

        
        // Calcular slope y speed
        trackData = pointsData.map((point, index) => {
          let slope = 0;
          let speed = 0;

          if (index > 0) {
            const prev = pointsData[index - 1];
            const distance = haversineDistance(
              prev.lat,
              prev.lon,
              point.lat,
              point.lon
            );
            const elevationDiff = point.ele - prev.ele;
            slope = distance > 0 ? elevationDiff / distance : 0;

            if (point.time && prev.time) {
              const timeDiff = (point.time - prev.time) / 1000; // segundos
              speed = timeDiff > 0 ? (distance / timeDiff) : 0; // m/s
            }
          }

          return { ...point, slope, speed };
        });


        // Dibujar el track inicial
        drawTrack();

        // Ajustar mapa a track
        const bounds = new maplibregl.LngLatBounds();
        trackData.forEach((p) => bounds.extend([p.lon, p.lat]));
        if (trackData.length > 0) {
          map.fitBounds(bounds, { padding: 50 });
        }
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

  document
    .getElementById('fixedColorPicker')
    .addEventListener('input', drawTrack);
}

// Calcular distancia 2D
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

// Dibujar track con el modo seleccionado
function drawTrack() {
  if (trackData.length < 2) return;

  const mode = document.getElementById('colorMode').value;
  const fixedColor = document.getElementById('fixedColorPicker').value;

  const segments = [];
  for (let i = 0; i < trackData.length - 1; i++) {
    segments.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [trackData[i].lon, trackData[i].lat],
          [trackData[i + 1].lon, trackData[i + 1].lat]
        ]
      },
      properties: {
        slope: trackData[i].slope,
        elevation: trackData[i].ele,
        speed: trackData[i].speed
      }
    });
  }

  if (map.getSource('gpx-track')) {
    map.removeLayer('gpx-track-line');
    map.removeSource('gpx-track');
  }

  map.addSource('gpx-track', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: segments
    }
  });

  const colorProperty = {
    slope: 'slope',
    elevation: 'elevation',
    speed: 'speed'
  }[mode];

  if (mode === 'fixed') {
    colorPaint = fixedColor;
  } else {
    const { min, max } = getMinMax(colorProperty);
    console.log(`Min ${colorProperty}: ${min}, Max ${colorProperty}: ${max}`);
  
    // Si min y max son iguales (track plano o constante), evitamos problemas
    if (min === max) {
      colorPaint = fixedColor;
    } else {
      colorPaint = [
        'interpolate',
        ['linear'],
        ['get', colorProperty],
        min, '#00ff00', // Verde en mínimo
        (min + max) / 2, '#ffff00', // Amarillo en valor medio
        max, '#ff0000' // Rojo en máximo
      ];
    }
  }
  

  map.addLayer({
    id: 'gpx-track-line',
    type: 'line',
    source: 'gpx-track',
    layout: {},
    paint: {
      'line-width': 4,
      'line-color': colorPaint
    }
  });
}


function getMinMax(property) {
  const source = map.getSource('gpx-track');
  if (!source) return { min: NaN, max: NaN };

  const features = source._data.features;
  const values = features.map((f) => f.properties[property]).filter((v) => !isNaN(v));

  if (values.length === 0) return { min: NaN, max: NaN };

  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max };
}
