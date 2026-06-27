import { Pool } from "pg";

// ─── Connection Pool ────────────────────────────────────────────────────────
// Railway sets DATABASE_URL automatically when PostgreSQL plugin is added.
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _pool = new Pool({
      connectionString,
      ssl: connectionString.includes("railway.internal")
        ? false // Railway internal network — no SSL needed
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return _pool;
}

// ─── Table Init ──────────────────────────────────────────────────────────────
let _initialized = false;

export async function initDb(): Promise<void> {
  if (_initialized) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key   VARCHAR(500) PRIMARY KEY,
      value JSONB        NOT NULL DEFAULT '{}'
    );
  `);
  _initialized = true;
}

// ─── Core CRUD ───────────────────────────────────────────────────────────────

/** Read a single value by key. Returns null if not found. */
export async function getValue(key: string): Promise<any | null> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT value FROM kv_store WHERE key = $1",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

/** Write (upsert) a value. value should be a plain JS object/array. */
export async function setValue(key: string, value: unknown): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO kv_store (key, value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)]
  );
}

/** Delete a key. */
export async function deleteValue(key: string): Promise<void> {
  await initDb();
  await getPool().query("DELETE FROM kv_store WHERE key = $1", [key]);
}

/** Get all rows (used by admin). */
export async function getAll(): Promise<Array<{ key: string; value: any }>> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT key, value FROM kv_store ORDER BY key"
  );
  return rows;
}

/** Get all rows where key matches a LIKE pattern, e.g. 'global_settings_%' */
export async function getAllLike(
  pattern: string
): Promise<Array<{ key: string; value: any }>> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT key, value FROM kv_store WHERE key LIKE $1 ORDER BY key",
    [pattern]
  );
  return rows;
}

/** Get all rows where key does NOT match a pattern and key LIKE another pattern */
export async function getAllSettingsExcept(
  excludeUserId: string
): Promise<Array<{ key: string; value: any }>> {
  await initDb();
  const { rows } = await getPool().query(
    `SELECT key, value FROM kv_store
     WHERE key LIKE 'global_settings_%'
       AND key != $1`,
    [`global_settings_${excludeUserId}`]
  );
  return rows;
}

/** Check if DATABASE_URL is configured. */
export function isConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Query only the bot token for a channelId directly using JSONB text check. */
export async function getBotToken(channelId: string): Promise<string | null> {
  await initDb();
  const { rows } = await getPool().query(
    `SELECT value->>'replai_channels' as channels_str FROM kv_store 
     WHERE key LIKE 'global_settings_%' 
       AND value->>'replai_channels' LIKE $1`,
    [`%"id":"${channelId}"%`]
  );
  if (rows.length > 0) {
    const channelsStr = rows[0].channels_str;
    if (channelsStr) {
      try {
        const channels = JSON.parse(channelsStr);
        if (Array.isArray(channels)) {
          const c = channels.find((x: any) => x.id === channelId);
          if (c && c.isConnected && c.telegramToken) {
            return c.telegramToken;
          }
        }
      } catch (e) {
        console.error("Failed to parse channels JSON in getBotToken:", e);
      }
    }
  }
  return null;
}

/** Resolve the owner userId for a channelId directly. */
export async function getUserIdByChannelId(channelId: string): Promise<string | null> {
  await initDb();
  const { rows } = await getPool().query(
    `SELECT key FROM kv_store 
     WHERE key LIKE 'global_settings_%' 
       AND value->>'replai_channels' LIKE $1`,
    [`%"id":"${channelId}"%`]
  );
  if (rows.length > 0) {
    return rows[0].key.replace("global_settings_", "");
  }
  return null;
}

/** Get only a single user settings row. */
export async function getUserSettings(userId: string): Promise<any | null> {
  return getValue("global_settings_" + userId);
}
