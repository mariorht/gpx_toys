export function setupSearchBox(map) {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const searchResults = document.getElementById("searchResults");
  
    // Función de búsqueda
    async function performSearch() {
      const query = searchInput.value.trim();
      if (query.length === 0) return;
  
      // 🔎 Hacer la búsqueda en Photon (Komoot)
      const response = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=5`);
      const data = await response.json();
  
      // 🛑 Si no hay resultados, mostrar mensaje
      if (!data.features.length) {
        searchResults.innerHTML = "<div class='search-item'>No se encontraron resultados</div>";
        searchResults.style.display = "block";
        return;
      }
  
      // 🎯 Mostrar los resultados con más información
      searchResults.innerHTML = data.features
        .map((place, index) => {
          const name = place.properties.name || "Ubicación desconocida";
          const country = place.properties.country || "Desconocido";
          const type = place.properties.type || "Otro";
  
          return `<div class="search-item" data-index="${index}">
            <strong>${name}</strong> <br> 
            <span class="search-meta">${type} - ${country}</span>
          </div>`;
        })
        .join("");
  
      searchResults.style.display = "block";
  
      // 🗺️ Al hacer clic en un resultado, mover el mapa
      document.querySelectorAll(".search-item").forEach(item => {
        item.addEventListener("click", () => {
          const index = item.dataset.index;
          const place = data.features[index];
          const [lon, lat] = place.geometry.coordinates;
  
          map.flyTo({
            center: [lon, lat],
            zoom: 14,
            essential: true
          });
  
          searchResults.style.display = "none"; // Ocultar resultados después de seleccionar
        });
      });
    }
  
    // 🎯 Ejecutar búsqueda al hacer clic en la lupa
    searchButton.addEventListener("click", performSearch);
  
    // 🔥 Ejecutar búsqueda al presionar "Enter"
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Evita que el formulario envíe datos
        performSearch();
      }
    });
  
    // Cerrar la lista si se hace clic fuera
    document.addEventListener("click", (e) => {
      if (!searchContainer.contains(e.target)) {
        searchResults.style.display = "none";
      }
    });
  }
  