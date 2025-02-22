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
- **Búsqueda de ubicaciones con Photon (Komoot)**: Permite buscar lugares y mover el mapa automáticamente a la ubicación seleccionada.


## Uso
1. Seleccionar un archivo GPX con el botón de carga.
2. Elegir el modo de color para el track.
3. Ajustar el color fijo si se selecciona esa opción.
4. Usar los controles de animación:
   - `Play/Pause` para iniciar/detener la animación.
   - Barra de progreso para avanzar manualmente.
5. Buscar ubicaciones:
   - Escribir en la barra de búsqueda y presionar `Enter` o el ícono de la lupa.
   - Seleccionar un resultado para mover el mapa automáticamente.
6. Grabar la animación:
   - Presionar `Grabar Animación` para iniciar la grabación del vídeo.
   - El vídeo se descargará automáticamente al finalizar.


## Pendiente
- A veces desaparece el círculo en la animación.

## Tecnologías
- [MapLibre GL JS](https://maplibre.org/)
- [Photon (Komoot) para búsqueda de ubicaciones](https://photon.komoot.io/)

