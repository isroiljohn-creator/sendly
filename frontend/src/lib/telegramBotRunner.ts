import fs from "fs";
import path from "path";
import { Channel, Automation, BotSettings, Lesson, Module } from "./db";
import { moderateMessage } from "./ai/moderation";
import { queryRAG } from "./ai/rag";
import { createClient } from "@supabase/supabase-js";

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

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function getDbDataFromSupabase(): Promise<any> {
  const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // 1. Fetch global users
  const { data: globalUsers } = await supabase
    .from("instagram_accounts")
    .select("fb_field_mappings")
    .eq("instagram_page_id", "global_users")
    .maybeSingle();

  // 2. Fetch all user settings
  const { data: allSettings } = await supabase
    .from("instagram_accounts")
    .select("user_id, instagram_page_id, fb_field_mappings")
    .like("instagram_page_id", "global_settings_%");

  const userData: Record<string, any> = {};
  if (allSettings) {
    allSettings.forEach((row) => {
      const userId = row.instagram_page_id.replace("global_settings_", "");
      userData[userId] = row.fb_field_mappings || {};
    });
  }

  return {
    users: globalUsers?.fb_field_mappings || [],
    userData
  };
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

async function updateDbFile(updater: (dbData: Record<string, any>) => Promise<void> | void) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      // Load current state
      const dbData = await getDbDataFromSupabase();
      
      const originalUserDataJson = JSON.stringify(dbData.userData);
      const originalUsersJson = JSON.stringify(dbData.users);

      // Run updater
      await updater(dbData);

      // Save global users
      if (JSON.stringify(dbData.users) !== originalUsersJson) {
        await supabase
          .from("instagram_accounts")
          .upsert({
            user_id: "00000000-0000-0000-0000-000000000000",
            instagram_page_id: "global_users",
            access_token: "global_users_token",
            fb_field_mappings: dbData.users
          }, { onConflict: "instagram_page_id" });
      }

      // Save user specific data
      for (const [userId, userVal] of Object.entries(dbData.userData)) {
        const originalValJson = JSON.stringify((JSON.parse(originalUserDataJson) as Record<string, any>)[userId] || {});
        const newValJson = JSON.stringify(userVal);
        
        if (newValJson !== originalValJson) {
          const cleanUserId = isValidUuid(userId) ? userId : "00000000-0000-0000-0000-000000000000";
          await supabase
            .from("instagram_accounts")
            .upsert({
              user_id: cleanUserId,
              instagram_page_id: "global_settings_" + userId,
              access_token: "global_settings_token",
              fb_field_mappings: userVal
            }, { onConflict: "instagram_page_id" });
        }
      }
      return;
    } catch (dbErr) {
      console.error("Supabase updateDbFile failed, falling back to local file", dbErr);
    }
  }

  // Fallback to local db.json file
  let dbData: Record<string, any> = {};
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

