export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_MAX = 80;
export const PASSWORD_MIN = 8;

export function validateLogin(values) {
  const errors = {};
  if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = "Format email tidak valid";
  }
  if (!values.password) {
    errors.password = "Password wajib diisi";
  }
  return errors;
}

export function validateRegister(values) {
  const errors = {};
  const name = values.name.trim();
  if (!name) {
    errors.name = "Nama wajib diisi";
  } else if (name.length > NAME_MAX) {
    errors.name = `Nama maksimal ${NAME_MAX} karakter`;
  }
  if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = "Format email tidak valid";
  }
  if (values.password.length < PASSWORD_MIN) {
    errors.password = `Password minimal ${PASSWORD_MIN} karakter`;
  }
  if (values.confirm !== values.password) {
    errors.confirm = "Konfirmasi password tidak sama";
  }
  return errors;
}

export function parseCoordinate(text) {
  const normalized = String(text).trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

export function validateLocation(values) {
  const errors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Nama lokasi wajib diisi";
  else if (name.length > NAME_MAX) errors.name = `Nama maksimal ${NAME_MAX} karakter`;

  const lat = parseCoordinate(values.lat);
  if (lat === null || lat < -90 || lat > 90) {
    errors.lat = "Latitude harus angka antara -90 dan 90";
  }
  const lon = parseCoordinate(values.lon);
  if (lon === null || lon < -180 || lon > 180) {
    errors.lon = "Longitude harus angka antara -180 dan 180";
  }
  return errors;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(text) {
  if (!DATE_RE.test(text)) return false;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function validatePlan(values) {
  const errors = {};
  const title = values.title.trim();
  if (!title) errors.title = "Nama kegiatan wajib diisi";
  else if (title.length > NAME_MAX) errors.title = `Nama maksimal ${NAME_MAX} karakter`;

  if (!values.locationId) errors.locationId = "Pilih salah satu lokasi tersimpan";
  if (!isValidDate(values.date)) errors.date = "Tanggal harus berformat YYYY-MM-DD";

  const startOk = TIME_RE.test(values.start);
  const endOk = TIME_RE.test(values.end);
  if (!startOk) errors.start = "Jam mulai harus berformat HH:MM";
  if (!endOk) errors.end = "Jam selesai harus berformat HH:MM";
  if (startOk && endOk && values.end <= values.start) {
    errors.end = "Jam selesai harus setelah jam mulai";
  }
  return errors;
}
