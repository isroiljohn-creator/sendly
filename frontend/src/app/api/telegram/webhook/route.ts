import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDbDataFromSupabase, handleTelegramUpdate } from "@/lib/telegramBotRunner";
import * as pgdb from "@/lib/pgdb";

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
    if (pgdb.isConfigured()) {
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

    if (channelId === "system_bot") {
      token = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
    }

    // Check legacy channels
    if (!token) {
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

    // Origin validation: Verify Telegram Webhook Secret Token to prevent spoofing
    const telegramSecretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    const expectedSecretToken = crypto.createHash("sha256").update(token.trim()).digest("hex").substring(0, 32);

    if (telegramSecretHeader !== expectedSecretToken) {
      console.warn(`[Webhook] Spoofing attempt detected or invalid secret token for channel ${channelId}`);
      return NextResponse.json({ error: "Forbidden: Request origin invalid" }, { status: 403 });
    }

    // 2. Process Telegram Update using the bot runner logic
    await handleTelegramUpdate(channelId, token.trim(), update);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in telegram webhook handler:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
