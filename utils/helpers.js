export function getMinMax(values) {
    const filteredValues = values.filter(v => typeof v === 'number' && isFinite(v));
  
    if (filteredValues.length === 0) {
      console.warn(`getMinMax(): No hay valores numéricos válidos en el array`);
      return { min: 0, max: 0 };
    }
  
    return {
      min: Math.min(...filteredValues),
      max: Math.max(...filteredValues)
    };
  }
  

export function getTimestamp() {
  return new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
}
