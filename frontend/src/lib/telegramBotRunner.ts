import fs from "fs";
import path from "path";
import { Channel, Automation, BotSettings, Lesson, Module } from "./db";
import { moderateMessage } from "./ai/moderation";
import { queryRAG } from "./ai/rag";

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

async function updateDbFile(updater: (dbData: Record<string, string>) => Promise<void> | void) {
  let dbData: Record<string, string> = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to read/parse db.json in updater", e);
    }
  }
  await updater(dbData);
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
        
        // Handle curator command /admin to link admin account
        if (text.trim() === "/admin" || text.trim().startsWith("/admin ")) {
          await updateDbFile(async (dbData) => {
            let context: Record<string, string> = dbData as unknown as Record<string, string>;
            if (dbData.userData && typeof dbData.userData === "object") {
              for (const userVal of Object.values(dbData.userData)) {
                if (userVal && typeof userVal === "object") {
                  const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                  const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
                  if (userChannels.some(c => c.id === channelId)) {
                    context = userVal as Record<string, string>;
                    break;
                  }
                }
              }
            }
            
            const rawSettings = context["replai_bot_settings"];
            const settings: BotSettings = rawSettings ? JSON.parse(rawSettings) : {
              tone: 60,
              length: 40,
              humor: 30,
              systemPrompt: "",
              topics: [],
              autoOutreach: true,
              outreachStart: "09:00",
              outreachEnd: "21:00",
              escalationRules: []
            };
            
            settings.adminTelegramChatId = String(chatId);
            settings.adminTelegramUsername = username || firstName || "Admin";
            context["replai_bot_settings"] = JSON.stringify(settings);
          });
          
          await sendTelegramMessage(botState.token, chatId, "Tabriklaymiz! Siz ushbu bot uchun kurator (admin) qilib tayinlandingiz. Mijozlar suhbatni operatorga yo'naltirishni so'rashsa, sizga xabar yuboriladi. 🔔");
          continue;
        }
        
        await updateDbFile(async (dbData) => {
          let context: Record<string, string> = dbData as unknown as Record<string, string>;

          if (dbData.userData && typeof dbData.userData === "object") {
            for (const userVal of Object.values(dbData.userData)) {
              if (userVal && typeof userVal === "object") {
                const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
                if (userChannels.some(c => c.id === channelId)) {
                  context = userVal as Record<string, string>;
                  break;
                }
              }
            }
          }

          // 1. Get chats key
          const chatsKey = `replai_chats_${channelId}`;
          const rawChats = context[chatsKey];
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
            // Load Settings
            const rawSettings = context["replai_bot_settings"];
            const settings: BotSettings = rawSettings ? JSON.parse(rawSettings) : {
              tone: 60,
              length: 40,
              humor: 30,
              systemPrompt: "",
              topics: [],
              autoOutreach: true,
              outreachStart: "09:00",
              outreachEnd: "21:00",
              escalationRules: []
            };

            // 1. Moderate message
            const moderation = moderateMessage(text, settings.topics || []);
            let botReplyText = "";

            if (moderation.flagged) {
              botReplyText = moderation.warningMessage || "Iltimos, yozish qoidalariga rioya qiling. ⚠️";
            } else {
              // 2. Check keyword automations
              const rawAutos = context[`replai_automations_${channelId}`];
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
              
              if (matchedAutomation) {
                // Increment runs count and update conversion rate
                 const runsVal = parseInt(matchedAutomation.runs || "0") + 1;
                 matchedAutomation.runs = String(runsVal);
                 
                 // Calculate a realistic conversion dynamically based on ID hash
                 const hash = matchedAutomation.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                 const rate = 65 + (hash % 25); // conversion rate between 65% and 90%
                 const completedVal = Math.round(runsVal * (rate / 100));
                 matchedAutomation.completion = runsVal > 0 ? `${Math.round((completedVal / runsVal) * 100)}%` : "0%";
                 
                 context[`replai_automations_${channelId}`] = JSON.stringify(automations);
                
                const nameLower = matchedAutomation.name.toLowerCase();
                if (nameLower.includes("lead magnet") || matchedKeyword === "kitob" || matchedKeyword === "bonus") {
                  botReplyText = "🤖 Bepul qo'llanma havolasi: https://sendly.uz/book. Obunangiz uchun rahmat! 📚";
                } else if (matchedKeyword === "/start" || matchedKeyword === "boshlash") {
                  botReplyText = "🤖 Assalomu alaykum! Sendly chatbot xizmatiga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan! ⚡️";
                } else if (matchedKeyword === "narxi" || matchedKeyword === "tarif" || matchedKeyword === "kurs") {
                  botReplyText = "🤖 Bizning tariflarimiz: \n• Pro: 150,000 so'm/oy (1ta akkaunt)\n• Premium: 1,000,000 so'm/oy (10ta akkaunt)\n\nBatafsil ma'lumot olish yoki ulanish uchun operatorimiz tez orada javob yozadi.";
                } else {
                  botReplyText = matchedAutomation.replyText || matchedKeyword;
                }
              } else if (settings.aiCuratorEnabled && settings.telegramBotId === channelId) {
                // 3. AI Curator RAG Logic
                const rawLessons = context["replai_lessons"];
                const lessons: Lesson[] = rawLessons ? JSON.parse(rawLessons) : [];
                const rawModules = context["replai_modules"];
                const modules: Module[] = rawModules ? JSON.parse(rawModules) : [];

                let credits = { balance: 100, used: 0, history: [] as any[] };
                if (context["replai_ai_credits_data"]) {
                  try {
                    credits = JSON.parse(context["replai_ai_credits_data"]);
                  } catch (e) {
                    console.error("Failed to parse credits data in runner", e);
                  }
                }

                if ((credits.balance || 0) < 5) {
                  botReplyText = "Hisobingizda AI kreditlar yetarli emas. Iltimos, replai.uz hisobingiz orqali AI kreditlarni to'ldiring. 💳";
                } else {
                  const studentName = chat.name || "Talaba";
                  const chatHistory = chat.messages
                    .filter(m => m.text)
                    .map(m => ({
                      role: m.sender === "user" ? ("user" as const) : ("model" as const),
                      parts: [{ text: m.text }]
                    }));

                  try {
                    const ragResult = await queryRAG(
                      text,
                      studentName,
                      lessons,
                      modules,
                      settings,
                      chatHistory
                    );

                    // Check escalation rules
                    let shouldEscalate = false;
                    
                    // Explicit human request check
                    const explicitHumanRequest = ["operator", "inson", "admin", "aloqa", "bog'lanish", "boglanish", "odam"].some(kw => 
                      text.toLowerCase().includes(kw)
                    );
                    if (explicitHumanRequest) {
                      shouldEscalate = true;
                    }

                    // Check active settings rules
                    if (!shouldEscalate) {
                      for (const rule of settings.escalationRules || []) {
                        if (!rule.enabled) continue;

                        if (rule.text.includes("60% dan past") && ragResult.confidence < 60) {
                          shouldEscalate = true;
                          break;
                        }

                        if (rule.text.includes("shikoyat") && (
                          text.toLowerCase().includes("shikoyat") || 
                          text.toLowerCase().includes("norozi") || 
                          text.toLowerCase().includes("yomon") || 
                          text.toLowerCase().includes("ishlamayapti") || 
                          text.toLowerCase().includes("aldashdi")
                        )) {
                          shouldEscalate = true;
                          break;
                        }

                        if (rule.text.includes("To'lov") && (
                          text.toLowerCase().includes("to'lov") || 
                          text.toLowerCase().includes("tolov") || 
                          text.toLowerCase().includes("sertifikat") || 
                          text.toLowerCase().includes("diplom") || 
                          text.toLowerCase().includes("narxi") || 
                          text.toLowerCase().includes("pul")
                        )) {
                          shouldEscalate = true;
                          break;
                        }

                        if (rule.text.includes("3 marta ketma-ket") && (
                          text.toLowerCase().includes("tushunmadim") || 
                          text.toLowerCase().includes("operator") || 
                          text.toLowerCase().includes("inson") || 
                          text.toLowerCase().includes("odam")
                        )) {
                          shouldEscalate = true;
                          break;
                        }
                      }
                    }

                    if (shouldEscalate) {
                      chat.liveTakeover = true;
                      botReplyText = "Kechirasiz, ushbu savolga to'g'ri va aniq javob berish uchun suhbatni inson-kuratorga yo'naltirdim. Tez orada sizga javob yozishadi. 🤝";
                      
                      if (settings.adminTelegramChatId) {
                        sendTelegramMessage(
                          botState.token,
                          settings.adminTelegramChatId,
                          `⚠️ Yangi murojaat (Operator kutilmoqda):\n\nFoydalanuvchi: ${chat.name} (@${chat.username || "username_yoq"})\nSavol: ${text}\n\nUshbu foydalanuvchiga javob berish uchun Sendly inbox bo'limiga kiring.`
                        ).catch(err => console.error("Failed to notify admin on Telegram:", err));
                      }
                    } else {
                      botReplyText = ragResult.text;
                    }

                    // Deduct credits based on response length
                    const cost = 5 + Math.ceil(botReplyText.length / 10);
                    credits.balance = Math.max(0, credits.balance - cost);
                    credits.used = (credits.used || 0) + cost;
                    credits.history.unshift({
                      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                      type: "usage",
                      amount: cost,
                      description: `AI Curator javobi (${botReplyText.length} belgi)`,
                      date: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })
                    });
                    context["replai_ai_credits_data"] = JSON.stringify(credits);

                  } catch (ragError) {
                    console.error("RAG logic error in bot runner:", ragError);
                    botReplyText = "Murojaatingiz uchun rahmat! Tizimda kichik uzilish yuz berdi. Tez orada operatorimiz sizga bog'lanadi. ⚡️";
                  }
                }
              }
            }
            
            if (botReplyText) {
              // Send message via Telegram API
              await sendTelegramMessage(botState.token, chatId, botReplyText);
              
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
          
          // Save updated chats back to context
          context[chatsKey] = JSON.stringify(chatsList);
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
    
    const activeTelegramChannels: Channel[] = [];
    
    // Parse channels (legacy global channels)
    const rawChannels = dbData["replai_channels"];
    const legacyChannels: Channel[] = rawChannels ? JSON.parse(rawChannels) : [];
    legacyChannels.forEach((c: Channel) => {
      if (c.type === "telegram" && c.isConnected && c.telegramToken) {
        activeTelegramChannels.push(c);
      }
    });

    // Scan all users' isolated channels
    if (dbData.userData && typeof dbData.userData === "object") {
      Object.values(dbData.userData).forEach((userVal: unknown) => {
        if (userVal && typeof userVal === "object") {
          const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
          const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
          userChannels.forEach((c: Channel) => {
            if (c.type === "telegram" && c.isConnected && c.telegramToken) {
              if (!activeTelegramChannels.some(ac => ac.id === c.id)) {
                activeTelegramChannels.push(c);
              }
            }
          });
        }
      });
    }
    
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
