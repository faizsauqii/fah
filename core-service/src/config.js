// Membaca konfigurasi dari environment. Semua nilai rahasia datang dari .env,
// tidak pernah ditulis di kode.

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabel lingkungan ${name} wajib diisi.`);
  }
  return value;
}

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Variabel lingkungan ${name} harus berupa angka bulat.`);
  }
  return value;
}

export function loadConfig() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const jwtSecret = isProduction
    ? required('JWT_SECRET')
    : process.env.JWT_SECRET ?? 'dev-only-secret-jangan-dipakai-di-stb-000000';

  if (isProduction && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET minimal 32 karakter.');
  }

  // Token untuk memanggil endpoint /internal/ di auth-service (header X-Internal-Token).
  const internalToken = isProduction
    ? required('INTERNAL_TOKEN')
    : process.env.INTERNAL_TOKEN ?? 'dev-only-internal-token-jangan-dipakai-000';

  if (isProduction && internalToken.length < 32) {
    throw new Error('INTERNAL_TOKEN minimal 32 karakter.');
  }
  if (isProduction && internalToken === jwtSecret) {
    throw new Error('INTERNAL_TOKEN harus berbeda dari JWT_SECRET.');
  }

  return Object.freeze({
    nodeEnv,
    port: intFromEnv('PORT', 3000),
    dbPath: process.env.CORE_DB_PATH ?? './data/core.db',
    jwt: Object.freeze({
      secret: jwtSecret,
      issuer: process.env.JWT_ISSUER ?? 'jamhijau-auth',
      audience: process.env.JWT_AUDIENCE ?? 'jamhijau',
    }),
    auth: Object.freeze({
      internalUrl: process.env.AUTH_INTERNAL_URL ?? 'http://auth-service:3001',
      internalToken,
      timeoutMs: intFromEnv('AUTH_TIMEOUT_MS', 3000),
      apiKeyCacheSeconds: intFromEnv('API_KEY_CACHE_SECONDS', 60),
    }),
    openMeteo: Object.freeze({
      userAgent:
        process.env.OPEN_METEO_USER_AGENT ?? 'JamHijau/0.1 (kelompok-jamhijau K02)',
      timeoutMs: intFromEnv('OPEN_METEO_TIMEOUT_MS', 5000),
    }),
    envCacheTtlMinutes: intFromEnv('ENV_CACHE_TTL_MINUTES', 60),
  });
}
