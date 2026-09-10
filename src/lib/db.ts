import * as SQLite from 'expo-sqlite';
import type { SessionRow } from './streak';

export type PlanRow = {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  created_at: number;
  deleted_at: number | null;
};

export type WeightRow = {
  id: string;
  recorded_at: number;
  weight_kg: number;
  source: string;
  created_at: number;
  deleted_at: number | null;
};

export type WaterRow = {
  id: string;
  recorded_at: number;
  volume_ml: number;
  created_at: number;
  deleted_at: number | null;
};

export type SessionInsert = {
  id: string;
  plan_id: string | null;
  plan_name: string;
  started_at_utc: number;
  planned_end_at_utc: number;
  ended_at_utc: number | null;
  status: 'active' | 'completed' | 'ended_early' | 'abandoned';
  timezone_at_start: string;
  mood_rating: number | null;
  note: string | null;
  created_via: 'manual' | 'retroactive';
};

const DATABASE_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('fasttrack.db');
  await db.execAsync(`PRAGMA journal_mode = WAL`);

  const row = await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`);
  const current = row?.user_version ?? 0;
  if (current >= DATABASE_VERSION) return db;

  if (current < 1) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT,
  plan_name TEXT NOT NULL DEFAULT '',
  started_at_utc INTEGER NOT NULL,
  planned_end_at_utc INTEGER NOT NULL,
  ended_at_utc INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  timezone_at_start TEXT,
  mood_rating INTEGER,
  note TEXT,
  created_via TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at_utc);

CREATE TABLE IF NOT EXISTS custom_plans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  fast_hours REAL NOT NULL,
  eat_hours REAL NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS weights (
  id TEXT PRIMARY KEY NOT NULL,
  recorded_at INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_weights_recorded ON weights(recorded_at);

CREATE TABLE IF NOT EXISTS water (
  id TEXT PRIMARY KEY NOT NULL,
  recorded_at INTEGER NOT NULL,
  volume_ml INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_water_recorded ON water(recorded_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  return db;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function insertSession(s: SessionInsert): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO sessions (id, plan_id, plan_name, started_at_utc, planned_end_at_utc, ended_at_utc, status, timezone_at_start, mood_rating, note, created_via, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    s.id,
    s.plan_id,
    s.plan_name,
    s.started_at_utc,
    s.planned_end_at_utc,
    s.ended_at_utc,
    s.status,
    s.timezone_at_start,
    s.mood_rating,
    s.note,
    s.created_via,
    now,
    now
  );
}

export async function updateActiveSession(
  id: string,
  fields: { started_at_utc?: number; planned_end_at_utc?: number; ended_at_utc?: number; status?: string; mood_rating?: number | null; note?: string | null }
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    sets.push(`${k} = ?`);
    params.push(v);
  }
  sets.push(`updated_at = ?`);
  params.push(Date.now());
  params.push(id);
  await db.runAsync(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function softDeleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE sessions SET deleted_at = ?, updated_at = ? WHERE id = ?`, Date.now(), Date.now(), id);
}

export async function getActiveSession(): Promise<SessionRowFull | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SessionRowFull>(
    `SELECT * FROM sessions WHERE status = 'active' AND deleted_at IS NULL ORDER BY started_at_utc DESC LIMIT 1`
  );
  return row ?? null;
}

export async function getRecentSessions(limit = 60): Promise<SessionRowFull[]> {
  const db = await getDb();
  return db.getAllAsync<SessionRowFull>(
    `SELECT * FROM sessions WHERE deleted_at IS NULL ORDER BY started_at_utc DESC LIMIT ?`,
    limit
  );
}

export type SessionRowFull = {
  id: string;
  plan_id: string | null;
  plan_name: string;
  started_at_utc: number;
  planned_end_at_utc: number;
  ended_at_utc: number | null;
  status: 'active' | 'completed' | 'ended_early' | 'abandoned';
  mood_rating: number | null;
  note: string | null;
  created_via: string;
} & SessionRowMeta;

type SessionRowMeta = {
  timezone_at_start: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export async function getAllWeights(): Promise<WeightRow[]> {
  const db = await getDb();
  return db.getAllAsync<WeightRow>(
    `SELECT * FROM weights WHERE deleted_at IS NULL ORDER BY recorded_at ASC`
  );
}

export async function insertWeight(id: string, recordedAt: number, weightKg: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO weights (id, recorded_at, weight_kg, source, created_at) VALUES (?, ?, ?, 'manual', ?)
     ON CONFLICT(id) DO UPDATE SET weight_kg = excluded.weight_kg, recorded_at = excluded.recorded_at, deleted_at = NULL`,
    id,
    recordedAt,
    weightKg,
    Date.now()
  );
}

export async function softDeleteWeight(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE weights SET deleted_at = ? WHERE id = ?`, Date.now(), id);
}

export async function getWaterForRange(fromTs: number, toTs: number): Promise<WaterRow[]> {
  const db = await getDb();
  return db.getAllAsync<WaterRow>(
    `SELECT * FROM water WHERE deleted_at IS NULL AND recorded_at >= ? AND recorded_at < ? ORDER BY recorded_at ASC`,
    fromTs,
    toTs
  );
}

export async function insertWater(id: string, recordedAt: number, volumeMl: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO water (id, recorded_at, volume_ml, created_at) VALUES (?, ?, ?, ?)`,
    id,
    recordedAt,
    volumeMl,
    Date.now()
  );
}

export async function softDeleteWater(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE water SET deleted_at = ? WHERE id = ?`, Date.now(), id);
}

export async function getCustomPlans(): Promise<PlanRow[]> {
  const db = await getDb();
  return db.getAllAsync<PlanRow>(`SELECT * FROM custom_plans WHERE deleted_at IS NULL ORDER BY created_at ASC`);
}

export async function insertCustomPlan(id: string, name: string, fastHours: number, eatHours: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO custom_plans (id, name, fast_hours, eat_hours, created_at) VALUES (?, ?, ?, ?, ?)`,
    id,
    name,
    fastHours,
    eatHours,
    Date.now()
  );
}

export async function softDeleteCustomPlan(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE custom_plans SET deleted_at = ? WHERE id = ?`, Date.now(), id);
}

export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
DELETE FROM sessions;
DELETE FROM custom_plans;
DELETE FROM weights;
DELETE FROM water;
DELETE FROM settings;
`);
}
