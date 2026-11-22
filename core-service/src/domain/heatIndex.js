export const celsiusToFahrenheit = (c) => (c * 9) / 5 + 32;
export const fahrenheitToCelsius = (f) => ((f - 32) * 5) / 9;

export function heatIndexFahrenheit(temperatureF, relativeHumidity) {
  const t = temperatureF;
  const rh = relativeHumidity;

  const simple = 0.5 * (t + 61.0 + (t - 68.0) * 1.2 + rh * 0.094);
  const averaged = (simple + t) / 2;
  if (averaged < 80) return averaged;

  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    0.00683783 * t * t -
    0.05481717 * rh * rh +
    0.00122874 * t * t * rh +
    0.00085282 * t * rh * rh -
    0.00000199 * t * t * rh * rh;

  if (rh < 13 && t >= 80 && t <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  } else if (rh > 85 && t >= 80 && t <= 87) {
    hi += ((rh - 85) / 10) * ((87 - t) / 5);
  }
  return hi;
}

export function heatCategory(heatIndexF) {
  if (heatIndexF < 80) return 'NORMAL';
  if (heatIndexF < 90) return 'CAUTION';
  if (heatIndexF < 103) return 'EXTREME_CAUTION';
  if (heatIndexF < 125) return 'DANGER';
  return 'EXTREME_DANGER';
}

export function assessHeat({ temperature, humidity }) {
  if (
    typeof temperature !== 'number' ||
    typeof humidity !== 'number' ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(humidity)
  ) {
    return null;
  }
  const hiF = heatIndexFahrenheit(celsiusToFahrenheit(temperature), humidity);
  return {
    heatIndex: Math.round(fahrenheitToCelsius(hiF) * 10) / 10,
    category: heatCategory(hiF),
  };
}
