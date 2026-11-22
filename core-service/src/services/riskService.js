import { errors } from '../errors.js';
import { assessHour, findGreenWindow } from '../domain/riskRules.js';
import { localHourOf, toOffsetIso } from '../lib/time.js';

const HOUR_MS = 3_600_000;
const FORECAST_HOURS = 24;

export const ASSESSMENT_BASIS = Object.freeze([
  'Kualitas udara: ISPU PM2.5 dan PM10, Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020 (konsentrasi per jam sebagai indikasi)',
  'Indeks UV: WHO Global Solar UV Index: A Practical Guide (2002)',
  'Panas: heat index NOAA/NWS (regresi Rothfusz)',
]);

export const roundCoordinate = (value) => Math.round(value * 100) / 100;

function describeHour(h, profile, offset) {
  const result = assessHour(h, profile);
  const air = result.factors.air;
  return {
    time: toOffsetIso(h.epochMs, offset),
    level: result.level,
    pm25: h.pm25,
    pm10: h.pm10,
    uvIndex: h.uvIndex,
    temperature: h.temperature,
    humidity: h.humidity,
    heatIndex: result.factors.heat?.heatIndex ?? null,
    ispu: air?.ispu ?? null,
    ispuCategory: air?.categoryLabel ?? null,
    factors: {
      air: air
        ? { level: air.level, ispu: air.ispu, category: air.categoryLabel, criticalParameter: air.criticalParameter }
        : null,
      uv: result.factors.uv,
      heat: result.factors.heat,
    },
    missing: result.missing,
    epochMs: h.epochMs,
    localHour: localHourOf(h.epochMs, offset),
  };
}

const publicHour = ({ epochMs, localHour, ...rest }) => rest;

export function createRiskService({ openMeteo, envCache, now = () => Date.now() }) {
  async function loadConditions(lat, lon) {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = envCache?.get(key);
    if (cached) return cached;
    const fresh = await openMeteo.getHourlyConditions(lat, lon);
    envCache?.set(key, fresh);
    return fresh;
  }

  async function assess({ lat, lon, profile }) {
    const gridLat = roundCoordinate(lat);
    const gridLon = roundCoordinate(lon);
    const data = await loadConditions(gridLat, gridLon);

    const t = now();
    const startIndex = data.hours.findIndex((h) => h.epochMs <= t && t < h.epochMs + HOUR_MS);
    if (startIndex < 0) throw errors.upstreamUnavailable('Prakiraan untuk jam saat ini belum tersedia.');

    const offset = data.utcOffsetSeconds;
    const hours = data.hours
      .slice(startIndex, startIndex + FORECAST_HOURS)
      .map((h) => describeHour(h, profile, offset));
    const window = findGreenWindow(hours);

    return {
      location: { lat: gridLat, lon: gridLon, timezone: data.timezone },
      profile,
      generatedAt: toOffsetIso(Math.floor(t / 60_000) * 60_000, offset),
      greenWindow: window
        ? {
            start: window.first.time,
            end: toOffsetIso(window.last.epochMs + HOUR_MS, offset),
            hours: window.length,
          }
        : null,
      hours: hours.map(publicHour),
      basis: ASSESSMENT_BASIS,
      source: 'Open-Meteo (Air Quality API dan Forecast API)',
    };
  }

  async function assessRange({ lat, lon, profile, fromMs, toMs }) {
    const gridLat = roundCoordinate(lat);
    const gridLon = roundCoordinate(lon);
    const data = await loadConditions(gridLat, gridLon);
    const offset = data.utcOffsetSeconds;

    const firstHourMs = Math.floor(fromMs / HOUR_MS) * HOUR_MS;
    const expectedHours = Math.ceil((toMs - firstHourMs) / HOUR_MS);
    const hours = data.hours
      .filter((h) => h.epochMs < toMs && h.epochMs + HOUR_MS > fromMs)
      .map((h) => describeHour(h, profile, offset));

    const window = findGreenWindow(hours, { fromHour: 0, toHour: 24 });
    const coverage = hours.length === 0 ? 'NONE' : hours.length < expectedHours ? 'PARTIAL' : 'FULL';

    return {
      location: { lat: gridLat, lon: gridLon, timezone: data.timezone },
      profile,
      coverage,
      recommendation: window
        ? {
            start: toOffsetIso(Math.max(window.first.epochMs, fromMs), offset),
            end: toOffsetIso(Math.min(window.last.epochMs + HOUR_MS, toMs), offset),
            hours: window.length,
          }
        : null,
      hours: hours.map(publicHour),
      basis: ASSESSMENT_BASIS,
    };
  }

  return { assess, assessRange };
}
