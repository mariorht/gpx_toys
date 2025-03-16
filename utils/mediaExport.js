import { getTimestamp } from './helpers.js';
import { moveCyclist } from '../map/trackRenderer.js';
import { calculateTotalDistance } from './geoUtils.js';

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
        
      
        // 🚀 *** NO mostrar el recordingModal cuando exportamos imagen ***
        const recordingModal = document.getElementById("recordingModal");
        if (recordingModal) {
            recordingModal.style.display = "none";
        }
      
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
      console.error("No hay track cargado");
      return;
  }

  let FPS = 30;
  const videoDuration = parseInt(document.getElementById("videoDuration").value) || 60;

  const originalWidth = map._container.clientWidth;
  const originalHeight = map._container.clientHeight;
  const originalPosition = map._container.style.position;
  const originalTop = map._container.style.top;
  const originalLeft = map._container.style.left;

  // Redimensionar y centrar el canvas del mapa
  map._container.style.width = `${selectedResolution.width}px`;
  map._container.style.height = `${selectedResolution.height}px`;
  map._container.style.position = "fixed";
  map._container.style.top = "50%";
  map._container.style.left = "50%";
  map._container.style.transform = "translate(-50%, -50%)";
  map.resize();

  const canvas = map.getCanvas();
  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });

  const chunks = [];
  recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
  };

  let cancelRequested = false; // 🔥 Controlar cancelación

  // Obtener elementos del DOM
  const recordingModal = document.getElementById("recordingModal");
  const recordingStatus = document.getElementById("recordingStatus");
  const recordingProgressBar = document.getElementById("recordingProgressBar");
  const cancelRecordingButton = document.getElementById("cancelRecordingButton");
  const videoPreview = document.getElementById("videoPreview");
  const saveVideoButton = document.getElementById("saveVideoButton");
  const closeModalButton = document.getElementById("closeModalButton");
  const uploadToYouTubeButton = document.getElementById("uploadYouTubeButton");

  // Mostrar el modal y los controles de grabación
  recordingModal.style.display = "flex";
  recordingStatus.style.display = "block"; // 🔄 Asegurar que se muestre
  recordingProgressBar.style.display = "block"; // 🔄 Hacer visible la barra de progreso
  recordingProgressBar.value = 0;
  cancelRecordingButton.style.display = "block";
  videoPreview.style.display = "none";
  saveVideoButton.style.display = "none";
  closeModalButton.style.display = "none";


  // 🎯 Evento de cancelar
  cancelRecordingButton.onclick = () => {
      cancelRequested = true;
      recorder.stop(); // ⚠ Detener la grabación
      cleanup(); // Limpiar estado
  };

  recorder.onstop = () => {
      if (!cancelRequested) {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);

          // 📹 Mostrar el vídeo en el reproductor
          videoPreview.src = url;
          videoPreview.style.display = "block";

          // 💾 Mostrar el botón de guardar
          saveVideoButton.style.display = "block";
          saveVideoButton.onclick = () => {
              const a = document.createElement("a");
              a.href = url;
              a.download = `${gpxFileName}.webm`;
              a.click();
          };

          // 📤 Mostrar el botón para subir a YouTube
          uploadYouTubeButton.style.display = "block";
          uploadYouTubeButton.onclick = () => showUploadModal(blob, gpxFileName, trackData);


          // ❌ Mostrar botón de cerrar modal
          closeModalButton.style.display = "block";
          closeModalButton.onclick = () => {
              recordingModal.style.display = "none";
          };

          // 🔄 Ocultar barra de progreso y estado de grabación
          recordingStatus.style.display = "none";
      } 
      cleanup();
      
  };

  let currentFrame = 0;
  const totalFrames = FPS * videoDuration;
  const intervalMs = (videoDuration * 1000) / totalFrames;

  function animateFrame() {
      if (cancelRequested) {
          cleanup();
          return;
      }

      const progress = currentFrame / totalFrames;
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
    // 🔄 Restaurar tamaño del mapa siempre
    map._container.style.width = `${originalWidth}px`;
    map._container.style.height = `${originalHeight}px`;
    map._container.style.position = originalPosition;
    map._container.style.top = originalTop;
    map._container.style.left = originalLeft;
    map._container.style.transform = "none";
    map.resize();

    // 🔄 Ocultar la barra de progreso y estado de grabación
    recordingStatus.style.display = "none"; 
    cancelRecordingButton.style.display = "none";
    recordingProgressBar.style.display = "none";

    if (cancelRequested) {
        // 🔄 Si se canceló, ocultar todo
        recordingModal.style.display = "none";
        videoPreview.style.display = "none"; 
        saveVideoButton.style.display = "none";
        closeModalButton.style.display = "none";
        uploadToYouTubeButton.style.display = "none";

    }
}


  recorder.start();
  animateFrame();
}




