import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file", err);
    return {};
  }
}

function writeDb(data: unknown) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing database file", err);
    return false;
  }
}

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

async function sendTelegramMessage(token: string, chatId: string | number, text: string) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
    if (!res.ok) {
      console.error(`Failed to send Telegram message to admin: ${res.status}`);
    }
  } catch (err) {
    console.error(`Error sending message to admin on verification:`, err);
  }
}

export async function POST(request: Request) {
  try {
    const { userId, channelId, code } = await request.json();
    if (!userId || !channelId || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let userSpecificData: Record<string, any> = {};
    let dbData: any = null;

    const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = useSupabase ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) : null;
    const cleanUserId = isValidUuid(userId) ? userId : "00000000-0000-0000-0000-000000000000";

    if (useSupabase && supabase) {
      const { data: userSettings } = await supabase
        .from("instagram_accounts")
        .select("fb_field_mappings")
        .eq("instagram_page_id", "global_settings_" + userId)
        .maybeSingle();
      if (userSettings?.fb_field_mappings) {
        userSpecificData = userSettings.fb_field_mappings;
      }
    } else {
      dbData = readDb();
      userSpecificData = dbData.userData?.[userId] || {};
    }

    // 1. Get verification code data
    const verifyCodeKey = `replai_tg_verify_code_${channelId}`;
    const rawVerifyData = userSpecificData[verifyCodeKey];
    if (!rawVerifyData) {
      return NextResponse.json({ error: "Tasdiqlash kodi topilmadi. Avval botga o'tib /start buyrug'ini yuboring." }, { status: 400 });
    }

    let verifyData: any;
    try {
      verifyData = typeof rawVerifyData === "string" ? JSON.parse(rawVerifyData) : rawVerifyData;
    } catch (e) {
      verifyData = rawVerifyData;
    }

    if (!verifyData || String(verifyData.code).trim() !== String(code).trim()) {
      return NextResponse.json({ error: "Tasdiqlash kodi noto'g'ri." }, { status: 400 });
    }

    // Check expiration (1 minute)
    if (Date.now() - (verifyData.timestamp || 0) > 1 * 60 * 1000) {
      return NextResponse.json({ error: "Tasdiqlash kodi muddati o'tgan. Botga qaytadan /start yuboring." }, { status: 400 });
    }

    // 2. Load and update Bot Settings
    const settingsKey = `replai_bot_settings_${channelId}`;
    const rawSettings = userSpecificData[settingsKey];
    let settings: any = {};
    if (rawSettings) {
      try {
        settings = typeof rawSettings === "string" ? JSON.parse(rawSettings) : rawSettings;
      } catch (e) {
        settings = {};
      }
    }

    settings.adminTelegramChatId = String(verifyData.chatId);
    settings.adminTelegramUsername = verifyData.username;
    settings.telegramBotId = channelId;

    userSpecificData[settingsKey] = JSON.stringify(settings);
    // Delete verification code
    delete userSpecificData[verifyCodeKey];

    // 3. Save back
    if (useSupabase && supabase) {
      await supabase
        .from("instagram_accounts")
        .upsert({
          user_id: cleanUserId,
          instagram_page_id: "global_settings_" + userId,
          access_token: "global_settings_token",
          fb_field_mappings: userSpecificData
        }, { onConflict: "instagram_page_id" });
    } else {
      if (!dbData.userData) {
        dbData.userData = {};
      }
      dbData.userData[userId] = userSpecificData;
      writeDb(dbData);
    }

    // 4. Retrieve bot token to notify the admin
    const rawUserChannels = userSpecificData["replai_channels"];
    let token = "";
    if (rawUserChannels) {
      try {
        const userChannels = typeof rawUserChannels === "string" ? JSON.parse(rawUserChannels) : rawUserChannels;
        if (Array.isArray(userChannels)) {
          const ch = userChannels.find((c: any) => c.id === channelId);
          if (ch && ch.telegramToken) {
            token = ch.telegramToken;
          }
        }
      } catch (e) {
        console.error("Failed to extract channels in verification API", e);
      }
    }

    if (token) {
      await sendTelegramMessage(token, verifyData.chatId, "Tabriklaymiz! Siz ushbu bot uchun kurator (admin) qilib muvaffaqiyatli tayinlandingiz. Mijozlar suhbatni operatorga yo'naltirishni so'rashsa, sizga xabar yuboriladi.");
    }

    return NextResponse.json({
      success: true,
      username: verifyData.username,
      chatId: verifyData.chatId
    });

  } catch (err: any) {
    console.error("Error in verify-admin route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
