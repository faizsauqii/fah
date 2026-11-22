export function createEnvCache({ db, ttlMinutes = 60, now = () => Date.now() }) {
  const select = db.prepare('SELECT payload FROM env_cache WHERE cache_key = ? AND expires_at > ?');
  const upsert = db.prepare(
    `INSERT INTO env_cache (cache_key, payload, fetched_at, expires_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload,
       fetched_at = excluded.fetched_at, expires_at = excluded.expires_at`,
  );
  const prune = db.prepare('DELETE FROM env_cache WHERE expires_at <= ?');

  return {
    get(key) {
      const row = select.get(key, new Date(now()).toISOString());
      if (!row) return null;
      try {
        return JSON.parse(row.payload);
      } catch {
        return null;
      }
    },
    set(key, value) {
      const t = now();
      prune.run(new Date(t).toISOString());
      upsert.run(
        key,
        JSON.stringify(value),
        new Date(t).toISOString(),
        new Date(t + ttlMinutes * 60_000).toISOString(),
      );
    },
  };
}
