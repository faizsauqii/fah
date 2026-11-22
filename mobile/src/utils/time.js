const pad = (n) => String(n).padStart(2, "0");

export function toOffsetIso(dateText, timeText) {
  const [y, m, d] = dateText.split("-").map(Number);
  const [hh, mm] = timeText.split(":").map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0);
  const offsetMin = -local.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `${dateText}T${pad(hh)}:${pad(mm)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function clockFromIso(iso) {
  const match = /T(\d{2}:\d{2})/.exec(String(iso ?? ""));
  return match ? match[1] : "--:--";
}

export function dateFromIso(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!match) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}

export function todayText(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
