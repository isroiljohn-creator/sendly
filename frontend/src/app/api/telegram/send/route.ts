import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyJwt } from "@/lib/jwt";
import * as pgdb from "@/lib/pgdb";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "agent";
  text: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
  tags: string[];
  liveTakeover?: boolean;
}

const LOCK_DIR = path.join(process.cwd(), "db.lock");

function acquireFileLock(): boolean {
  const maxRetries = 15;
  const retryDelay = 50; // ms
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.mkdirSync(LOCK_DIR);
      return true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        const start = Date.now();
        while (Date.now() - start < retryDelay) {
          // block
        }
      } else {
        return false;
      }
    }
  }
  return false;
}

function releaseFileLock() {
  try {
    if (fs.existsSync(LOCK_DIR)) {
      fs.rmdirSync(LOCK_DIR);
    }
  } catch (e) {
    // ignore
  }
}

function readDbUnlocked() {
  if (!fs.existsSync(DB_FILE)) return {};
  const data = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(data);
}

function writeDbUnlocked(data: unknown) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  return true;
}

function readDb() {
  const hasLock = acquireFileLock();
  try {
    return readDbUnlocked();
  } catch (err) {
    console.error("Error reading database file in send API", err);
    return {};
  } finally {
    if (hasLock) releaseFileLock();
  }
}

function writeDb(data: unknown) {
  const hasLock = acquireFileLock();
  try {
    return writeDbUnlocked(data);
  } catch (err) {
    console.error("Error writing database file in send API", err);
    return false;
  } finally {
    if (hasLock) releaseFileLock();
  }
}

function splitTelegramMessage(text: string, maxLength = 4000): string[] {
  if (!text) return [""];
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }
    
    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get("Authorization");
    const tokenHeader = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!tokenHeader || !jwtSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized: Missing token" }, { status: 401 });
    }
    
    const payload = verifyJwt(tokenHeader, jwtSecret);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Forbidden: Access denied" }, { status: 403 });
    }
    const userId = payload.user_id;

    const { chatId, text, channelId } = await request.json();

    if (!chatId || !text || !channelId) {
      return NextResponse.json({ success: false, error: "Missing chatId, text, or channelId" }, { status: 400 });
    }

    // 2. Validate Channel Ownership and Retrieve Secure Token from DB
    let userChannels: any[] = [];
    if (pgdb.isConfigured()) {
      try {
        const uData = await pgdb.getValue("global_settings_" + userId) || {};
        const rawChannels = uData.replai_channels;
        userChannels = rawChannels ? (typeof rawChannels === "string" ? JSON.parse(rawChannels) : rawChannels) : [];
      } catch (e) {
        console.error("Failed to read user channels in send API", e);
      }
    } else {
      const dbData = readDb();
      const userData = dbData.userData?.[userId] || {};
      const rawChannels = userData.replai_channels;
      userChannels = rawChannels ? (typeof rawChannels === "string" ? JSON.parse(rawChannels) : rawChannels) : [];
    }

    const channelObj = userChannels.find((c: any) => c.id === channelId && c.type === "telegram");
    if (!channelObj) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not own this channel" }, { status: 403 });
    }

    const token = channelObj.telegramToken;
    if (!token) {
      return NextResponse.json({ success: false, error: "Forbidden: Channel has no active bot token" }, { status: 403 });
    }

    let telegramSuccess = false;
    let telegramError = "";

    // 3. Send Message via Telegram API (with length splitting)
    try {
      const chunks = splitTelegramMessage(text);
      let allSuccess = true;
      let lastError = "";

      for (const chunk of chunks) {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
          }),
        });

        if (!res.ok) {
          allSuccess = false;
          lastError = await res.text();
        }
      }

      if (allSuccess) {
        telegramSuccess = true;
      } else {
        telegramError = lastError;
      }
    } catch (err: unknown) {
      telegramError = err instanceof Error ? err.message : String(err);
    }

    // 4. Log message in database (using pgdb or local db.json)
    if (pgdb.isConfigured()) {
      try {
        const uData = await pgdb.getValue("global_settings_" + userId) || {};
        const chatsKey = `replai_chats_${channelId}`;
        const rawChats = uData[chatsKey];
        const chatsList: ChatThread[] = rawChats ? (typeof rawChats === "string" ? JSON.parse(rawChats) : rawChats) : [];

        let chat = chatsList.find((c) => c.id === String(chatId));
        if (!chat) {
          chat = {
            id: String(chatId),
            name: `User ${chatId}`,
            username: `tg_${chatId}`,
            avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop`,
            lastMessage: "",
            time: "",
            unread: false,
            messages: [],
            tags: ["Telegram"],
            liveTakeover: false,
          };
          chatsList.push(chat);
        }

        const timestamp = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
        const operatorMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sender: "agent",
          text: text,
          timestamp: timestamp,
        };

        chat.messages.push(operatorMsg);
        chat.lastMessage = text;
        chat.time = "Hozir";
        chat.unread = false;

        uData[chatsKey] = chatsList;
        await pgdb.setValue("global_settings_" + userId, uData);
      } catch (e) {
        console.error("Failed to log telegram send message to pgdb", e);
      }
    } else {
      const dbData = readDb();
      const chatsKey = `replai_chats_${channelId}`;
      const rawChats = dbData[chatsKey];
      const chatsList: ChatThread[] = rawChats ? JSON.parse(rawChats) : [];

      let chat = chatsList.find((c) => c.id === String(chatId));
      if (!chat) {
        chat = {
          id: String(chatId),
          name: `User ${chatId}`,
          username: `tg_${chatId}`,
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop`,
          lastMessage: "",
          time: "",
          unread: false,
          messages: [],
          tags: ["Telegram"],
          liveTakeover: false,
          };
        chatsList.push(chat);
      }

      const timestamp = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
      const operatorMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: "agent",
        text: text,
        timestamp: timestamp,
      };

      chat.messages.push(operatorMsg);
      chat.lastMessage = text;
      chat.time = "Hozir";
      chat.unread = false;

      dbData[chatsKey] = JSON.stringify(chatsList);
      writeDb(dbData);
    }

    return NextResponse.json({
      success: true,
      telegramSuccess,
      telegramError,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
