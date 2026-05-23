import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

export async function POST(request: Request) {
  try {
    const { chatId, text, token, channelId } = await request.json();

    if (!chatId || !text) {
      return NextResponse.json({ success: false, error: "Missing chatId or text" }, { status: 400 });
    }

    let telegramSuccess = false;
    let telegramError = "";

    // 1. Send via Telegram API if token is provided
    if (token) {
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

        if (res.ok) {
          telegramSuccess = true;
        } else {
          telegramError = await res.text();
        }
      } catch (err: unknown) {
        telegramError = err instanceof Error ? err.message : String(err);
      }
    } else {
      // If no token, treat as simulated success
      telegramSuccess = true;
    }

    // 2. Log message in db.json if channelId is provided
    if (channelId) {
      const dbPath = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");
      let dbData: Record<string, string> = {};
      
      if (fs.existsSync(dbPath)) {
        try {
          dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        } catch (e) {
          console.error("Failed to parse db.json in send api:", e);
        }
      }

      const chatsKey = `replai_chats_${channelId}`;
      const rawChats = dbData[chatsKey];
      const chatsList: ChatThread[] = rawChats ? JSON.parse(rawChats) : [];

      let chat = chatsList.find((c) => c.id === String(chatId));
      if (!chat) {
        // Create chat if it doesn't exist (e.g. first reply to a new contact)
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
      chat.unread = false; // operator replied, so it's read

      dbData[chatsKey] = JSON.stringify(chatsList);

      try {
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf-8");
      } catch (e) {
        console.error("Failed to write db.json in send api:", e);
      }
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
