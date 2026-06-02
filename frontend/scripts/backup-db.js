const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually parse .env.local if it exists
const env = {};
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
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
  } catch (e) {
    console.warn("Could not read .env.local, using process.env directly:", e.message);
  }
}

async function main() {
  const connectionString = env.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is missing!");
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString });
  console.log("Connecting to database for backup...");
  
  try {
    const res = await pool.query('SELECT * FROM kv_store');
    const backupData = {
      exportedAt: new Date().toISOString(),
      rows: res.rows
    };
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`Database backup saved successfully to: ${filePath}`);
    
    // Retain only last 7 backups to save space
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);
      
    if (files.length > 7) {
      const toDelete = files.slice(7);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(backupDir, file.name));
        console.log(`Deleted old backup file: ${file.name}`);
      }
    }
    
  } catch (err) {
    console.error("Backup failed:", err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
