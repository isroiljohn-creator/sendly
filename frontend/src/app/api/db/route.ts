import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { startTelegramBots } from "@/lib/telegramBotRunner";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "guest";
  
  let dbData = readDb();
  
  // Migration support for old format without userData/users
  if (dbData && !dbData.userData && !dbData.users) {
    const users = dbData.replai_users ? JSON.parse(dbData.replai_users) : [];
    dbData = {
      users: users,
      userData: {}
    };
    writeDb(dbData);
  }
  
  // Extract user's specific data
  const userSpecificData = dbData.userData?.[userId] || {};
  
  // Combine userSpecificData with global users list
  const responseData = {
    replai_users: JSON.stringify(dbData.users || []),
    ...userSpecificData
  };

  try {
    startTelegramBots();
  } catch (err) {
    console.error("Failed to auto-start telegram bots on db GET:", err);
  }
  return NextResponse.json(responseData);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "guest";
    const payload = await request.json();
    
    let dbData = readDb();
    
    // Migration support for old format
    if (dbData && !dbData.userData && !dbData.users) {
      const users = dbData.replai_users ? JSON.parse(dbData.replai_users) : [];
      dbData = {
        users: users,
        userData: {}
      };
    }

    if (!dbData.userData) {
      dbData.userData = {};
    }
    if (!dbData.users) {
      dbData.users = [];
    }

    // 1. Update shared user list if present in payload
    if (payload.replai_users) {
      try {
        dbData.users = JSON.parse(payload.replai_users);
      } catch (e) {
        console.error("Failed to parse replai_users payload:", e);
      }
    }

    // 2. Isolate all other fields starting with replai_ under userData[userId]
    if (!dbData.userData[userId]) {
      dbData.userData[userId] = {};
    }

    Object.entries(payload).forEach(([key, val]) => {
      if (
        key.startsWith("replai_") &&
        key !== "replai_users" &&
        key !== "replai_current_user" &&
        key !== "replai_ai_credits_data"
      ) {
        dbData.userData[userId][key] = val;
      }
    });

    const success = writeDb(dbData);
    
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
