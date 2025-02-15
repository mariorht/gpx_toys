initMap([-5.84, 43.36]); // Avilés

function initMap(centerCoords) {
  const map = new maplibregl.Map({
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

  map.addControl(
    new maplibregl.NavigationControl({
      visualizePitch: true,
      showZoom: true,
      showCompass: true
    })
  );

  map.addControl(
    new maplibregl.TerrainControl({
      source: 'terrainSource',
      exaggeration: 1
    })
  );

  // Escuchar archivo GPX
  const gpxInput = document.getElementById('gpxFileInput');
  gpxInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const gpxText = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, 'application/xml');
        const trackPoints = Array.from(xmlDoc.getElementsByTagName('trkpt'));

        const coordinatesWithEle = trackPoints.map((point) => ({
          lon: parseFloat(point.getAttribute('lon')),
          lat: parseFloat(point.getAttribute('lat')),
          ele: parseFloat(point.getElementsByTagName('ele')[0].textContent)
        }));

        // Calcular pendiente por segmento
        const segments = [];
        for (let i = 0; i < coordinatesWithEle.length - 1; i++) {
          const p1 = coordinatesWithEle[i];
          const p2 = coordinatesWithEle[i + 1];

          const distance2D = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
          const elevationDiff = p2.ele - p1.ele;
          const slope = elevationDiff / distance2D; // pendiente = desnivel / distancia

          segments.push({
            coords: [[p1.lon, p1.lat], [p2.lon, p2.lat]],
            slope: slope
          });
        }

        if (map.getSource('gpx-track')) {
          map.removeLayer('gpx-track-line');
          map.removeSource('gpx-track');
        }

        const geojsonSegments = {
          type: 'FeatureCollection',
          features: segments.map((segment) => ({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: segment.coords
            },
            properties: {
              slope: segment.slope
            }
          }))
        };

        map.addSource('gpx-track', {
          type: 'geojson',
          data: geojsonSegments
        });

        map.addLayer({
          id: 'gpx-track-line',
          type: 'line',
          source: 'gpx-track',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-width': 4,
            'line-color': [
                'interpolate',
                ['linear'],
                ['get', 'slope'],
                -0.15, '#00ff00',  // Verde → Bajadas (> -15%)
                -0.03, '#aaff00',  // Verde claro → Bajadas suaves (~-3%)
                0, '#ffff00',      // Amarillo → Llano
                0.03, '#ffaa00',   // Naranja claro → Subida suave (~3%)
                0.1, '#ff5500',    // Naranja fuerte → Subida fuerte (~10%)
                0.15, '#ff0000'     // Rojo → Subida muy fuerte (>25%)
            ]
          }
        });

        // Ajustar el mapa al track
        const bounds = new maplibregl.LngLatBounds();
        coordinatesWithEle.forEach((p) => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 50 });
      };
      reader.readAsText(file);
    }
  });

  // Función para calcular distancia 2D entre dos puntos lat/lon
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // en metros
  }
}
