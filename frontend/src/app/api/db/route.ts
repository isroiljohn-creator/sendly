import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { startTelegramBots } from "@/lib/telegramBotRunner";

const DB_FILE = path.join(process.cwd(), "db.json");

function getInitialData() {
  return {};
}

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(getInitialData(), null, 2), "utf8");
      return getInitialData();
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, returning empty state", err);
    return getInitialData();
  }
}

function writeDb(data: unknown) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing to database file", err);
    return false;
  }
}

export async function GET() {
  const data = readDb();
  try {
    startTelegramBots();
  } catch (err) {
    console.error("Failed to auto-start telegram bots on db GET:", err);
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const success = writeDb(data);
    if (success) {
      try {
        startTelegramBots();
      } catch (err) {
        console.error("Failed to auto-start telegram bots on db POST:", err);
      }
    }
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
  }
}