export async function handleTelegramUpdate(channelId: string, token: string, update: any) {
  try {
    // Handle bot added/updated in a channel/group
    if (update.my_chat_member) {
      const chat = update.my_chat_member.chat;
      const newMember = update.my_chat_member.new_chat_member;
      if (chat && (chat.type === "channel" || chat.type === "group" || chat.type === "supergroup") && newMember && newMember.status === "administrator") {
        const username = chat.username || String(chat.id);
        const name = chat.title || chat.username || `Kanal ${chat.id}`;
        await updateDbFile(async (dbData) => {
          if (dbData.userData && typeof dbData.userData === "object") {
            for (const userVal of Object.values(dbData.userData)) {
              if (userVal && typeof userVal === "object") {
                const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
                const foundChIdx = userChannels.findIndex(c => c.id === channelId);
                if (foundChIdx > -1) {
                  const ch = userChannels[foundChIdx];
                  const newChannels = [...(ch.telegramChannels || [])];
                  if (!newChannels.some(c => c.username === username)) {
                    newChannels.push({ username, name });
                    ch.telegramChannels = newChannels;
                    (userVal as Record<string, string>)["replai_channels"] = JSON.stringify(userChannels);
                  }
                  break;
                }
              }
            }
          }
        });
      }
    }

    // Handle a message post inside a channel
    if (update.channel_post && update.channel_post.chat) {
      const chat = update.channel_post.chat;
      if (chat.type === "channel") {
        const username = chat.username || String(chat.id);
        const name = chat.title || chat.username || `Kanal ${chat.id}`;
        await updateDbFile(async (dbData) => {
          if (dbData.userData && typeof dbData.userData === "object") {
            for (const userVal of Object.values(dbData.userData)) {
              if (userVal && typeof userVal === "object") {
                const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
                const foundChIdx = userChannels.findIndex(c => c.id === channelId);
                if (foundChIdx > -1) {
                  const ch = userChannels[foundChIdx];
                  const newChannels = [...(ch.telegramChannels || [])];
                  if (!newChannels.some(c => c.username === username)) {
                    newChannels.push({ username, name });
                    ch.telegramChannels = newChannels;
                    (userVal as Record<string, string>)["replai_channels"] = JSON.stringify(userChannels);
                  }
                  break;
                }
              }
            }
          }
        });
      }
    }

    const message = update.message;
    if (!message || !message.chat || !message.text) {
      return;
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
        
        const rawSettings = context[`replai_bot_settings_${channelId}`];
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
        context[`replai_bot_settings_${channelId}`] = JSON.stringify(settings);
      });
      
      await sendTelegramMessage(token, chatId, "Tabriklaymiz! Siz ushbu bot uchun kurator (admin) qilib tayinlandingiz. Mijozlar suhbatni operatorga yo'naltirishni so'rashsa, sizga xabar yuboriladi.");
      return;
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
        const rawSettings = context[`replai_bot_settings_${channelId}`];
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
          botReplyText = moderation.warningMessage || "Iltimos, yozish qoidalariga rioya qiling.";
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
             const runsVal = parseInt(matchedAutomation.runs || "0") + 1;
             matchedAutomation.runs = String(runsVal);
             
             const hash = matchedAutomation.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
             const rate = 65 + (hash % 25);
             const completedVal = Math.round(runsVal * (rate / 100));
             matchedAutomation.completion = runsVal > 0 ? `${Math.round((completedVal / runsVal) * 100)}%` : "0%";
             
             context[`replai_automations_${channelId}`] = JSON.stringify(automations);
            
             const nameLower = matchedAutomation.name.toLowerCase();
             if (matchedAutomation.replyText) {
               botReplyText = matchedAutomation.replyText;
             } else if (nameLower.includes("lead magnet") || matchedKeyword === "kitob" || matchedKeyword === "bonus") {
               botReplyText = "Bepul qo'llanma havolasi: https://sendly.uz/book. Obunangiz uchun rahmat!";
             } else if (matchedKeyword === "/start" || matchedKeyword === "boshlash") {
               botReplyText = "Assalomu alaykum! Sendly chatbot xizmatiga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan.";
             } else if (matchedKeyword === "narxi" || matchedKeyword === "tarif" || matchedKeyword === "kurs") {
               botReplyText = "Bizning tariflarimiz: \n• Pro: 150,000 so'm/oy (1ta akkaunt)\n• Premium: 1,000,000 so'm/oy (10ta akkaunt)\n\nBatafsil ma'lumot olish yoki ulanish uchun operatorimiz tez orada javob yozadi.";
             } else {
               botReplyText = matchedKeyword;
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
              botReplyText = "Hisobingizda AI kreditlar yetarli emas. Iltimos, replai.uz hisobingiz orqali AI kreditlarni to'ldiring.";
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
                
                const explicitHumanRequest = ["operator", "inson", "admin", "aloqa", "bog'lanish", "boglanish", "odam"].some(kw => 
                  text.toLowerCase().includes(kw)
                );
                if (explicitHumanRequest) {
                  shouldEscalate = true;
                }

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
                  botReplyText = "Kechirasiz, ushbu savolga to'g'ri va aniq javob berish uchun suhbatni inson-kuratorga yo'naltirdim. Tez orada sizga javob yozishadi.";
                  
                  if (settings.adminTelegramChatId) {
                    sendTelegramMessage(
                      token,
                      settings.adminTelegramChatId,
                      `Yangi murojaat (Operator kutilmoqda):\n\nFoydalanuvchi: ${chat.name} (@${chat.username || "username_yoq"})\nSavol: ${text}\n\nUshbu foydalanuvchiga javob berish uchun Sendly inbox bo'limiga kiring.`
                    ).catch(err => console.error("Failed to notify admin on Telegram:", err));
                  }
                } else {
                  botReplyText = ragResult.text;
                }

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
                botReplyText = "Murojaatingiz uchun rahmat! Tizimda kichik uzilish yuz berdi. Tez orada operatorimiz sizga bog'lanadi.";
              }
            }
          }
        }
        
        if (botReplyText) {
          await sendTelegramMessage(token, chatId, botReplyText);
          
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
      
      context[chatsKey] = JSON.stringify(chatsList);
    });
  } catch (err) {
    console.error(`Error handling Telegram update for ${channelId}:`, err);
  }
}

