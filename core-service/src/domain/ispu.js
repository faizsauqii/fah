const CONCENTRATION_LIMITS = Object.freeze({
  pm25: [15.5, 55.4, 150.4, 250.4, 500],
  pm10: [50, 150, 350, 420, 500],
});

const ISPU_LIMITS = [0, 50, 100, 200, 300, 500];

export const ISPU_CATEGORIES = Object.freeze({
  BAIK: 'Baik',
  SEDANG: 'Sedang',
  TIDAK_SEHAT: 'Tidak Sehat',
  SANGAT_TIDAK_SEHAT: 'Sangat Tidak Sehat',
  BERBAHAYA: 'Berbahaya',
});

export function computeIspu(parameter, concentration) {
  const limits = CONCENTRATION_LIMITS[parameter];
  if (!limits) throw new Error(`Parameter ISPU tidak dikenal: ${parameter}`);
  if (typeof concentration !== 'number' || !Number.isFinite(concentration) || concentration < 0) {
    return null;
  }

  let lowerConcentration = 0;
  for (let i = 0; i < limits.length; i += 1) {
    const upperConcentration = limits[i];
    const lastSegment = i === limits.length - 1;
    if (concentration <= upperConcentration || lastSegment) {
      const lowerIspu = ISPU_LIMITS[i];
      const upperIspu = ISPU_LIMITS[i + 1];
      const value =
        ((upperIspu - lowerIspu) / (upperConcentration - lowerConcentration)) *
          (concentration - lowerConcentration) +
        lowerIspu;
      return Math.round(value);
    }
    lowerConcentration = upperConcentration;
  }
  return null;
}

export function ispuCategory(value) {
  if (value === null || value === undefined) return null;
  if (value <= 50) return 'BAIK';
  if (value <= 100) return 'SEDANG';
  if (value <= 200) return 'TIDAK_SEHAT';
  if (value <= 300) return 'SANGAT_TIDAK_SEHAT';
  return 'BERBAHAYA';
}

export function assessAirQuality({ pm25, pm10 }) {
  const ispuPm25 = computeIspu('pm25', pm25);
  const ispuPm10 = computeIspu('pm10', pm10);
  if (ispuPm25 === null || ispuPm10 === null) return null;

  const critical = ispuPm25 >= ispuPm10 ? 'pm25' : 'pm10';
  const value = Math.max(ispuPm25, ispuPm10);
  const category = ispuCategory(value);
  return {
    ispu: value,
    category,
    categoryLabel: ISPU_CATEGORIES[category],
    criticalParameter: critical,
    ispuPm25,
    ispuPm10,
  };
}
