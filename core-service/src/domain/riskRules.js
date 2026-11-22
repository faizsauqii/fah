import { assessAirQuality } from './ispu.js';
import { assessHeat } from './heatIndex.js';
import { isSensitiveProfile } from './profiles.js';

export const LEVELS = Object.freeze(['HIJAU', 'KUNING', 'MERAH']);

const AIR_LEVELS = Object.freeze({
  general: {
    BAIK: 'HIJAU',
    SEDANG: 'HIJAU',
    TIDAK_SEHAT: 'KUNING',
    SANGAT_TIDAK_SEHAT: 'MERAH',
    BERBAHAYA: 'MERAH',
  },
  sensitive: {
    BAIK: 'HIJAU',
    SEDANG: 'KUNING',
    TIDAK_SEHAT: 'KUNING',
    SANGAT_TIDAK_SEHAT: 'MERAH',
    BERBAHAYA: 'MERAH',
  },
});

const HEAT_LEVELS = Object.freeze({
  general: {
    NORMAL: 'HIJAU',
    CAUTION: 'HIJAU',
    EXTREME_CAUTION: 'KUNING',
    DANGER: 'MERAH',
    EXTREME_DANGER: 'MERAH',
  },
  sensitive: {
    NORMAL: 'HIJAU',
    CAUTION: 'KUNING',
    EXTREME_CAUTION: 'MERAH',
    DANGER: 'MERAH',
    EXTREME_DANGER: 'MERAH',
  },
});

export function uvLevel(uvIndex) {
  if (typeof uvIndex !== 'number' || !Number.isFinite(uvIndex) || uvIndex < 0) return null;
  const rounded = Math.round(uvIndex);
  if (rounded <= 2) return 'HIJAU';
  if (rounded <= 7) return 'KUNING';
  return 'MERAH';
}

export function worstLevel(levels) {
  if (levels.some((l) => l === null || l === undefined)) return null;
  return levels.reduce((worst, l) => (LEVELS.indexOf(l) > LEVELS.indexOf(worst) ? l : worst), 'HIJAU');
}

export function assessHour(conditions, profile) {
  const group = isSensitiveProfile(profile) ? 'sensitive' : 'general';

  const air = assessAirQuality(conditions);
  const heat = assessHeat(conditions);
  const uv = uvLevel(conditions.uvIndex);

  const factors = {
    air: air ? { ...air, level: AIR_LEVELS[group][air.category] } : null,
    uv: uv ? { uvIndex: Math.round(conditions.uvIndex), level: uv } : null,
    heat: heat ? { ...heat, level: HEAT_LEVELS[group][heat.category] } : null,
  };

  const missing = Object.entries(factors)
    .filter(([, value]) => value === null)
    .map(([name]) => name);

  return {
    level: missing.length ? null : worstLevel([factors.air.level, factors.uv.level, factors.heat.level]),
    factors,
    missing,
  };
}

export function findGreenWindow(hours, { fromHour = 5, toHour = 21 } = {}) {
  let best = null;
  let runStart = -1;

  const closeRun = (endIndex) => {
    if (runStart < 0) return;
    const length = endIndex - runStart;
    if (!best || length > best.length) best = { startIndex: runStart, length };
    runStart = -1;
  };

  hours.forEach((hour, i) => {
    const eligible = hour.level === 'HIJAU' && hour.localHour >= fromHour && hour.localHour < toHour;
    const contiguous = i === 0 || hour.epochMs - hours[i - 1].epochMs === 3_600_000;
    if (!contiguous) closeRun(i);
    if (eligible) {
      if (runStart < 0) runStart = i;
    } else {
      closeRun(i);
    }
  });
  closeRun(hours.length);

  if (!best) return null;
  const first = hours[best.startIndex];
  const last = hours[best.startIndex + best.length - 1];
  return { startIndex: best.startIndex, length: best.length, first, last };
}