async function runBotPollLoop(channelId: string, botState: TelegramBotState) {
  console.log(`Starting poll loop for bot channel ${channelId}`);
  
  try {
    const deleteWebhookUrl = `https://api.telegram.org/bot${botState.token}/deleteWebhook?drop_pending_updates=true`;
    await fetch(deleteWebhookUrl);
    console.log(`Deleted webhook successfully for bot channel ${channelId}`);
  } catch (err) {
    console.error(`Error deleting webhook for bot channel ${channelId}:`, err);
  }

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
        await handleTelegramUpdate(channelId, botState.token, update);
      }
    } catch (err) {
      console.error(`Error in bot poll loop for ${channelId}:`, err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  console.log(`Exited poll loop for bot channel ${channelId}`);
}

export async function startTelegramBots() {
  try {
    let dbData: any = {};
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbData = await getDbDataFromSupabase();
    } else {
      if (!fs.existsSync(DB_FILE)) {
        return { success: true, message: "No db.json yet." };
      }
      dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
    
    const activeTelegramChannels: Channel[] = [];
    
    const rawChannels = dbData["replai_channels"];
    const legacyChannels: Channel[] = rawChannels ? JSON.parse(rawChannels) : [];
    legacyChannels.forEach((c: Channel) => {
      if (c.type === "telegram" && c.isConnected && c.telegramToken) {
        activeTelegramChannels.push(c);
      }
    });

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
    const useWebhooks = !!process.env.RAILWAY_PUBLIC_DOMAIN;
    const host = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "";
    
    for (const channel of activeTelegramChannels) {
      const channelId = channel.id;
      if (!channel.telegramToken) continue;
      const token = channel.telegramToken.trim();
      activeIds.add(channelId);
      
      if (useWebhooks) {
        // Production: Register Webhooks with Telegram Bot API
        const webhookUrl = `${host}/api/telegram/webhook?channelId=${channelId}`;
        console.log(`[Webhooks] Registering Telegram webhook for bot ${channelId} (${channel.username}) -> ${webhookUrl}`);
        
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`);
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[Webhooks] Failed to set Telegram webhook for bot ${channelId}: ${res.status} - ${errText}`);
          } else {
            console.log(`[Webhooks] Telegram webhook registered successfully for bot ${channelId}`);
          }
        } catch (e) {
          console.error(`[Webhooks] Error setting Telegram webhook for bot ${channelId}:`, e);
        }
        
        // Stop polling loop if it was active
        const existing = globalBots[channelId];
        if (existing) {
          existing.active = false;
          delete globalBots[channelId];
        }
      } else {
        // Local: Fallback to getUpdates polling loop
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
        
        console.log(`Starting background bot runner (polling) for channel ${channelId} (${channel.username})`);
        const botState: TelegramBotState = {
          active: true,
          token: token,
          offset: 0,
        };
        globalBots[channelId] = botState;
        
        runBotPollLoop(channelId, botState);
      }
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
      webhookMode: useWebhooks
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error starting bots:", error);
    return { success: false, error: errMsg };
  }
}
