import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbDataFromSupabase, handleTelegramUpdate } from "@/lib/telegramBotRunner";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    
    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const update = await request.json();
    console.log(`[Webhook API] Received Telegram update for channel ${channelId}:`, JSON.stringify(update));

    // 1. Fetch config to get the token for the given channelId
    let dbData: any = {};
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbData = await getDbDataFromSupabase();
    } else {
      if (fs.existsSync(DB_FILE)) {
        try {
          dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        } catch (e) {
          console.error("Failed to read db.json in webhook API:", e);
        }
      }
    }

    let token: string | null = null;

    // Check legacy channels
    const rawChannels = dbData["replai_channels"];
    const legacyChannels = rawChannels ? JSON.parse(rawChannels) : [];
    if (Array.isArray(legacyChannels)) {
      for (const c of legacyChannels) {
        if (c.id === channelId && c.type === "telegram" && c.isConnected && c.telegramToken) {
          token = c.telegramToken;
          break;
        }
      }
    }

    // Check user-specific channels
    if (!token && dbData.userData && typeof dbData.userData === "object") {
      for (const userVal of Object.values(dbData.userData)) {
        if (userVal && typeof userVal === "object") {
          const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
          const userChannels = rawUserChannels ? JSON.parse(rawUserChannels) : [];
          if (Array.isArray(userChannels)) {
            for (const c of userChannels) {
              if (c.id === channelId && c.type === "telegram" && c.isConnected && c.telegramToken) {
                token = c.telegramToken;
                break;
              }
            }
          }
        }
        if (token) break;
      }
    }

    if (!token) {
      console.warn(`[Webhook] No active Telegram bot token found for channel ID: ${channelId}`);
      return NextResponse.json({ error: "Active bot token not found" }, { status: 404 });
    }

    // 2. Process Telegram Update using the bot runner logic
    await handleTelegramUpdate(channelId, token.trim(), update);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in telegram webhook handler:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
