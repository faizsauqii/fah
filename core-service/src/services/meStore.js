import { randomUUID } from 'node:crypto';
import { toOffsetIso } from '../lib/time.js';

const toLocation = (row) => ({
  id: row.id,
  name: row.name,
  lat: row.lat,
  lon: row.lon,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPlan = (row) => {
  const offsetSeconds = row.utc_offset_minutes * 60;
  return {
    id: row.id,
    title: row.title,
    locationId: row.location_id,
    locationName: row.location_name,
    startAt: toOffsetIso(Date.parse(row.start_at), offsetSeconds),
    endAt: toOffsetIso(Date.parse(row.end_at), offsetSeconds),
    createdAt: row.created_at,
  };
};

export function createMeStore({ db, now = () => Date.now() }) {
  const sql = {
    getProfile: db.prepare('SELECT profile, updated_at FROM health_profiles WHERE user_id = ?'),
    upsertProfile: db.prepare(
      `INSERT INTO health_profiles (user_id, profile, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at`,
    ),
    listLocations: db.prepare('SELECT * FROM saved_locations WHERE user_id = ? ORDER BY created_at, id'),
    getLocation: db.prepare('SELECT * FROM saved_locations WHERE id = ? AND user_id = ?'),
    countLocations: db.prepare('SELECT COUNT(*) AS n FROM saved_locations WHERE user_id = ?'),
    insertLocation: db.prepare(
      'INSERT INTO saved_locations (id, user_id, name, lat, lon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ),
    updateLocation: db.prepare(
      'UPDATE saved_locations SET name = ?, lat = ?, lon = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    ),
    deleteLocation: db.prepare('DELETE FROM saved_locations WHERE id = ? AND user_id = ?'),
    listPlans: db.prepare(
      `SELECT p.*, l.name AS location_name FROM activity_plans p
       JOIN saved_locations l ON l.id = p.location_id
       WHERE p.user_id = ? ORDER BY p.start_at, p.id`,
    ),
    getPlan: db.prepare(
      `SELECT p.*, l.name AS location_name, l.lat AS location_lat, l.lon AS location_lon
       FROM activity_plans p JOIN saved_locations l ON l.id = p.location_id
       WHERE p.id = ? AND p.user_id = ?`,
    ),
    countPlans: db.prepare('SELECT COUNT(*) AS n FROM activity_plans WHERE user_id = ?'),
    insertPlan: db.prepare(
      `INSERT INTO activity_plans (id, user_id, location_id, title, start_at, end_at, created_at, utc_offset_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ),
    deletePlan: db.prepare('DELETE FROM activity_plans WHERE id = ? AND user_id = ?'),
  };

  const timestamp = () => new Date(now()).toISOString();

  return {
    getHealthProfile(userId) {
      const row = sql.getProfile.get(userId);
      return row ? { profile: row.profile, updatedAt: row.updated_at } : { profile: 'umum', updatedAt: null };
    },
    setHealthProfile(userId, profile) {
      const updatedAt = timestamp();
      sql.upsertProfile.run(userId, profile, updatedAt);
      return { profile, updatedAt };
    },

    countLocations: (userId) => sql.countLocations.get(userId).n,
    listLocations: (userId) => sql.listLocations.all(userId).map(toLocation),
    getLocation(userId, id) {
      const row = sql.getLocation.get(id, userId);
      return row ? toLocation(row) : null;
    },
    createLocation(userId, { name, lat, lon }) {
      const id = randomUUID();
      const t = timestamp();
      sql.insertLocation.run(id, userId, name, lat, lon, t, t);
      return { id, name, lat, lon, createdAt: t, updatedAt: t };
    },
    updateLocation(userId, id, { name, lat, lon }) {
      const info = sql.updateLocation.run(name, lat, lon, timestamp(), id, userId);
      return info.changes ? this.getLocation(userId, id) : null;
    },
    deleteLocation: (userId, id) => sql.deleteLocation.run(id, userId).changes > 0,

    countPlans: (userId) => sql.countPlans.get(userId).n,
    listPlans: (userId) => sql.listPlans.all(userId).map(toPlan),
    getPlan(userId, id) {
      const row = sql.getPlan.get(id, userId);
      if (!row) return null;
      return {
        ...toPlan(row),
        startMs: Date.parse(row.start_at),
        endMs: Date.parse(row.end_at),
        location: { lat: row.location_lat, lon: row.location_lon },
      };
    },
    createPlan(userId, { title, locationId, startMs, endMs, offsetMinutes }) {
      const row = {
        id: randomUUID(),
        title,
        location_id: locationId,
        location_name: sql.getLocation.get(locationId, userId).name,
        start_at: new Date(startMs).toISOString(),
        end_at: new Date(endMs).toISOString(),
        created_at: timestamp(),
        utc_offset_minutes: offsetMinutes,
      };
      sql.insertPlan.run(
        row.id,
        userId,
        row.location_id,
        row.title,
        row.start_at,
        row.end_at,
        row.created_at,
        row.utc_offset_minutes,
      );
      return toPlan(row);
    },
    deletePlan: (userId, id) => sql.deletePlan.run(id, userId).changes > 0,
  };
}
