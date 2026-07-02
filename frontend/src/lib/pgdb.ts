import { Pool } from "pg";

// ─── Connection Pool ────────────────────────────────────────────────────────
// Railway sets DATABASE_URL automatically when PostgreSQL plugin is added.
let _pool: Pool | null = null;

export function getPool(): Pool {
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

export async function executeTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─── Table Init ──────────────────────────────────────────────────────────────
let _initialized = false;

export async function initDb(): Promise<void> {
  if (_initialized) return;
  const pool = getPool();

  // Listen for pool errors so they don't crash the process
  pool.on('error', (err) => {
    console.error('[pgdb] Unexpected idle client error:', err.message);
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key        VARCHAR(500) PRIMARY KEY,
      value      JSONB        NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    -- GIN index for full JSONB scan
    CREATE INDEX IF NOT EXISTS idx_kv_store_value_gin ON kv_store USING gin (value);

    -- B-Tree indexes for common top-level JSONB text fields
    CREATE INDEX IF NOT EXISTS idx_kv_email ON kv_store ((value->>'replai_current_user_email'));
    CREATE INDEX IF NOT EXISTS idx_kv_updated ON kv_store (updated_at DESC);

    -- 1. credit_lots table
    CREATE TABLE IF NOT EXISTS credit_lots (
      id                 BIGSERIAL PRIMARY KEY,
      user_id            VARCHAR(255) NOT NULL,
      source             VARCHAR(50) NOT NULL,             -- 'plan' or 'purchase'
      credits_total      INTEGER NOT NULL,
      credits_remaining  INTEGER NOT NULL,
      expires_at         TIMESTAMPTZ NOT NULL,
      package_name       VARCHAR(100),
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT chk_lot_remaining CHECK (credits_remaining >= 0 AND credits_remaining <= credits_total)
    );

    CREATE INDEX IF NOT EXISTS idx_credit_lots_user_source ON credit_lots(user_id, source);
    CREATE INDEX IF NOT EXISTS idx_credit_lots_expires ON credit_lots(expires_at ASC);
    CREATE INDEX IF NOT EXISTS idx_credit_lots_active ON credit_lots(user_id, expires_at ASC) WHERE credits_remaining > 0;

    -- 2. credit_balances table
    CREATE TABLE IF NOT EXISTS credit_balances (
      user_id                VARCHAR(255) PRIMARY KEY,
      plan_credits           INTEGER NOT NULL DEFAULT 0,
      purchased_credits      INTEGER NOT NULL DEFAULT 0,
      auto_recharge_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
      auto_recharge_package  VARCHAR(50) DEFAULT 'Starter',
      recharge_attempts      INTEGER NOT NULL DEFAULT 0,
      daily_spend_cap        INTEGER DEFAULT NULL,
      updated_at             TIMESTAMPTZ DEFAULT NOW()
    );

    -- Re-create credit_ledger with correct fields (Drop old if exists)
    DROP TABLE IF EXISTS credit_ledger CASCADE;
    CREATE TABLE credit_ledger (
      id                     BIGSERIAL PRIMARY KEY,
      user_id                VARCHAR(255) NOT NULL,
      action_type            VARCHAR(50) NOT NULL,             -- 'grant_plan', 'purchase', 'deduct', 'expiry', 'refund'
      operation_type         VARCHAR(50),                      -- 'chat_reply', 'lead_qualification', va h.k.
      credits_amount         INTEGER NOT NULL,
      plan_amount            INTEGER NOT NULL DEFAULT 0,
      purchased_amount       INTEGER NOT NULL DEFAULT 0,
      balance_after          INTEGER NOT NULL,
      description            TEXT,
      idempotency_key        VARCHAR(255) UNIQUE,
      tokens_used            INTEGER DEFAULT 0,
      computed_api_cost_uzs  NUMERIC(10, 2) DEFAULT 0.00,
      created_at             TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_date ON credit_ledger(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_ledger_idemp ON credit_ledger(idempotency_key);

    -- 3. ledger_lot_allocations table
    CREATE TABLE IF NOT EXISTS ledger_lot_allocations (
      id          BIGSERIAL PRIMARY KEY,
      ledger_id   BIGINT NOT NULL REFERENCES credit_ledger(id) ON DELETE CASCADE,
      lot_id      BIGINT NOT NULL REFERENCES credit_lots(id),
      amount      INTEGER NOT NULL CHECK (amount > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_allocations_ledger ON ledger_lot_allocations(ledger_id);

    -- 4. cost_telemetry table
    CREATE TABLE IF NOT EXISTS cost_telemetry (
      id                     BIGSERIAL PRIMARY KEY,
      user_id                VARCHAR(255) NOT NULL,
      model_id               VARCHAR(100) NOT NULL,
      operation_type         VARCHAR(50) NOT NULL,
      input_tokens           INTEGER DEFAULT 0,
      output_tokens          INTEGER DEFAULT 0,
      thinking_tokens        INTEGER DEFAULT 0,
      cached_tokens          INTEGER DEFAULT 0,
      latency_ms             INTEGER DEFAULT 0,
      real_cost_uzs          NUMERIC(10, 2) DEFAULT 0.00,
      planned_cost_uzs       NUMERIC(10, 2) DEFAULT 0.00,
      status                 VARCHAR(20) NOT NULL,
      fallback_used          BOOLEAN DEFAULT FALSE,
      idempotency_key        VARCHAR(255),
      created_at             TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_user_date ON cost_telemetry(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_idemp ON cost_telemetry(idempotency_key);

    -- 5. Config tables
    CREATE TABLE IF NOT EXISTS deduction_rates (
      operation_type  VARCHAR(50) PRIMARY KEY,
      credits         INTEGER NOT NULL,
      unit            VARCHAR(50) NOT NULL,
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS credit_packages (
      name       VARCHAR(50) PRIMARY KEY,
      credits    INTEGER NOT NULL,
      price_uzs  INTEGER NOT NULL,
      active     BOOLEAN DEFAULT TRUE,
      -- 7 UZS is the hardcoded minimum price per credit in UZS
      CONSTRAINT chk_min_credit_price CHECK (price_uzs >= credits * 7)
    );

    CREATE TABLE IF NOT EXISTS context_caches (
      id             BIGSERIAL PRIMARY KEY,
      kb_hash        VARCHAR(255) UNIQUE NOT NULL,
      cache_name     VARCHAR(255) NOT NULL,
      expires_at     TIMESTAMP NOT NULL,
      created_at     TIMESTAMP DEFAULT NOW()
    );
  `);
  _initialized = true;
}

export async function logCreditTransaction(
  userId: string,
  actionType: string,
  amount: number,
  description: string
): Promise<void> {
  if (!isConfigured()) return;
  await initDb();
  await getPool().query(
    `INSERT INTO credit_ledger (user_id, action_type, amount, description)
     VALUES ($1, $2, $3, $4)`,
    [userId, actionType, amount, description]
  );
}

// ─── Core CRUD ───────────────────────────────────────────────────────────────

/** Read a single value by key. Returns null if not found. */
export async function getValue(key: string, client?: any): Promise<any | null> {
  await initDb();
  const runner = client || getPool();
  const { rows } = await runner.query(
    "SELECT value FROM kv_store WHERE key = $1",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

/** Write (upsert) a value. value should be a plain JS object/array. */
export async function setValue(key: string, value: unknown, client?: any): Promise<void> {
  await initDb();
  const runner = client || getPool();
  await runner.query(
    `INSERT INTO kv_store (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value      = EXCLUDED.value,
           updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

/** Delete a key. */
export async function deleteValue(key: string, client?: any): Promise<void> {
  await initDb();
  const runner = client || getPool();
  await runner.query("DELETE FROM kv_store WHERE key = $1", [key]);
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
  excludeUserId: string,
  client?: any
): Promise<Array<{ key: string; value: any }>> {
  await initDb();
  const runner = client || getPool();
  const { rows } = await runner.query(
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
    [`%${channelId}%`]
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

/**
 * Patch (merge-update) only specific top-level keys inside a user's settings JSONB.
 * Much cheaper than reading and re-writing the entire blob.
 */
export async function patchUserSettings(
  userId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await initDb();
  const key = `global_settings_${userId}`;
  // jsonb_strip_nulls removes null-valued keys so callers can delete fields
  await getPool().query(
    `INSERT INTO kv_store (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value      = kv_store.value || EXCLUDED.value,
           updated_at = NOW()`,
    [key, JSON.stringify(patch)]
  );
}
