import { initMap } from './map/mapInitializer.js';
import { setupGPXFileInput } from './utils/gpxParser.js';
import { setupExportButtons } from './utils/mediaExport.js';
import { drawTrack, moveCyclist } from './map/trackRenderer.js';

let map;
let trackData = [];
let fileName = '';

let animationInterval = null; 
let isPlaying = false;

let selectedResolution = { width: 1280, height: 720 };

document.addEventListener('DOMContentLoaded', () => {
  const initialCoords = [-5.904324, 43.544351];
  map = initMap(initialCoords);

  setupGPXFileInput(map, (data, loadedFileName) => {
    trackData = data;
    fileName = loadedFileName;
    console.log(`Track cargado con ${trackData.length} puntos desde ${fileName}`);
    document.getElementById('trackControls').style.display = 'block';
  });


  setupExportButtons(map, () => trackData, () => fileName, () => selectedResolution);


 // Select para cambiar modo de color
 document.getElementById('colorMode').addEventListener('change', () => {
  if (trackData.length > 0) {
    drawTrack(map, trackData);
  }
});

// Color fijo
document.getElementById('fixedColorPicker').addEventListener('input', () => {
  if (trackData.length > 0) {
    drawTrack(map, trackData);
  }
});

// 🏃‍♂️ Barra de progreso manual
const progressBar = document.getElementById('progressBar');
progressBar.addEventListener('input', (e) => {
  const progress = parseFloat(e.target.value) / 100;
  if (trackData.length > 0) {
    moveCyclist(map, trackData, progress);
  }
});

// ▶️ Botón de Play / Pause
const playButton = document.getElementById('playButton');
playButton.addEventListener('click', () => {
  if (!trackData.length) return;

  if (isPlaying) {
    clearInterval(animationInterval);
    animationInterval = null;
    isPlaying = false;
    playButton.textContent = 'Play';
  } else {
    let currentProgress = parseFloat(progressBar.value);

    animationInterval = setInterval(() => {
      currentProgress += 0.05;
      if (currentProgress > 100) {
        currentProgress = 0;
      }
      progressBar.value = currentProgress;
      moveCyclist(map, trackData, currentProgress / 100);
    }, 30);

    isPlaying = true;
    playButton.textContent = 'Pause';
  }
});
});