export const DEFAULT_BASE_URL = "https://fah.stei.site/api";
export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
export const DEFAULT_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const FRIENDLY = {
  NETWORK_ERROR: "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.",
  TIMEOUT: "Server terlalu lama merespons. Coba lagi sebentar lagi.",
  INVALID_TOKEN: "Sesi login sudah berakhir. Silakan masuk lagi.",
  RATE_LIMITED: "Terlalu banyak permintaan. Tunggu sekitar satu menit lalu coba lagi.",
  NOT_IMPLEMENTED: "Fitur ini belum tersedia di server JamHijau.",
  BAD_GATEWAY: "Layanan JamHijau sedang tidak tersedia. Coba lagi nanti.",
  GATEWAY_TIMEOUT: "Layanan JamHijau terlalu lama merespons. Coba lagi nanti.",
  UPSTREAM_UNAVAILABLE: "Data cuaca dan kualitas udara sedang tidak tersedia. Tingkat risiko tidak ditampilkan agar tidak menebak.",
  AUTH_UNAVAILABLE: "Layanan akun sedang tidak tersedia. Coba lagi nanti.",
  INTERNAL_ERROR: "Terjadi kesalahan di server. Coba lagi nanti.",
  BAD_RESPONSE: "Server memberi respons yang tidak dikenali. Coba lagi nanti.",
};

function codeFromStatus(status) {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status === 501) return "NOT_IMPLEMENTED";
  if (status === 502) return "BAD_GATEWAY";
  if (status === 504) return "GATEWAY_TIMEOUT";
  if (status >= 500) return "BAD_GATEWAY";
  return "BAD_RESPONSE";
}

export function friendlyMessage(err) {
  if (err instanceof ApiError) {
    if (FRIENDLY[err.code] && !["UNAUTHENTICATED", "VALIDATION_ERROR", "CONFLICT", "NOT_FOUND", "FORBIDDEN"].includes(err.code)) {
      return FRIENDLY[err.code];
    }
    return err.message || FRIENDLY.BAD_RESPONSE;
  }
  return FRIENDLY.BAD_RESPONSE;
}

const ISSUE_TEXT = {
  invalid_format: "Format tidak valid",
  too_short: "Terlalu pendek",
  required: "Wajib diisi",
  required_max_80: "Wajib diisi, maksimal 80 karakter",
  out_of_range: "Di luar rentang yang diizinkan",
};

export function fieldErrors(err) {
  const result = {};
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return result;
  for (const d of err.details) {
    if (d && typeof d.field === "string") {
      result[d.field] = ISSUE_TEXT[d.issue] ?? "Tidak valid";
    }
  }
  return result;
}

export async function request(path, { method = "GET", body, token, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const timedOut = controller.signal.aborted;
    throw new ApiError({
      status: 0,
      code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      message: timedOut ? FRIENDLY.TIMEOUT : FRIENDLY.NETWORK_ERROR,
    });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const e = data?.error;
    const code = typeof e?.code === "string" ? e.code : codeFromStatus(res.status);
    throw new ApiError({
      status: res.status,
      code,
      message: typeof e?.message === "string" ? e.message : FRIENDLY[code] ?? FRIENDLY.BAD_RESPONSE,
      details: Array.isArray(e?.details) ? e.details : undefined,
    });
  }

  if (data === null) {
    throw new ApiError({ status: res.status, code: "BAD_RESPONSE", message: FRIENDLY.BAD_RESPONSE });
  }
  return data;
}

export const getHealth = () => request("/health");

export function login(email, password) {
  return request("/auth/login", { method: "POST", body: { email: email.trim(), password } });
}

export function register(name, email, password) {
  return request("/auth/register", {
    method: "POST",
    body: { name: name.trim(), email: email.trim(), password },
  });
}

export async function getMe(token) {
  const data = await request("/auth/me", { token });
  return data.user;
}

export function getRisk({ lat, lon, profile }, token) {
  const q = `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&profile=${encodeURIComponent(profile)}`;
  return request(`/risk?${q}`, { token });
}

export const getProfiles = () => request("/profiles");

export const getHealthProfile = (token) => request("/me/health-profile", { token });
export const updateHealthProfile = (token, profile) =>
  request("/me/health-profile", { method: "PUT", token, body: { profile } });

export const getLocations = (token) => request("/me/locations", { token });
export const createLocation = (token, { name, lat, lon }) =>
  request("/me/locations", { method: "POST", token, body: { name, lat, lon } });
export const deleteLocation = (token, id) =>
  request(`/me/locations/${encodeURIComponent(id)}`, { method: "DELETE", token });

export const getPlans = (token) => request("/me/plans", { token });
export const createPlan = (token, { title, locationId, startAt, endAt }) =>
  request("/me/plans", { method: "POST", token, body: { title, locationId, startAt, endAt } });
export const deletePlan = (token, id) =>
  request(`/me/plans/${encodeURIComponent(id)}`, { method: "DELETE", token });
export const getPlanRecommendation = (token, id) =>
  request(`/me/plans/${encodeURIComponent(id)}/recommendation`, { token });
