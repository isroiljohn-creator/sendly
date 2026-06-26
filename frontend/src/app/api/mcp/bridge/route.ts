import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as pgdb from "@/lib/pgdb";

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

function safeParse(val: any, fallback: any = null) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
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

    // 1. Check if running in Railway mode
    const useRailway = pgdb.isConfigured();

    if (useRailway) {
      // Load user setting context
      const context = await pgdb.getValue("global_settings_" + userId) || {};

      switch (tool) {
        case "list_contacts": {
          const rawContacts = context.replai_contacts;
          const contacts = safeParse(rawContacts, []);
          return NextResponse.json({ contacts });
        }

        case "get_chats": {
          const channelId = args?.channelId;
          const userChannels = safeParse(context.replai_channels, []);
          
          const chats: Record<string, any> = {};
          for (const ch of userChannels) {
            if (channelId && ch.id !== channelId) continue;
            const chatKey = `replai_chats_${ch.id}`;
            chats[ch.id] = safeParse(context[chatKey], []);
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
          const chatsList = safeParse(rawChats, []);
          const thread = chatsList.find((c: any) => c.id === String(chatId));
          return NextResponse.json({ thread: thread || null });
        }

        case "send_message": {
          const { channelId, chatId, text } = args || {};
          if (!channelId || !chatId || !text) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
          }

          // Fetch token for bot channel
          const userChannels = safeParse(context.replai_channels, []);
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
          const chatsList = safeParse(rawChats, []);
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
            await pgdb.setValue("global_settings_" + userId, context);
          }

          return NextResponse.json({ success: true });
        }

        case "get_analytics": {
          const credits = safeParse(context.replai_ai_credits_data, { balance: 0 });
          const userChannels = safeParse(context.replai_channels, []);
          
          let totalChatsCount = 0;
          for (const ch of userChannels) {
            const list = context[`replai_chats_${ch.id}`];
            const parsed = safeParse(list, []);
            totalChatsCount += parsed.length;
          }

          return NextResponse.json({
            creditsBalance: credits.balance,
            channelsCount: userChannels.length,
            activeChatsCount: totalChatsCount,
            platform: "Railway production mode"
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
          const contacts = safeParse(rawContacts, []);
          return NextResponse.json({ contacts });
        }

        case "get_chats": {
          const channelId = args?.channelId;
          const userChannels = safeParse(context.replai_channels, []);
          
          const chats: Record<string, any> = {};
          for (const ch of userChannels) {
            if (channelId && ch.id !== channelId) continue;
            const chatKey = `replai_chats_${ch.id}`;
            chats[ch.id] = safeParse(context[chatKey], []);
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
          const chatsList = safeParse(rawChats, []);
          const thread = chatsList.find((c: any) => c.id === String(chatId));
          return NextResponse.json({ thread: thread || null });
        }

        case "send_message": {
          const { channelId, chatId, text } = args || {};
          if (!channelId || !chatId || !text) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
          }

          const userChannels = safeParse(context.replai_channels, []);
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
          const chatsList = safeParse(rawChats, []);
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
          const credits = safeParse(context.replai_ai_credits_data, { balance: 0 });
          const userChannels = safeParse(context.replai_channels, []);
          
          let totalChatsCount = 0;
          for (const ch of userChannels) {
            const list = context[`replai_chats_${ch.id}`];
            const parsed = safeParse(list, []);
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
