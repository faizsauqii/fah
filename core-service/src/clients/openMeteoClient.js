import { errors } from '../errors.js';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 5;

const numberOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function createOpenMeteoClient({
  userAgent,
  timeoutMs = 5000,
  fetchImpl = fetch,
  airQualityUrl = AIR_QUALITY_URL,
  forecastUrl = FORECAST_URL,
  logger = console,
} = {}) {
  async function getJson(baseUrl, params) {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

    let response;
    try {
      response = await fetchImpl(url.toString(), {
        headers: { accept: 'application/json', ...(userAgent ? { 'user-agent': userAgent } : {}) },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      logger.error(`[core-service] Open-Meteo tidak bisa dihubungi: ${err.name}: ${err.message}`);
      throw errors.upstreamUnavailable();
    }

    let body;
    try {
      body = await response.json();
    } catch {
      logger.error(`[core-service] Open-Meteo menjawab HTTP ${response.status} dengan body bukan JSON`);
      throw errors.upstreamUnavailable();
    }

    if (!response.ok || body?.error) {
      logger.error(`[core-service] Open-Meteo menjawab HTTP ${response.status}: ${body?.reason ?? ''}`);
      throw errors.upstreamUnavailable();
    }
    return body;
  }

  async function getHourlyConditions(lat, lon) {
    const common = {
      latitude: lat,
      longitude: lon,
      timezone: 'auto',
      timeformat: 'unixtime',
      forecast_days: FORECAST_DAYS,
    };

    const [air, weather] = await Promise.all([
      getJson(airQualityUrl, { ...common, hourly: 'pm2_5,pm10,uv_index' }),
      getJson(forecastUrl, { ...common, hourly: 'temperature_2m,relative_humidity_2m' }),
    ]);

    const airHourly = air.hourly;
    const weatherHourly = weather.hourly;
    if (!Array.isArray(airHourly?.time) || !Array.isArray(weatherHourly?.time)) {
      logger.error('[core-service] format respons Open-Meteo tidak dikenali');
      throw errors.upstreamUnavailable();
    }

    const weatherByTime = new Map();
    weatherHourly.time.forEach((t, i) => {
      weatherByTime.set(t, {
        temperature: numberOrNull(weatherHourly.temperature_2m?.[i]),
        humidity: numberOrNull(weatherHourly.relative_humidity_2m?.[i]),
      });
    });

    const hours = airHourly.time
      .map((t, i) => {
        if (typeof t !== 'number') return null;
        const w = weatherByTime.get(t) ?? { temperature: null, humidity: null };
        return {
          epochMs: t * 1000,
          pm25: numberOrNull(airHourly.pm2_5?.[i]),
          pm10: numberOrNull(airHourly.pm10?.[i]),
          uvIndex: numberOrNull(airHourly.uv_index?.[i]),
          temperature: w.temperature,
          humidity: w.humidity,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.epochMs - b.epochMs);

    return {
      timezone: air.timezone ?? weather.timezone ?? null,
      utcOffsetSeconds: Number.isInteger(air.utc_offset_seconds) ? air.utc_offset_seconds : 0,
      hours,
    };
  }

  return { getHourlyConditions };
}
