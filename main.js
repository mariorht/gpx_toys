  initMap([-5.84, 43.36]); // Coordenadas de Avilés, Asturias, España

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
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 20,
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
            },
          terrainSource: {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            maxzoom: 14,
            encoding: 'terrarium' // IMPORTANTE para que interprete el Terrarium DEM
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
  }