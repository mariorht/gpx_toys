# Proyecto de Visualización y Animación de Tracks GPX en MapLibre GL JS

Este proyecto permite visualizar y animar tracks GPX en un mapa 3D utilizando MapLibre GL JS. Además, es posible generar un vídeo MP4 con la animación del recorrido.

[https://mariorht.github.io/gpx_toys/](https://mariorht.github.io/gpx_toys/)

## Características
- Visualización de mapas satelitales con relieve 3D.
- Carga y visualización de archivos GPX.
- Personalización del color del track según:
  - Pendiente
  - Altitud
  - Velocidad
  - Color fijo
- Animación del recorrido con seguimiento de la cámara y suavizado de movimientos.
- Exportación de la animación como vídeo MP4 de alta calidad.

## Requisitos
- Navegador moderno con soporte para WebM y MediaRecorder.
- MapLibre GL JS (se carga desde CDN).

## Archivos
- `index.html`: Contiene la estructura HTML con los controles y el mapa.
- `main.js`: Implementa la lógica de carga del GPX, visualización, animación y grabación del vídeo.
- `style.css`: Estilos básicos para el mapa y los controles.


## Uso
1. Seleccionar un archivo GPX con el botón de carga.
2. Elegir el modo de color para el track.
3. Ajustar el color fijo si se selecciona esa opción.
4. Usar los controles de animación:
   - `Play/Pause` para iniciar/detener la animación.
   - Barra de progreso para avanzar manualmente.
5. Grabar la animación:
   - Presionar `Grabar Animación` para iniciar la grabación del vídeo.
   - El vídeo se descargará automáticamente al finalizar.

## Exportar MP4
El vídeo se guarda en formato `webm`. Para convertirlo a MP4:

```bash
ffmpeg -r 30 -i track_animation.webm -vf "scale=-1:720" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p track_animation_720p.mp4
```

Ajustar el valor de `crf` (0-51) según la calidad deseada (menor es mejor, pero mayor tamaño de archivo).


## Pendiente
- Suavizar movimiento de cámara
- Guardar directamente un mp4
- Resolver problemas con el cáculo de pendiente, velocidad y altitud


## Tecnologías
- MapLibre GL JS
- MediaRecorder API
- FFmpeg (opcional, para conversión a MP4)

