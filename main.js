const fileInput = document.getElementById("gpxFileInput");

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const gpxText = e.target.result;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "application/xml");

    const trackPoints = Array.from(xmlDoc.getElementsByTagName("trkpt"));
    if (trackPoints.length === 0) {
      alert("No se encontraron puntos de track en el archivo GPX.");
      return;
    }

    const elevations = [];
    const distances = [];
    let accumulatedDistance = 0;

    trackPoints.forEach((point, index) => {
      const lat = parseFloat(point.getAttribute("lat"));
      const lon = parseFloat(point.getAttribute("lon"));
      const ele = parseFloat(point.getElementsByTagName("ele")[0].textContent);

      elevations.push(ele);

      if (index > 0) {
        const prevPoint = trackPoints[index - 1];
        const prevLat = parseFloat(prevPoint.getAttribute("lat"));
        const prevLon = parseFloat(prevPoint.getAttribute("lon"));

        const distance = haversineDistance(prevLat, prevLon, lat, lon);
        accumulatedDistance += distance;
      }

      distances.push(accumulatedDistance / 1000); // en km
    });

    drawElevationChart(distances, elevations);
  };
  reader.readAsText(file);
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const delta_phi = ((lat2 - lat1) * Math.PI) / 180;
  const delta_lambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(delta_phi / 2) * Math.sin(delta_phi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(delta_lambda / 2) * Math.sin(delta_lambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distancia en metros
}

function drawElevationChart(distances, elevations) {
  d3.select("#chart").selectAll("*").remove();

  const width = 800;
  const height = 300;
  const margin = { top: 20, right: 30, bottom: 30, left: 50 };

  const xScale = d3
    .scaleLinear()
    .domain([distances[0], distances[distances.length - 1]])
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleLinear()
    .domain([d3.min(elevations), d3.max(elevations)])
    .range([height - margin.bottom, margin.top]);

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg
    .append("path")
    .datum(elevations)
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.3)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr(
      "d",
      d3
        .area()
        .x((_, i) => xScale(distances[i]))
        .y0(yScale(d3.min(elevations)))
        .y1((d) => yScale(d))
    );

  // Eje X (distancia en km)
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(10)
        .tickFormat((d) => `${d.toFixed(1)} km`)
    );

  // Eje Y (elevación en m)
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(8).tickFormat((d) => `${d} m`));
}
