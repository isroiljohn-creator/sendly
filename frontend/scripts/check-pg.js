const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  }
});

async function main() {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is missing!");
    process.exit(1);
  }
  const pool = new Pool({ connectionString });
  
  const res = await pool.query("SELECT * FROM kv_store WHERE key = 'global_admin_data'");
  if (res.rows.length > 0) {
    console.log("=== global_admin_data ===");
    console.log(JSON.stringify(res.rows[0].value, null, 2));
  } else {
    console.log("global_admin_data key not found");
  }
  
  await pool.end();
}

main().catch(console.error);
