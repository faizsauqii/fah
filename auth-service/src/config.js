// Membaca konfigurasi dari environment. Nilai rahasia hanya dari .env.

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variabel lingkungan ${name} wajib diisi.`);
  return value;
}

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`Variabel lingkungan ${name} harus berupa angka bulat.`);
  return value;
}

export function loadConfig() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const jwtSecret = isProduction
    ? required('JWT_SECRET')
    : process.env.JWT_SECRET ?? 'dev-only-secret-jangan-dipakai-di-stb-000000';
  if (isProduction && jwtSecret.length < 32) throw new Error('JWT_SECRET minimal 32 karakter.');

  // Token untuk endpoint /internal/ (header X-Internal-Token), wajib sejak revisi 2 kontrak.
  // Nilai dev sama dengan default core-service supaya keduanya langsung cocok di laptop.
  const internalToken = isProduction
    ? required('INTERNAL_TOKEN')
    : process.env.INTERNAL_TOKEN || 'dev-only-internal-token-jangan-dipakai-000';
  if (isProduction && internalToken.length < 32) throw new Error('INTERNAL_TOKEN minimal 32 karakter.');
  if (isProduction && internalToken === jwtSecret) throw new Error('INTERNAL_TOKEN harus berbeda dari JWT_SECRET.');

  return Object.freeze({
    nodeEnv,
    port: intFromEnv('PORT', 3001),
    dbPath: process.env.AUTH_DB_PATH ?? './data/auth.db',
    jwt: Object.freeze({
      secret: jwtSecret,
      issuer: process.env.JWT_ISSUER ?? 'jamhijau-auth',
      audience: process.env.JWT_AUDIENCE ?? 'jamhijau',
      expiresInSeconds: intFromEnv('JWT_EXPIRES_IN_SECONDS', 7 * 24 * 3600),
    }),
    internalToken,
    seed: Object.freeze({
      adminEmail: process.env.ADMIN_EMAIL || null,
      adminPassword: process.env.ADMIN_PASSWORD || null,
      demoEmail: process.env.DEMO_EMAIL || null,
      demoPassword: process.env.DEMO_PASSWORD || null,
    }),
  });
}
