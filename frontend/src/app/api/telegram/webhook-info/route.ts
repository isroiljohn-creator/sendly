import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDbDataFromSupabase } from "@/lib/telegramBotRunner";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

export async function GET() {
  try {
    let dbData: any = {};
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbData = await getDbDataFromSupabase();
    } else {
      if (fs.existsSync(DB_FILE)) {
        dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      }
    }

    const tgBots: Array<{ id: string; username: string; hasToken: boolean; webhookInfo?: any; error?: string }> = [];

    // Extract telegram channels
    const extractChannels = (channelsRaw: any, ownerId: string) => {
      try {
        const channels = typeof channelsRaw === "string" ? JSON.parse(channelsRaw) : channelsRaw;
        if (Array.isArray(channels)) {
          channels.forEach((c: any) => {
            if (c.type === "telegram" && c.isConnected && c.telegramToken) {
              tgBots.push({
                id: c.id,
                username: c.username,
                hasToken: !!c.telegramToken,
                webhookInfo: null
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse channels for diagnostics:", e);
      }
    };

    if (dbData["replai_channels"]) {
      extractChannels(dbData["replai_channels"], "global");
    }

    if (dbData.userData && typeof dbData.userData === "object") {
      Object.entries(dbData.userData).forEach(([userId, userVal]: [string, any]) => {
        if (userVal && typeof userVal === "object" && userVal["replai_channels"]) {
          extractChannels(userVal["replai_channels"], userId);
        }
      });
    }

    // Now fetch webhook info for each active bot
    for (const bot of tgBots) {
      // Find the token again to query
      let token = "";
      const findToken = (channelsRaw: any) => {
        const channels = typeof channelsRaw === "string" ? JSON.parse(channelsRaw) : channelsRaw;
        if (Array.isArray(channels)) {
          const matched = channels.find((c: any) => c.id === bot.id);
          if (matched && matched.telegramToken) {
            token = matched.telegramToken;
          }
        }
      };

      if (dbData["replai_channels"]) findToken(dbData["replai_channels"]);
      if (!token && dbData.userData) {
        for (const userVal of Object.values(dbData.userData)) {
          if (userVal && typeof userVal === "object" && userVal["replai_channels"]) {
            findToken(userVal["replai_channels"]);
          }
          if (token) break;
        }
      }

      if (token) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getWebhookInfo`);
          if (res.ok) {
            const data = await res.json();
            bot.webhookInfo = data;
          } else {
            bot.error = `Telegram API error (webhook): ${res.status}`;
          }

          // Fetch getMe to verify actual bot username
          const meRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
          if (meRes.ok) {
            bot.botInfo = await meRes.json();
          } else {
            bot.error = (bot.error || "") + ` | Telegram API error (getMe): ${meRes.status}`;
          }
        } catch (err: any) {
          bot.error = `Fetch failed: ${err.message}`;
        }
      } else {
        bot.error = "Token not found in channels";
      }
    }

    return NextResponse.json({
      success: true,
      bots: tgBots
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
