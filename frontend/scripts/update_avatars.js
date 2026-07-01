const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load env variables manually to avoid package dependency
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  }
}
loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function getTelegramAvatarBase64(token, chatId, isGroup) {
  try {
    const fetchFn = typeof fetch !== 'undefined' ? fetch : global.fetch;
    if (!fetchFn) throw new Error("Fetch is not available");

    if (isGroup) {
      const chatRes = await fetchFn(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`);
      if (!chatRes.ok) return null;
      const chatData = await chatRes.json();
      if (!chatData.ok || !chatData.result || !chatData.result.photo) return null;
      
      const fileId = chatData.result.photo.small_file_id;
      const fileRes = await fetchFn(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
      if (!fileRes.ok) return null;
      const fileData = await fileRes.json();
      if (!fileData.ok || !fileData.result || !fileData.result.file_path) return null;
      
      const filePath = fileData.result.file_path;
      const imgRes = await fetchFn(`https://api.telegram.org/file/bot${token}/${filePath}`);
      if (!imgRes.ok) return null;
      
      const buffer = await imgRes.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
    } else {
      const photosRes = await fetchFn(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${chatId}&limit=1`);
      if (!photosRes.ok) return null;
      const photosData = await photosRes.json();
      if (!photosData.ok || !photosData.result || photosData.result.total_count === 0) return null;
      
      const photos = photosData.result.photos;
      if (!photos || photos.length === 0 || photos[0].length === 0) return null;
      
      const fileId = photos[0][0].file_id;
      const fileRes = await fetchFn(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
      if (!fileRes.ok) return null;
      const fileData = await fileRes.json();
      if (!fileData.ok || !fileData.result || !fileData.result.file_path) return null;
      
      const filePath = fileData.result.file_path;
      const imgRes = await fetchFn(`https://api.telegram.org/file/bot${token}/${filePath}`);
      if (!imgRes.ok) return null;
      
      const buffer = await imgRes.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
    }
  } catch (e) {
    console.error(`Failed to fetch avatar for ${chatId}:`, e.message);
    return null;
  }
}

function safeParse(val, fallback = null) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

async function run() {
  console.log("Connecting to PostgreSQL...");
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT key, value FROM kv_store WHERE key LIKE 'global_settings_%'");
    console.log(`Found ${rows.length} user settings records.`);

    for (const row of rows) {
      const key = row.key;
      const userVal = row.value;
      let updated = false;

      // Find all replai_chats_ keys
      for (const [propName, propVal] of Object.entries(userVal)) {
        if (propName.startsWith("replai_chats_")) {
          const channelId = propName.replace("replai_chats_", "");
          
          // Get the bot token for this channel
          const rawChannels = userVal["replai_channels"];
          const channels = safeParse(rawChannels, []);
          const channel = channels.find(c => c.id === channelId);
          let token = channel ? channel.telegramToken : null;

          if (!token && channelId === "system_bot") {
            token = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
          }

          if (!token) {
            console.log(`No token found for channel ${channelId} in ${key}`);
            continue;
          }

          const chatsList = safeParse(propVal, []);
          if (!Array.isArray(chatsList)) continue;

          for (const chat of chatsList) {
            const isUnsplash = !chat.avatar || chat.avatar.startsWith("https://images.unsplash.com");
            if (isUnsplash) {
              const isGroup = chat.tags && chat.tags.includes("Group");
              console.log(`Updating avatar for ${chat.name} (ID: ${chat.id}, isGroup: ${isGroup}) using token ...${token.slice(-6)}`);
              
              const base64 = await getTelegramAvatarBase64(token, chat.id, isGroup);
              if (base64) {
                chat.avatar = base64;
                updated = true;
                console.log(`Successfully updated avatar for ${chat.name}`);
              } else {
                console.log(`Could not fetch avatar for ${chat.name} (using fallback Unsplash)`);
              }
            }
          }

          if (updated) {
            userVal[propName] = JSON.stringify(chatsList);
          }
        }
      }

      if (updated) {
        console.log(`Saving updated settings for ${key}...`);
        await client.query(
          "INSERT INTO kv_store (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
          [key, JSON.stringify(userVal)]
        );
      }
    }
    console.log("Avatar update run completed successfully!");
  } catch (err) {
    console.error("Error during run:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