async function uploadVideoToYouTube(accessToken, videoBlob, trackData) {
  try {
      const formattedTimestamp = getTimestamp();

      const title = document.getElementById("videoTitle").value;
      const videoTitle = `${title} - ${formattedTimestamp}`;

      const startTime = new Date(trackData[0].time).toLocaleString();
      const endTime = new Date(trackData[trackData.length - 1].time).toLocaleString();
      const totalDistance = calculateTotalDistance(trackData).toFixed(2);
      const duration = ((trackData[trackData.length - 1].time - trackData[0].time) / 1000 / 60).toFixed(1);

      const videoDescription = `Ruta GPX - ${title}

      📅 Fecha: ${formattedTimestamp}
      🕒 Inicio: ${startTime}
      🏁 Fin: ${endTime}
      📏 Distancia total: ${totalDistance} km
      ⏳ Duración: ${duration} min

      🎥 Animación generada automáticamente con GPX Toys (https://mariorht.github.io/gpx_toys/)`;

      // Mostrar mensaje de estado mientras sube
      const uploadStatus = document.getElementById("uploadStatus");
      uploadStatus.innerHTML = `<p>📤 Subiendo vídeo a YouTube... Por favor, espera.</p>`;
      uploadStatus.style.display = "block";

      // Crear el archivo de vídeo
      const formData = new FormData();
      formData.append(
          "metadata",
          new Blob(
              [JSON.stringify({
                  snippet: {
                      title: videoTitle,
                      description: videoDescription,
                      tags: ["GPX", "Animación", "Mapa"],
                      categoryId: "17",
                  },
                  status: {
                      privacyStatus: "unlisted",
                  },
              })],
              { type: "application/json" }
          )
      );
      formData.append("video", videoBlob);

      // Subir a YouTube con el token de acceso
      const response = await fetch(
          "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
          {
              method: "POST",
              headers: {
                  Authorization: `Bearer ${accessToken}`,
              },
              body: formData,
          }
      );

      if (!response.ok) throw new Error("Error al subir el vídeo");

      const result = await response.json();
      console.log("✅ Vídeo subido con éxito:", result);

      const videoId = result.id;

      // Mostrar el enlace del vídeo y permitir cerrar
      uploadStatus.innerHTML = `
          <p>✅ Vídeo subido con éxito:</p>
          <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">📺 Ver en YouTube</a>
      `;


  } catch (error) {
      console.error("🚨 Error al subir a YouTube:", error);
      // Mostrar el enlace del vídeo y permitir cerrar
      uploadStatus.innerHTML = `
          <p>🚨 Error al subir el vídeo:</p>
      `;  }
}


function showUploadModal(videoBlob, fileName, trackData) {
  document.getElementById("recordingModal").style.display = "none";
  const uploadModal = document.getElementById("uploadModal");
  uploadModal.style.display = "block";

  document.getElementById("videoTitle").value = fileName;

  document.getElementById("cancelUpload").onclick = () => {
      uploadModal.style.display = "none";
  };

  document.getElementById("confirmUpload").onclick = () => {
      authenticateAndUpload(videoBlob, trackData);
  };


}



function authenticateAndUpload(videoBlob, trackData) {
  const CLIENT_ID = "832072877207-bf2fkssg691sl8ghs5965a8vmccatd01.apps.googleusercontent.com";
  const SCOPES = "https://www.googleapis.com/auth/youtube.upload";

  google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
          if (response.error) {
              console.error("🚨 Error de autenticación:", response);
              alert("No se pudo autenticar con YouTube.");
              return;
          }
          uploadVideoToYouTube(response.access_token, videoBlob, trackData);
      },
  }).requestAccessToken();
}
