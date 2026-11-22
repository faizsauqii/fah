const pad = (n) => String(n).padStart(2, '0');

export function toOffsetIso(epochMs, offsetSeconds) {
  const local = new Date(epochMs + offsetSeconds * 1000);
  const sign = offsetSeconds >= 0 ? '+' : '-';
  const abs = Math.abs(offsetSeconds);
  const offset = `${sign}${pad(Math.floor(abs / 3600))}:${pad(Math.floor((abs % 3600) / 60))}`;
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00${offset}`
  );
}

export function localHourOf(epochMs, offsetSeconds) {
  return new Date(epochMs + offsetSeconds * 1000).getUTCHours();
}
