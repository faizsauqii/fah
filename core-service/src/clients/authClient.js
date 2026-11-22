import { createHash } from 'node:crypto';
import { errors } from '../errors.js';

const VERIFY_PATH = '/internal/api-keys/verify';
const MAX_CACHE_ENTRIES = 1000;

function hashKey(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function createAuthClient({
  internalUrl,
  internalToken,
  timeoutMs = 3000,
  apiKeyCacheSeconds = 60,
  fetchImpl = fetch,
  now = () => Date.now(),
  logger = console,
}) {
  if (!internalToken) {
    throw new Error('createAuthClient: internalToken wajib diisi.');
  }

  const verifyUrl = new URL(VERIFY_PATH, internalUrl).toString();
  const cache = new Map();

  function readCache(hash) {
    const entry = cache.get(hash);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      cache.delete(hash);
      return undefined;
    }
    return entry.result;
  }

  function writeCache(hash, result) {
    if (cache.size >= MAX_CACHE_ENTRIES) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(hash, { result, expiresAt: now() + apiKeyCacheSeconds * 1000 });
  }

  async function verifyApiKey(apiKey) {
    if (typeof apiKey !== 'string' || apiKey.length === 0 || apiKey.length > 200) {
      return { valid: false };
    }

    const hash = hashKey(apiKey);
    const cached = readCache(hash);
    if (cached) return cached;

    let response;
    try {
      response = await fetchImpl(verifyUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': internalToken,
        },
        body: JSON.stringify({ apiKey }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      logger.error(`[core-service] auth-service tidak bisa dihubungi: ${err.name}: ${err.message}`);
      throw errors.authUnavailable();
    }

    if (response.status === 401 || response.status === 403) {
      logger.error(
        '[core-service] auth-service menolak X-Internal-Token. ' +
          'Periksa INTERNAL_TOKEN di .env, harus sama di auth-service dan core-service.',
      );
      throw errors.authUnavailable();
    }

    if (!response.ok) {
      logger.error(`[core-service] auth-service menjawab HTTP ${response.status} saat verifikasi API key`);
      throw errors.authUnavailable();
    }

    let body;
    try {
      body = await response.json();
    } catch {
      logger.error('[core-service] respons verifikasi API key bukan JSON yang valid');
      throw errors.authUnavailable();
    }

    const result =
      body?.valid === true
        ? { valid: true, keyId: body.keyId, group: body.group, tier: body.tier }
        : { valid: false };

    writeCache(hash, result);
    return result;
  }

  return { verifyApiKey, _cacheSize: () => cache.size };
}
