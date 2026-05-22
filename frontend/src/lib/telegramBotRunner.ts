import fs from "fs";
import path from "path";
import { Channel, Automation } from "./db";

const DB_FILE = path.join(process.cwd(), "db.json");

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

interface TelegramBotState {
  active: boolean;
  token: string;
  offset: number;
}

async function sendTelegramMessage(token: string, chatId: number | string, text: string) {
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
      const errText = await res.text();
      console.error(`Failed to send Telegram message to ${chatId}: ${res.status} - ${errText}`);
    }
  } catch (err) {
    console.error(`Error sending Telegram message to ${chatId}:`, err);
  }
}

function updateDbFile(updater: (dbData: Record<string, string>) => void) {
  let dbData: Record<string, string> = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to read/parse db.json in updater", e);
    }
  }
  updater(dbData);
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write db.json in updater", e);
  }
}

async function runBotPollLoop(channelId: string, botState: TelegramBotState) {
  console.log(`Starting poll loop for bot channel ${channelId}`);
  while (botState.active) {
    try {
      const url = `https://api.telegram.org/bot${botState.token}/getUpdates?offset=${botState.offset}&timeout=10`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Telegram API HTTP error for bot ${channelId}: ${res.status}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      const data = await res.json();
      if (!data.ok) {
        console.error(`Telegram API error response for bot ${channelId}:`, data);
        if (data.error_code === 401 || data.description?.includes("unauthorized")) {
          console.error(`Stopping invalid token bot loop for ${channelId}`);
          botState.active = false;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        continue;
      }
      
      const updates = data.result || [];
      for (const update of updates) {
        botState.offset = Math.max(botState.offset, update.update_id + 1);
        
        const message = update.message;
        if (!message || !message.chat || !message.text) {
          continue;
        }
        
        const chatId = message.chat.id;
        const username = message.chat.username;
        const firstName = message.chat.first_name;
        const lastName = message.chat.last_name;
        const text = message.text;
        
        console.log(`Bot ${channelId} received message from ${chatId}: "${text}"`);
        
        updateDbFile((dbData) => {
          // 1. Get chats key
          const chatsKey = `replai_chats_${channelId}`;
          const rawChats = dbData[chatsKey];
          const chatsList: ChatThread[] = rawChats ? JSON.parse(rawChats) : [];
          
          // 2. Find or create chat
          let chat = chatsList.find((c: ChatThread) => c.id === String(chatId));
          if (!chat) {
            chat = {
              id: String(chatId),
              name: `${firstName || ""} ${lastName || ""}`.trim() || username || `Telegram User ${chatId}`,
              username: username || `tg_${chatId}`,
              avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop`,
              lastMessage: "",
              time: "",
              unread: true,
              messages: [],
              tags: ["Telegram"],
              liveTakeover: false,
            };
            chatsList.push(chat);
          }
          
          // 3. Add incoming message
          const timestamp = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
          const incomingMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: "user",
            text: text,
            timestamp: timestamp,
          };
          chat.messages.push(incomingMsg);
          chat.lastMessage = text;
          chat.time = "Hozir";
          chat.unread = true;
          
          // 4. Bot auto-reply if not liveTakeover
          if (!chat.liveTakeover) {
            // Read automations
            const rawAutos = dbData[`replai_automations_${channelId}`];
            const automations: Automation[] = rawAutos ? JSON.parse(rawAutos) : [];
            let matchedAutomation: Automation | null = null;
            let matchedKeyword = "";
            
            // Find active automations
            const activeAutos = automations.filter((a: Automation) => a.active);
            for (const auto of activeAutos) {
              if (auto.triggerType === "keyword") {
                const keywords = auto.triggerDetails
                  .split(",")
                  .map((k: string) => k.trim().toLowerCase())
                  .filter(Boolean);
                const foundKeyword = keywords.find((kw: string) =>
                  text.toLowerCase().includes(kw)
                );
                if (foundKeyword) {
                  matchedAutomation = auto;
                  matchedKeyword = foundKeyword;
                  break;
                }
              }
            }
            
            let botReplyText = "";
            if (matchedAutomation) {
              // Increment runs count
              matchedAutomation.runs = String(parseInt(matchedAutomation.runs || "0") + 1);
              dbData[`replai_automations_${channelId}`] = JSON.stringify(automations);
              
              const nameLower = matchedAutomation.name.toLowerCase();
              if (nameLower.includes("lead magnet") || matchedKeyword === "kitob" || matchedKeyword === "bonus") {
                botReplyText = "🤖 Bepul qo'llanma havolasi: https://sendly.uz/book. Obunangiz uchun rahmat! 📚";
              } else if (matchedKeyword === "/start" || matchedKeyword === "boshlash") {
                botReplyText = "🤖 Assalomu alaykum! Sendly chatbot xizmatiga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan! ⚡️";
              } else if (matchedKeyword === "narxi" || matchedKeyword === "tarif" || matchedKeyword === "kurs") {
                botReplyText = "🤖 Bizning tariflarimiz: \n• Pro: 150,000 so'm/oy (1ta akkaunt)\n• Premium: 1,000,000 so'm/oy (10ta akkaunt)\n\nBatafsil ma'lumot olish yoki ulanish uchun operatorimiz tez orada javob yozadi.";
              } else {
                botReplyText = `🤖 [Oqim: ${matchedAutomation.name}] bot avtomatik javob berdi! Kalit so'z: "${matchedKeyword}"`;
              }
            } else {
              // Send fallback reply
              botReplyText = "Murojaatingiz uchun rahmat! Tez orada operatorimiz sizga bog'lanadi. ⚡️";
            }
            
            if (botReplyText) {
              // Send message via Telegram API
              sendTelegramMessage(botState.token, chatId, botReplyText);
              
              // Log the reply
              const botMsg: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                sender: "bot",
                text: botReplyText,
                timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
              };
              chat.messages.push(botMsg);
              chat.lastMessage = botReplyText;
            }
          }
          
          // Save updated chats back to dbData
          dbData[chatsKey] = JSON.stringify(chatsList);
        });
      }
    } catch (err) {
      console.error(`Error in bot poll loop for ${channelId}:`, err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  console.log(`Exited poll loop for bot channel ${channelId}`);
}

export function startTelegramBots() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { success: true, message: "No db.json yet." };
    }
    const dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    
    // Parse channels
    const rawChannels = dbData["replai_channels"];
    const channels: Channel[] = rawChannels ? JSON.parse(rawChannels) : [];
    
    const activeTelegramChannels = channels.filter(
      (c: Channel) => c.type === "telegram" && c.isConnected && c.telegramToken
    );
    
    const globalBots = (global as unknown as { telegramBots?: Record<string, TelegramBotState> }).telegramBots || {};
    (global as unknown as { telegramBots?: Record<string, TelegramBotState> }).telegramBots = globalBots;
    
    const activeIds = new Set<string>();
    
    for (const channel of activeTelegramChannels) {
      const channelId = channel.id;
      if (!channel.telegramToken) continue;
      const token = channel.telegramToken.trim();
      activeIds.add(channelId);
      
      const existing = globalBots[channelId];
      if (existing) {
        if (existing.token !== token) {
          console.log(`Stopping bot for channel ${channelId} due to token change`);
          existing.active = false;
          delete globalBots[channelId];
        } else {
          continue;
        }
      }
      
      console.log(`Starting background bot runner for channel ${channelId} (${channel.username})`);
      const botState: TelegramBotState = {
        active: true,
        token: token,
        offset: 0,
      };
      globalBots[channelId] = botState;
      
      // Execute poll loop in the background
      runBotPollLoop(channelId, botState);
    }
    
    // Stop any bots that are no longer in the active list
    for (const channelId in globalBots) {
      if (!activeIds.has(channelId)) {
        console.log(`Stopping bot for channel ${channelId} (removed or disconnected)`);
        const existing = globalBots[channelId];
        if (existing) {
          existing.active = false;
        }
        delete globalBots[channelId];
      }
    }
    
    return {
      success: true,
      activeBots: Object.keys(globalBots),
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error starting bots:", error);
    return { success: false, error: errMsg };
  }
}
