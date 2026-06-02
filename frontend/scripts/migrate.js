const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false }
});

async function run() {
  console.log("Initializing PostgreSQL database...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key   VARCHAR(500) PRIMARY KEY,
      value JSONB        NOT NULL DEFAULT '{}'
    );
  `);

  if (supabaseUrl && supabaseKey) {
    console.log("Supabase credentials found. Migrating from Supabase to Railway PostgreSQL...");
    try {
      const restUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/instagram_accounts?select=*`;
      const response = await fetch(restUrl, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });

      if (!response.ok) {
        throw new Error(
          `Supabase API responded with status ${response.status}: ${await response.text()}`
        );
      }

      const rows = await response.json();
      console.log(`Fetched ${rows.length} rows from Supabase.`);

      for (const row of rows) {
        const key = row.instagram_page_id;
        const val = row.fb_field_mappings;
        if (!key) continue;

        await pool.query(
          `INSERT INTO kv_store (key, value)
           VALUES ($1, $2::jsonb)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, JSON.stringify(val)]
        );
        console.log(`Migrated key: ${key}`);
      }
      console.log("Migration from Supabase completed successfully!");
    } catch (err) {
      console.error("Error migrating from Supabase:", err);
      console.log("Falling back to local db.json migration...");
      await migrateFromLocal();
    }
  } else {
    console.log("Supabase credentials not found. Migrating from local db.json...");
    await migrateFromLocal();
  }

  await pool.end();
}

async function migrateFromLocal() {
  const dbFile = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");
  if (!fs.existsSync(dbFile)) {
    console.log("No local db.json found. Nothing to migrate.");
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    console.log("Loaded local db.json content.");

    // 1. global_users
    if (data.users) {
      await pool.query(
        `INSERT INTO kv_store (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ["global_users", JSON.stringify(data.users)]
      );
      console.log("Migrated: global_users");
    }

    // 2. global_admin_data
    const adminData = {
      promoCodes: data.promoCodes || [],
      auditLogs: data.auditLogs || [],
      systemAnnouncement: data.systemAnnouncement || ""
    };
    await pool.query(
      `INSERT INTO kv_store (key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ["global_admin_data", JSON.stringify(adminData)]
    );
    console.log("Migrated: global_admin_data");

    // 3. global_settings_userId
    if (data.userData) {
      for (const [userId, userVal] of Object.entries(data.userData)) {
        await pool.query(
          `INSERT INTO kv_store (key, value)
           VALUES ($1, $2::jsonb)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          ["global_settings_" + userId, JSON.stringify(userVal)]
        );
        console.log(`Migrated settings for user: ${userId}`);
      }
    }

    console.log("Migration from local db.json completed successfully!");
  } catch (err) {
    console.error("Error migrating from local db.json:", err);
  }
}

run().catch(console.error);
