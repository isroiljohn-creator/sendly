const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load env variables
dotenv.config();

const SQL_FILE = path.join(__dirname, "../src/db/schema.sql");

async function run() {
  console.log("=== Sendly.uz Supabase Database Migration ===");

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error("\n[Xatolik] DATABASE_URL yoki SUPABASE_DB_CONNECTION_STRING topilmadi!");
    console.log("\nYo'riqnoma:");
    console.log("1. Supabase loyihangiz sozlamalariga kiring (Settings -> Database).");
    console.log("2. Connection String -> Node.js qismidan aloqa qatorini nusxalang.");
    console.log("3. Uni backend/.env faylida DATABASE_URL sifatida yozib qo'ying, masalan:");
    console.log("   DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require\n");
    console.log("Muqobil usul:");
    console.log("Siz backend/src/db/schema.sql fayli ichidagi barcha SQL kodlarni nusxalab,");
    console.log("Supabase Dashboard -> SQL Editor qismiga joylashtirib Run tugmasini bosishingiz ham mumkin.\n");
    process.exit(1);
  }

  let pg;
  try {
    pg = require("pg");
  } catch (err) {
    console.warn("\n[Ogohlantirish] Node.js 'pg' kutubxonasi o'rnatilmagan.");
    console.log("Uni o'rnatish uchun quyidagi buyruqni bajaring:");
    console.log("  npm install pg\n");
    console.log("Yoki schema.sql faylidagi kodni to'g'ridan-to'g'ri Supabase SQL Editor-ga nusxalab joylashtiring.");
    process.exit(1);
  }

  console.log(`\n1. schema.sql fayli o'qilmoqda: ${SQL_FILE}...`);
  if (!fs.existsSync(SQL_FILE)) {
    console.error(`❌ schema.sql topilmadi: ${SQL_FILE}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_FILE, "utf8");
  const client = new pg.Client({ connectionString });

  try {
    console.log("2. Supabase bazasiga ulanmoqda...");
    await client.connect();
    console.log("✅ Bazaga muvaffaqiyatli ulandi.");

    console.log("3. SQL buyruqlari bajarilmoqda. Iltimos kuting...");
    await client.query(sql);
    console.log("✅ Migratsiya muvaffaqiyatli yakunlandi! Barcha jadvallar yaratildi.");

  } catch (dbErr) {
    console.error("\n❌ Migratsiya bajarishda xatolik yuz berdi:", dbErr.message);
  } finally {
    await client.end();
  }
}

run();
