import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (err) {
    console.error("Read DB failed in MCP bridge:", err);
    return {};
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Write DB failed in MCP bridge:", err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tool, arguments: args } = body;
    
    // Auth: look for API Key or userId in headers/body
    const authHeader = request.headers.get("Authorization") || "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userId = request.headers.get("x-user-id") || body.userId || "00000000-0000-0000-0000-000000000000";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing credentials" }, { status: 401 });
    }

    // 1. Check if running in Supabase mode
    const isSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (isSupabase) {
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      // Load user setting context
      const { data: settingRow } = await supabase
        .from("instagram_accounts")
        .select("fb_field_mappings")
        .eq("instagram_page_id", "global_settings_" + userId)
        .maybeSingle();

      const context = settingRow?.fb_field_mappings || {};

      switch (tool) {
        case "list_contacts": {
          const rawContacts = context.replai_contacts;
          const contacts = rawContacts ? (typeof rawContacts === "string" ? JSON.parse(rawContacts) : rawContacts) : [];
          return NextResponse.json({ contacts });
        }

        case "get_chats": {
          const channelId = args?.channelId;
          const userChannels = context.replai_channels ? (typeof context.replai_channels === "string" ? JSON.parse(context.replai_channels) : context.replai_channels) : [];
          
          const chats: Record<string, any> = {};
          for (const ch of userChannels) {
            if (channelId && ch.id !== channelId) continue;
            const chatKey = `replai_chats_${ch.id}`;
            chats[ch.id] = context[chatKey] ? (typeof context[chatKey] === "string" ? JSON.parse(context[chatKey]) : context[chatKey]) : [];
          }
          return NextResponse.json({ chats });
        }

        case "get_chat_history": {
          const { channelId, chatId } = args || {};
          if (!channelId || !chatId) {
            return NextResponse.json({ error: "Missing channelId or chatId" }, { status: 400 });
          }
          const chatKey = `replai_chats_${channelId}`;
          const rawChats = context[chatKey];
          const chatsList = rawChats ? (typeof rawChats === "string" ? JSON.parse(rawChats) : rawChats) : [];
          const thread = chatsList.find((c: any) => c.id === String(chatId));
          return NextResponse.json({ thread: thread || null });
        }

        case "send_message": {
          const { channelId, chatId, text } = args || {};
          if (!channelId || !chatId || !text) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
          }

          // Fetch token for bot channel
          const userChannels = context.replai_channels ? (typeof context.replai_channels === "string" ? JSON.parse(context.replai_channels) : context.replai_channels) : [];
          const targetChannel = userChannels.find((c: any) => c.id === channelId);
          if (!targetChannel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
          }

          // Dispatch message to Telegram API
          const token = targetChannel.token;
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text })
          });

          if (!tgRes.ok) {
            return NextResponse.json({ error: "Telegram API dispatch failed" }, { status: 502 });
          }

          // Append operator reply message in thread history
          const chatKey = `replai_chats_${channelId}`;
          const rawChats = context[chatKey];
          const chatsList = rawChats ? (typeof rawChats === "string" ? JSON.parse(rawChats) : rawChats) : [];
          let thread = chatsList.find((c: any) => c.id === String(chatId));
          if (thread) {
            thread.messages.push({
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sender: "agent",
              text,
              timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
            });
            thread.lastMessage = text;
            thread.unread = false;

            context[chatKey] = chatsList;
            await supabase
              .from("instagram_accounts")
              .upsert({
                user_id: userId,
                instagram_page_id: "global_settings_" + userId,
                access_token: "global_settings_token",
                fb_field_mappings: context
              }, { onConflict: "instagram_page_id" });
          }

          return NextResponse.json({ success: true });
        }

        case "get_analytics": {
          const credits = context.replai_ai_credits_data ? (typeof context.replai_ai_credits_data === "string" ? JSON.parse(context.replai_ai_credits_data) : context.replai_ai_credits_data) : { balance: 0 };
          const userChannels = context.replai_channels ? (typeof context.replai_channels === "string" ? JSON.parse(context.replai_channels) : context.replai_channels) : [];
          
          let totalChatsCount = 0;
          for (const ch of userChannels) {
            const list = context[`replai_chats_${ch.id}`];
            const parsed = list ? (typeof list === "string" ? JSON.parse(list) : list) : [];
            totalChatsCount += parsed.length;
          }

          return NextResponse.json({
            creditsBalance: credits.balance,
            channelsCount: userChannels.length,
            activeChatsCount: totalChatsCount,
            platform: "Supabase production mode"
          });
        }

        default:
          return NextResponse.json({ error: "Unsupported MCP tool" }, { status: 404 });
      }
    } else {
      // 2. Local File mode (db.json)
      const dbData = readDb();
      if (!dbData.userData) dbData.userData = {};
      const context = dbData.userData[userId] || {};

      switch (tool) {
        case "list_contacts": {
          const rawContacts = context.replai_contacts;
          const contacts = rawContacts ? JSON.parse(rawContacts) : [];
          return NextResponse.json({ contacts });
        }

        case "get_chats": {
          const channelId = args?.channelId;
          const userChannels = context.replai_channels ? JSON.parse(context.replai_channels) : [];
          
          const chats: Record<string, any> = {};
          for (const ch of userChannels) {
            if (channelId && ch.id !== channelId) continue;
            const chatKey = `replai_chats_${ch.id}`;
            chats[ch.id] = context[chatKey] ? JSON.parse(context[chatKey]) : [];
          }
          return NextResponse.json({ chats });
        }

        case "get_chat_history": {
          const { channelId, chatId } = args || {};
          if (!channelId || !chatId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
          }
          const chatKey = `replai_chats_${channelId}`;
          const rawChats = context[chatKey];
          const chatsList = rawChats ? JSON.parse(rawChats) : [];
          const thread = chatsList.find((c: any) => c.id === String(chatId));
          return NextResponse.json({ thread: thread || null });
        }

        case "send_message": {
          const { channelId, chatId, text } = args || {};
          if (!channelId || !chatId || !text) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
          }

          const userChannels = context.replai_channels ? JSON.parse(context.replai_channels) : [];
          const targetChannel = userChannels.find((c: any) => c.id === channelId);
          if (!targetChannel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
          }

          const token = targetChannel.token;
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text })
          });

          if (!tgRes.ok) {
            return NextResponse.json({ error: "Telegram API dispatch failed" }, { status: 502 });
          }

          const chatKey = `replai_chats_${channelId}`;
          const rawChats = context[chatKey];
          const chatsList = rawChats ? JSON.parse(rawChats) : [];
          let thread = chatsList.find((c: any) => c.id === String(chatId));
          if (thread) {
            thread.messages.push({
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sender: "agent",
              text,
              timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
            });
            thread.lastMessage = text;
            thread.unread = false;

            context[chatKey] = JSON.stringify(chatsList);
            writeDb(dbData);
          }

          return NextResponse.json({ success: true });
        }

        case "get_analytics": {
          const credits = context.replai_ai_credits_data ? JSON.parse(context.replai_ai_credits_data) : { balance: 0 };
          const userChannels = context.replai_channels ? JSON.parse(context.replai_channels) : [];
          
          let totalChatsCount = 0;
          for (const ch of userChannels) {
            const list = context[`replai_chats_${ch.id}`];
            const parsed = list ? JSON.parse(list) : [];
            totalChatsCount += parsed.length;
          }

          return NextResponse.json({
            creditsBalance: credits.balance,
            channelsCount: userChannels.length,
            activeChatsCount: totalChatsCount,
            platform: "Local file database mode"
          });
        }

        default:
          return NextResponse.json({ error: "Unsupported MCP tool" }, { status: 404 });
      }
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[MCP Bridge Error]:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
