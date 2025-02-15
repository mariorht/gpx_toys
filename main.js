initMap([-5.844758, 43.360259]); // Avilés

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
        exaggeration: 1.5
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
      exaggeration: 1.5
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

        const coordinates = trackPoints.map((point) => [
          parseFloat(point.getAttribute('lon')),
          parseFloat(point.getAttribute('lat'))
        ]);

        if (map.getSource('gpx-track')) {
          map.removeLayer('gpx-track-line');
          map.removeSource('gpx-track');
        }

        map.addSource('gpx-track', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
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
            'line-color': '#ff0000',
            'line-width': 4
          }
        });

        // Ajustar el mapa al track
        const bounds = coordinates.reduce(
          (bounds, coord) => bounds.extend(coord),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
        );

        map.fitBounds(bounds, { padding: 50 });
      };
      reader.readAsText(file);
    }
  });
}
