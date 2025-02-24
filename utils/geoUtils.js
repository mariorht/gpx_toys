export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }


export function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
    const θ = Math.atan2(y, x);
    const bearing = ((θ * 180) / Math.PI + 360) % 360;
    return bearing;
  }


export function offsetPosition(lat, lon, bearing, distance) {
    const R = 6371e3; // Radio terrestre en metros
    const δ = distance / R; // Distancia angular
    const θ = (bearing * Math.PI) / 180;
  
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lon * Math.PI) / 180;
  
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) +
        Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
  
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      );
  
    return {
      lat: (φ2 * 180) / Math.PI,
      lon: (λ2 * 180) / Math.PI
    };
  }


export function decimatePoints(points, minDistanceMeters = 5) {
    if (points.length < 2) return points;
  
    const decimated = [points[0]]; // Siempre mantenemos el primer punto
  
    for (let i = 1; i < points.length; i++) {
      const prev = decimated[decimated.length - 1];
      const curr = points[i];
  
      const distance = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      if (distance >= minDistanceMeters) {
        decimated.push(curr);
      }
    }
  
    return decimated;
  }

//todo: que reciba solo la lista de bearings
  export function smoothBearingsCircular(trackData, windowSize = 5) {
    const halfWindow = Math.floor(windowSize / 2);
    const smoothedBearings = [];
  
    for (let i = 0; i < trackData.length; i++) {
      let sumSin = 0;
      let sumCos = 0;
      let count = 0;
  
      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        if (j >= 0 && j < trackData.length) {
          const angle = (trackData[j].bearing * Math.PI) / 180;
          sumSin += Math.sin(angle);
          sumCos += Math.cos(angle);
          count++;
        }
      }
  
      const avgAngle = Math.atan2(sumSin / count, sumCos / count);
      const avgBearing = (avgAngle * 180) / Math.PI;
      smoothedBearings.push((avgBearing + 360) % 360); // Normalizar entre 0 y 360
    }
  
    for (let i = 0; i < trackData.length; i++) {
      trackData[i].bearing = smoothedBearings[i];
    }
  }
  


  export function calculateTotalDistance(trackData) {
    if (trackData.length < 2) return 0;
  
    let totalDistance = 0;
  
    for (let i = 1; i < trackData.length; i++) {
        const prev = trackData[i - 1];
        const curr = trackData[i];
  
        totalDistance += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    }
  
    return totalDistance / 1000; // Convertir a km
  }
  