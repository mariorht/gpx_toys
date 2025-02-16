import { getTimestamp } from './helpers.js';
import { moveCyclist } from '../map/trackRenderer.js';

export function setupExportButtons(map, getTrackData, getFileName, getSelectedResolution) {
  let isRecordingVideo = false;

  document.getElementById('recordButton').addEventListener('click', () => {
    isRecordingVideo = true;
    document.getElementById('videoDurationContainer').style.display = 'block'; // Mostrar duración solo en video
    document.getElementById('resolutionModal').style.display = 'flex';
  });

  document.getElementById('exportImageButton').addEventListener('click', () => {
    isRecordingVideo = false;
    document.getElementById('videoDurationContainer').style.display = 'none'; // Ocultar duración en imagen
    document.getElementById('resolutionModal').style.display = 'flex';
  });

  // Cuando eliges resolución en el modal:
  document.querySelectorAll('.resolutionOption').forEach(button => {
    button.addEventListener('click', () => {
      const selectedResolution = getSelectedResolution();
      selectedResolution.width = parseInt(button.dataset.width);
      selectedResolution.height = parseInt(button.dataset.height);
      document.getElementById('resolutionModal').style.display = 'none';

      const trackData = getTrackData();
      const fileName = getFileName();

      if (trackData.length < 2) {
        console.error('No hay track cargado');
        return;
      }

      if (isRecordingVideo) {
        recordTrackAnimation(map, trackData, fileName, selectedResolution);
      } else {
        exportMapImage(map, trackData, fileName, selectedResolution);
      }
    });
  });

  // Resolución personalizada
  document.getElementById('customResolutionBtn').addEventListener('click', () => {
    document.getElementById('customResolutionInputs').style.display = 'block';
  });

  document.getElementById('confirmCustomResolution').addEventListener('click', () => {
    const selectedResolution = getSelectedResolution();
    const customWidth = parseInt(document.getElementById('customWidth').value);
    const customHeight = parseInt(document.getElementById('customHeight').value);

    if (customWidth > 0 && customHeight > 0) {
      selectedResolution.width = customWidth;
      selectedResolution.height = customHeight;
      document.getElementById('resolutionModal').style.display = 'none';

      const trackData = getTrackData();
      const fileName = getFileName();

      if (trackData.length < 2) {
        console.error('No hay track cargado');
        return;
      }

      if (isRecordingVideo) {
        recordTrackAnimation(map, trackData, fileName, selectedResolution);
      } else {
        exportMapImage(map, trackData, fileName, selectedResolution);
      }
    } else {
      alert('Introduce una resolución válida');
    }
  });

  document.getElementById('cancelResolutionModal').addEventListener('click', () => {
    document.getElementById('resolutionModal').style.display = 'none';
  });
}


function exportMapImage(map, trackData, gpxFileName, selectedResolution) {
        if (trackData.length < 2) {
          console.error('No hay track cargado');
          return;
        }
      
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
      
        // Centrar el mapa en el track tras el resize
        const bounds = new maplibregl.LngLatBounds();
        trackData.forEach((p) => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 50, animate: false });
        
      
        const recordingModal = document.getElementById('recordingModal');
        const recordingProgressBar = document.getElementById('recordingProgressBar');
        const cancelRecordingButton = document.getElementById('cancelRecordingButton');
      
        recordingModal.style.display = 'flex';
        recordingProgressBar.value = 0;
        cancelRecordingButton.style.display = 'none'; // Ocultamos el cancelar en foto
      
        // Esperar a que el mapa termine de redibujar tras el resize
        map.once('idle', () => {
          try {
            const canvas = map.getCanvas();
            canvas.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${gpxFileName}_${getTimestamp()}.png`;
              a.click();
              cleanup();
            }, 'image/png');
          } catch (error) {
            console.error('Error al exportar imagen:', error);
            cleanup();
          }
        });
      
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
      }

function recordTrackAnimation(map, trackData, gpxFileName, selectedResolution) {
        if (trackData.length < 2) {
          console.error('No hay track cargado');
          return;
        }
      
        let FPS = 30;
        const videoDuration = parseInt(document.getElementById('videoDuration').value) || 60;
      
      
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
          a.download = `${gpxFileName}_${getTimestamp()}.webm`;
          a.click();
          cleanup();
        };
      
        let currentFrame = 0;
        const durationMs = videoDuration * 1000; // Duración personalizada
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
          moveCyclist(map, trackData, progress);
      
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
        
