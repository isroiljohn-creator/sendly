import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Channel, Automation, BotSettings, Lesson, Module } from "./db";
import { moderateMessage } from "./ai/moderation";
import { queryRAG } from "./ai/rag";
import * as pgdb from "./pgdb";

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
  instanceId?: string;
}

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function getDbDataFromRailway(): Promise<any> {
  // 1. Fetch global users
  const globalUsers = await pgdb.getValue("global_users") || [];

  // 2. Fetch all user settings
  const allSettings = await pgdb.getAllLike("global_settings_%") || [];

  const userData: Record<string, any> = {};
  allSettings.forEach((row) => {
    const userId = row.key.replace("global_settings_", "");
    userData[userId] = row.value || {};
  });

  return {
    users: globalUsers,
    userData
  };
}

export const getDbDataFromSupabase = getDbDataFromRailway;

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

async function sendTelegramMessage(token: string, chatId: number | string, text: string, parseMode?: string, replyMarkup?: any) {
  try {
    const chunks = splitTelegramMessage(text);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const payload: any = {
        chat_id: chatId,
        text: chunk,
      };
      if (parseMode) payload.parse_mode = parseMode;
      if (replyMarkup && i === chunks.length - 1) {
        payload.reply_markup = replyMarkup;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store"
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to send Telegram message chunk ${i+1}/${chunks.length} to ${chatId}: ${res.status} - ${errText}`);
      }
    }
  } catch (err) {
    console.error(`Error sending Telegram message to ${chatId}:`, err);
  }
}

async function updateDbFile(updater: (dbData: Record<string, any>) => Promise<void> | void) {
  if (pgdb.isConfigured()) {
    try {
      // Load current state
      const dbData = await getDbDataFromRailway();
      
      const originalUserDataJson = JSON.stringify(dbData.userData);
      const originalUsersJson = JSON.stringify(dbData.users);

      // Run updater
      await updater(dbData);

      // Save global users
      if (JSON.stringify(dbData.users) !== originalUsersJson) {
        await pgdb.setValue("global_users", dbData.users);
      }

      // Save user specific data
      for (const [userId, userVal] of Object.entries(dbData.userData)) {
        const originalValJson = JSON.stringify((JSON.parse(originalUserDataJson) as Record<string, any>)[userId] || {});
        const newValJson = JSON.stringify(userVal);
        
        if (newValJson !== originalValJson) {
          await pgdb.setValue("global_settings_" + userId, userVal);
        }
      }
      return;
    } catch (dbErr) {
      console.error("Railway updateDbFile failed, falling back to local file", dbErr);
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
  if (!update || typeof update !== "object") {
    console.error(`[Bot Runner] Received invalid or null update object for channel ${channelId}`);
    return;
  }
  if (!token) {
    console.error(`[Bot Runner] Missing token for channel ${channelId}`);
    return;
  }
  console.log(`[Bot Runner] Handling update for channel ${channelId} (token: ...${token.slice(-6)}):`, JSON.stringify(update));
  try {
    // Handle inline button callback query to copy verification code
    if (update.callback_query) {
      const cb = update.callback_query;
      if (cb.data === "copy_code") {
        const msgText = cb.message?.text || "";
        const codeMatch = msgText.match(/\b(\d{5})\b/);
        const code = codeMatch ? codeMatch[1] : "";
        
        const answerUrl = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
        await fetch(answerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: cb.id,
            text: code ? "Nusxalash uchun alohida xabar yuborildi. Ustiga bosing!" : "Matndagi kod ustiga bosing!",
            show_alert: false
          }),
          cache: "no-store"
        });

        if (code && cb.message?.chat?.id) {
          await sendTelegramMessage(token, cb.message.chat.id, `<code>${code}</code>`, "HTML");
        }
      }
      return;
    }

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
    const isSystemBot = channelId === "system_bot";
    const userLang = isSystemBot
      ? ((message.from?.language_code || "").startsWith("ru") ? "ru" : (message.from?.language_code || "").startsWith("en") ? "en" : "uz")
      : "uz";
    
    // Handle start command to get verification code for admin linking (ONLY for system bot)
    if (channelId === "system_bot" && (text.trim() === "/start" || text.trim().startsWith("/start "))) {
      let targetChannelId = "";
      const parts = text.trim().split(" ");
      if (parts.length > 1) {
        const param = parts[1].trim();
        if (param !== "verify") {
          targetChannelId = param;
        }
      }

      if (!targetChannelId || targetChannelId === "system_bot") {
        const infoMsg =
          userLang === "en"
            ? `Hello! Welcome to the Sendly bot.\n\nIf you want to link a human-curator profile using this bot, please click the <b>"Get Code"</b> button in the link human-curator section on the Sendly platform, or start the bot via the special link provided on the platform.`
            : userLang === "ru"
            ? `Здравствуйте! Добро пожаловать в бот Sendly.\n\nЕсли вы хотите подключить профиль человека-куратора через этот бот, пожалуйста, нажмите кнопку <b>"Получить код"</b> в разделе подключения человека-куратора на платформе Sendly или запустите бот по специальной ссылке, предоставленной на платформе.`
            : `Assalomu alaykum! Sendly botiga xush kelibsiz.\n\nUshbu bot orqali inson-kurator profilini ulamoqchi bo'lsangiz, iltimos Sendly platformasidagi inson-kuratorni ulash bo'limidagi <b>"Kodni olish"</b> tugmasini bosing yoki botni platformada taqdim etilgan maxsus havola orqali boshlang.`;
        await sendTelegramMessage(token, chatId, infoMsg, "HTML");
        return;
      }

      // 5-digit verification code like Telegram
      const verifyCode = Math.floor(10000 + Math.random() * 90000).toString();
      let matched = false;
      await updateDbFile(async (dbData) => {
        let context: Record<string, string> = dbData as unknown as Record<string, string>;
        if (dbData.userData && typeof dbData.userData === "object") {
          for (const userVal of Object.values(dbData.userData)) {
            if (userVal && typeof userVal === "object") {
              const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
              const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
              if (userChannels.some(c => c.id === targetChannelId)) {
                context = userVal as Record<string, string>;
                matched = true;
                break;
              }
            }
          }
        }
        
        if (matched) {
          const verifyData = {
            code: verifyCode,
            chatId: String(chatId),
            username: username || firstName || "Admin",
            timestamp: Date.now()
          };
          context[`replai_tg_verify_code_${targetChannelId}`] = JSON.stringify(verifyData);
        }
      });

      if (!matched) {
        const errorMsg =
          userLang === "en"
            ? `Sorry, this link has expired or is incorrect. To get the confirmation code, please click the <b>"Get Code"</b> button in the link human-curator section on the platform.`
            : userLang === "ru"
            ? `Извините, эта ссылка устарела или неверна. Чтобы получить код подтверждения, пожалуйста, нажмите кнопку <b>"Получить код"</b> в разделе подключения человека-куратора на платформе.`
            : `Kechirasiz, ushbu havola eskirgan yoki xato. Tasdiqlash kodini olish uchun iltimos platformadagi inson-kuratorni ulash bo'limidagi <b>"Kodni olish"</b> tugmasini bosing.`;
        await sendTelegramMessage(token, chatId, errorMsg, "HTML");
        return;
      }
      
      const messageText =
        userLang === "en"
          ? `Hello! Welcome to the Sendly bot.\n\nYour confirmation code is: <code>${verifyCode}</code>\n\nType this code into the connect admin modal on the Sendly platform (code is active for 1 minute).`
          : userLang === "ru"
          ? `Здравствуйте! Добро пожаловать в бот Sendly.\n\nВаш код подтверждения: <code>${verifyCode}</code>\n\nВведите этот код в окно подключения администратора на платформе Sendly (код активен в течение 1 минуты).`
          : `Assalomu alaykum! Sendly botiga xush kelibsiz.\n\nSizning tasdiqlash kodingiz: <code>${verifyCode}</code>\n\nUshbu kodni Sendly platformasidagi adminni ulash oynasiga kiriting (kod 1 daqiqa davomida faol bo'ladi).`;
      
      const copyBtnText = userLang === "en" ? "📋 Copy Code" : userLang === "ru" ? "📋 Копировать код" : "📋 Kodni nusxalash";
      const replyMarkup = {
        inline_keyboard: [[
          { text: copyBtnText, callback_data: "copy_code" }
        ]]
      };
      
      await sendTelegramMessage(token, chatId, messageText, "HTML", replyMarkup);
      return;
    }

    // Handle curator command /admin to link admin account (legacy fallback, only for non-system bots)
    if (channelId !== "system_bot" && (text.trim() === "/admin" || text.trim().startsWith("/admin "))) {
      let userEmail = "";
      await updateDbFile(async (dbData) => {
        let context: Record<string, string> = dbData as unknown as Record<string, string>;
        let matchedUserId = "";
        if (dbData.userData && typeof dbData.userData === "object") {
          for (const [userId, userVal] of Object.entries(dbData.userData)) {
            if (userVal && typeof userVal === "object") {
              const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
              const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
              if (userChannels.some(c => c.id === channelId)) {
                context = userVal as Record<string, string>;
                matchedUserId = userId;
                break;
              }
            }
          }
        }
        
        if (matchedUserId) {
          const usersList = dbData.users || [];
          if (Array.isArray(usersList)) {
            const userObj = usersList.find((u: any) => u.id === matchedUserId);
            if (userObj) {
              userEmail = userObj.email;
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
      
      const accountInfo =
        userLang === "en"
          ? userEmail ? ` Account: ${userEmail}.` : ""
          : userLang === "ru"
          ? userEmail ? ` Аккаунт: ${userEmail}.` : ""
          : userEmail ? ` Akkaunt: ${userEmail}.` : "";

      const curatorSuccessMsg =
        userLang === "en"
          ? `Congratulations! You have been assigned as the curator (admin) for this bot.${accountInfo} If customers request a human support transfer, you will be notified.`
          : userLang === "ru"
          ? `Поздравляем! Вы были назначены куратором (админом) для этого бота.${accountInfo} Если клиенты попросят перенаправить диалог оператору, вам будет отправлено уведомление.`
          : `Tabriklaymiz! Siz ushbu bot uchun kurator (admin) qilib tayinlandingiz.${accountInfo} Mijozlar suhbatni operatorga yo'naltirishni so'rashsa, sizga xabar yuboriladi.`;

      await sendTelegramMessage(token, chatId, curatorSuccessMsg);
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

      // Reset liveTakeover if user restarts the bot with /start or boshlash
      if (text.trim().toLowerCase() === "/start" || text.trim().toLowerCase().startsWith("/start ") || text.trim().toLowerCase() === "boshlash") {
        chat.liveTakeover = false;
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
               botReplyText =
                 userLang === "en"
                   ? "Free guide link: https://sendly.uz/book. Thank you for your subscription!"
                   : userLang === "ru"
                   ? "Ссылка на бесплатное руководство: https://sendly.uz/book. Спасибо за вашу подписку!"
                   : "Bepul qo'llanma havolasi: https://sendly.uz/book. Obunangiz uchun rahmat!";
             } else if (matchedKeyword === "/start" || matchedKeyword === "boshlash") {
               botReplyText =
                 userLang === "en"
                   ? "Hello! Welcome to the Sendly chatbot service. Our system is successfully connected."
                   : userLang === "ru"
                   ? "Здравствуйте! Добро пожаловать в сервис чат-ботов Sendly. Наша система успешно подключена."
                   : "Assalomu alaykum! Sendly chatbot xizmatiga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan.";
             } else if (matchedKeyword === "narxi" || matchedKeyword === "tarif" || matchedKeyword === "kurs") {
               botReplyText =
                 userLang === "en"
                    ? "Our pricing (50% Discount!): \n• Pro: 75,000 UZS/month (usually 150,000 UZS) — 1 account\n• Premium: 600,000 UZS/month (usually 1,200,000 UZS) — 10 accounts\n\nOur operator will reply shortly with more details."
                    : userLang === "ru"
                    ? "Наши тарифы (Скидка 50%!): \n• Pro: 75,000 сум/мес (обычно 150,000) — 1 аккаунт\n• Premium: 600,000 сум/мес (обычно 1,200,000) — 10 аккаунтов\n\nНаш оператор скоро свяжется с вами."
                   : "Bizning tariflarimiz (50% Chegirma!): \n• Pro: 75,000 so'm/oy (odatda 150,000) — 1ta akkaunt\n• Premium: 600,000 so'm/oy (odatda 1,200,000) — 10ta akkaunt\n\nBatafsil ma'lumot olish uchun operatorimiz tez orada javob yozadi.";
             } else {
               botReplyText = matchedKeyword;
             }
          } else if (text.trim().toLowerCase() === "/start" || text.trim().toLowerCase().startsWith("/start ") || text.trim().toLowerCase() === "boshlash") {
            botReplyText =
              userLang === "en"
                ? "Hello! Welcome to the Sendly chatbot service. Our system is successfully connected."
                : userLang === "ru"
                ? "Здравствуйте! Добро пожаловать в сервис чат-ботов Sendly. Наша система успешно подключена."
                : "Assalomu alaykum! Sendly chatbot xizmatiga xush kelibsiz. Tizimimiz muvaffaqiyatli ulangan.";
          } else if (settings.aiCuratorEnabled && settings.telegramBotId === channelId) {
            // 3. AI Curator RAG Logic
            const rawLessons = context["replai_lessons"];
            const lessons: Lesson[] = rawLessons ? JSON.parse(rawLessons) : [];
            const rawModules = context["replai_modules"];
            const modules: Module[] = rawModules ? JSON.parse(rawModules) : [];

            let credits = { balance: 100, used: 0, history: [] as any[] };
            if (context["replai_ai_credits_data"]) {
              try {
                credits = typeof context["replai_ai_credits_data"] === "string"
                  ? JSON.parse(context["replai_ai_credits_data"])
                  : context["replai_ai_credits_data"];
              } catch (e) {
                console.error("Failed to parse credits data in runner", e);
              }
            }

            if ((credits.balance || 0) < 5) {
              const errMsg =
                userLang === "en"
                  ? "You do not have enough AI credits on your account. Please top up your AI credits balance in your replai.uz panel."
                  : userLang === "ru"
                  ? "На вашем балансе недостаточно AI кредитов. Пожалуйста, пополните баланс AI кредитов в личном кабинете replai.uz."
                  : "Hisobingizda AI kreditlar yetarli emas. Iltimos, replai.uz hisobingiz orqali AI kreditlarni to'ldiring.";

              if (settings.adminTelegramChatId) {
                let channelUsername = "";
                if (dbData.userData && typeof dbData.userData === "object") {
                  for (const userVal of Object.values(dbData.userData)) {
                    if (userVal && typeof userVal === "object") {
                      const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                      const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
                      const ch = userChannels.find(c => c.id === channelId);
                      if (ch) {
                        channelUsername = ch.username;
                        break;
                      }
                    }
                  }
                }
                if (!channelUsername) {
                  const rawChannels = dbData["replai_channels"];
                  const legacyChannels: Channel[] = rawChannels ? JSON.parse(rawChannels) : [];
                  const ch = legacyChannels.find(c => c.id === channelId);
                  if (ch) {
                    channelUsername = ch.username;
                  }
                }

                const sysToken = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
                const notifyToken = sysToken || token;
                const channelInfoStr = channelUsername ? ` (@${channelUsername.replace(/^@+/, "")})` : "";
                
                const adminNotification = `⚠️ [Sendly AI Balans]${channelInfoStr}:\n\n${errMsg}`;
                sendTelegramMessage(notifyToken, settings.adminTelegramChatId, adminNotification)
                  .catch(err => console.error("Failed to notify admin on Telegram about low credits:", err));
              }

              botReplyText = "";
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
                  botReplyText =
                    userLang === "en"
                      ? "Sorry, to provide an accurate answer to this question, I have transferred this conversation to a human curator. You will receive a response shortly."
                      : userLang === "ru"
                      ? "Извините, для точного ответа на этот вопрос я перенаправил этот чат человеку-куратору. Вам скоро ответят."
                      : "Kechirasiz, ushbu savolga to'g'ri va aniq javob berish uchun suhbatni inson-kuratorga yo'naltirdim. Tez orada sizga javob yozishadi.";
                  
                  if (settings.adminTelegramChatId) {
                    // Try to find the custom bot username for context
                    let channelUsername = "";
                    if (dbData.userData && typeof dbData.userData === "object") {
                      for (const userVal of Object.values(dbData.userData)) {
                        if (userVal && typeof userVal === "object") {
                          const rawUserChannels = (userVal as Record<string, string>)["replai_channels"];
                          const userChannels: Channel[] = rawUserChannels ? JSON.parse(rawUserChannels) : [];
                          const ch = userChannels.find(c => c.id === channelId);
                          if (ch) {
                            channelUsername = ch.username;
                            break;
                          }
                        }
                      }
                    }
                    if (!channelUsername) {
                      const rawChannels = dbData["replai_channels"];
                      const legacyChannels: Channel[] = rawChannels ? JSON.parse(rawChannels) : [];
                      const ch = legacyChannels.find(c => c.id === channelId);
                      if (ch) {
                        channelUsername = ch.username;
                      }
                    }

                    const sysToken = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
                    const notifyToken = sysToken || token;
                    const channelInfoStr = channelUsername ? ` (@${channelUsername.replace(/^@+/, "")})` : "";
                    
                    const noUsernameStr = userLang === "en" ? "no_username" : userLang === "ru" ? "нет_юзернейма" : "username_yoq";
                    const newNotificationText =
                      userLang === "en"
                        ? `New ticket (Operator requested)${channelInfoStr}:\n\nUser: ${chat.name} (@${chat.username || noUsernameStr})\nQuestion: ${text}\n\nPlease visit the Sendly inbox to reply to this user.`
                        : userLang === "ru"
                        ? `Новое обращение (Ожидание оператора)${channelInfoStr}:\n\nПользователь: ${chat.name} (@${chat.username || noUsernameStr})\nВопрос: ${text}\n\nПожалуйста, перейдите в раздел Входящие в Sendly, чтобы ответить пользователю.`
                        : `Yangi murojaat (Operator kutilmoqda)${channelInfoStr}:\n\nFoydalanuvchi: ${chat.name} (@${chat.username || noUsernameStr})\nSavol: ${text}\n\nUshbu foydalanuvchiga javob berish uchun Sendly inbox bo'limiga kiring.`;

                    sendTelegramMessage(
                      notifyToken,
                      settings.adminTelegramChatId,
                      newNotificationText
                    ).catch(err => console.error("Failed to notify admin on Telegram:", err));
                  }
                } else {
                  botReplyText = ragResult.text;
                }

                const cost = Math.min(100, 5 + Math.ceil(botReplyText.length / 10));
                credits.balance = Math.max(0, credits.balance - cost);
                credits.used = (credits.used || 0) + cost;
                
                const usageDesc =
                  userLang === "en"
                    ? `AI Curator response (${botReplyText.length} chars)`
                    : userLang === "ru"
                    ? `Ответ AI куратора (${botReplyText.length} симв.)`
                    : `AI Curator javobi (${botReplyText.length} belgi)`;

                credits.history.unshift({
                  id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  type: "usage",
                  amount: cost,
                  description: usageDesc,
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
      
      // 5. Update CRM Contacts list with parsed lead information (phone, email, company name)
      const contactsKey = "replai_contacts";
      const rawContacts = context[contactsKey];
      let contactsList: any[] = rawContacts ? JSON.parse(rawContacts) : [];
      if (!Array.isArray(contactsList)) {
        contactsList = [];
      }

      // Check if contact already exists
      let contactObj = contactsList.find((c: any) => c.username === (username || `tg_${chatId}`) || c.id === String(chatId));

      // Attempt to extract phone number from text
      let extractedPhone = "";
      const phoneMatch = text.match(/(?:\+?998|8)\s?\(?\d{2}\)?\s?\d{3}\s?\d{2}\s?\d{2}/) || text.match(/\+?\d{9,15}/);
      if (phoneMatch) {
        extractedPhone = phoneMatch[0].replace(/\s+/g, "");
      }

      // Attempt to extract email
      let extractedEmail = "";
      const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (emailMatch) {
        extractedEmail = emailMatch[0];
      }

      // Attempt to extract company/business name
      let extractedCompany = "";
      const companyPatterns = [
        /(?:kompaniyam|firmam|biznesim|tashkilotim|do'konim|dokonim)\s+(?:nomi\s+)?(?:yo'q\s+emas\s+)?(["']?[A-Za-z0-9\sа-яА-ЯёЁўЎқҚғҒҳҲ\-]{2,30}["']?)/i,
        /kompaniya:\s*(["']?[A-Za-z0-9\sа-яА-ЯёЁўЎқҚғҒҳҲ\-]{2,30}["']?)/i,
        /(?:kompaniya|firma|mchj|ooo)\s+(["']?[A-Za-z0-9\sа-яА-ЯёЁўЎқҚғҒҳҲ\-]{2,30}["']?)/i
      ];
      for (const pattern of companyPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          extractedCompany = match[1].replace(/["']/g, "").trim();
          break;
        }
      }

      const cleanName = `${firstName || ""} ${lastName || ""}`.trim() || username || `Telegram User ${chatId}`;

      if (!contactObj) {
        contactObj = {
          id: String(chatId),
          name: cleanName,
          username: username || `tg_${chatId}`,
          status: true,
          messagesCount: 1,
          tags: ["Telegram"],
          lastActive: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
          phone: extractedPhone,
          email: extractedEmail,
          companyName: extractedCompany,
          lastMessage: text
        };
        contactsList.unshift(contactObj);
      } else {
        contactObj.messagesCount = (contactObj.messagesCount || 0) + 1;
        contactObj.lastActive = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
        contactObj.lastMessage = text;
        if (extractedPhone) contactObj.phone = extractedPhone;
        if (extractedEmail) contactObj.email = extractedEmail;
        if (extractedCompany) contactObj.companyName = extractedCompany;
        
        // Add interest tags based on suhbat keywords
        if (text.toLowerCase().includes("narxi") || text.toLowerCase().includes("to'lov")) {
          if (!contactObj.tags.includes("Tarifga qiziqqan")) {
            contactObj.tags.push("Tarifga qiziqqan");
          }
        }
        if (text.toLowerCase().includes("muammo") || text.toLowerCase().includes("ishlamayapti")) {
          if (!contactObj.tags.includes("Texnik yordam")) {
            contactObj.tags.push("Texnik yordam");
          }
        }
      }

      context[contactsKey] = JSON.stringify(contactsList);
      context[chatsKey] = JSON.stringify(chatsList);
    });
  } catch (err) {
    console.error(`Error handling Telegram update for ${channelId}:`, err);
  }
}

const lastOutreachChecks: Record<string, number> = {};

async function checkAndRunAutoOutreach(channelId: string, token: string) {
  try {
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

      // Check if bot settings enable autoOutreach
      const rawSettings = context[`replai_bot_settings_${channelId}`];
      if (!rawSettings) return;
      const settings: BotSettings = JSON.parse(rawSettings);
      if (!settings.autoOutreach) return;

      // Check active hours
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeVal = currentHour * 60 + currentMinute;

      const [startHour, startMin] = (settings.outreachStart || "09:00").split(":").map(Number);
      const [endHour, endMin] = (settings.outreachEnd || "21:00").split(":").map(Number);
      const startTimeVal = startHour * 60 + startMin;
      const endTimeVal = endHour * 60 + endMin;

      if (currentTimeVal < startTimeVal || currentTimeVal > endTimeVal) {
        return; // Outside outreach hours
      }

      // Load chats
      const chatsKey = `replai_chats_${channelId}`;
      const rawChats = context[chatsKey];
      if (!rawChats) return;
      const chatsList: ChatThread[] = JSON.parse(rawChats);

      let credits = { balance: 100, used: 0, history: [] as any[] };
      if (context["replai_ai_credits_data"]) {
        try {
          credits = JSON.parse(context["replai_ai_credits_data"]);
        } catch (e) {
          // ignore
        }
      }

      const lessons: Lesson[] = context["replai_lessons"] ? JSON.parse(context["replai_lessons"]) : [];
      const modules: Module[] = context["replai_modules"] ? JSON.parse(context["replai_modules"]) : [];

      let hasUpdates = false;

      for (const chat of chatsList) {
        if (chat.liveTakeover) continue; // Skip if operator is talking

        const lastMsg = chat.messages[chat.messages.length - 1];
        if (!lastMsg) continue;

        // Skip if the last message was already an auto outreach follow-up
        if (lastMsg.sender === "bot" && lastMsg.text.includes("[Follow-up]")) continue;

        // Determine inactivity duration.
        // We look for chats that have been inactive for more than 24 hours.
        let timestampMs = 0;
        if (lastMsg.id.startsWith("msg-")) {
          const parts = lastMsg.id.split("-");
          timestampMs = parseInt(parts[1]);
        }
        if (!timestampMs || isNaN(timestampMs)) continue;

        const elapsedHours = (Date.now() - timestampMs) / (1000 * 60 * 60);
        if (elapsedHours < 24) continue; 

        // Verify credit balance
        if ((credits.balance || 0) < 5) continue;

        // Build follow-up query to Gemini RAG
        const chatHistory = chat.messages
          .filter(m => m.text)
          .map(m => ({
            role: m.sender === "user" ? ("user" as const) : ("model" as const),
            parts: [{ text: m.text }]
          }));

        // We ask Gemini to write a follow up
        try {
          const followUpPrompt = "Mijoz suhbatni to'xtatdi. Dars materiallariga asoslanib, uning savoli yoki qiziqishi qolgan-qolmaganini so'rab muloyim va juda qisqa eslatma yozing (1-2 gap).";
          
          const ragResult = await queryRAG(
            followUpPrompt,
            chat.name || "Talaba",
            lessons,
            modules,
            settings,
            chatHistory
          );

          if (ragResult && ragResult.text) {
            const outreachText = ragResult.text;
            
            // Send the message on Telegram
            await sendTelegramMessage(token, chat.id, outreachText);

            // Record message in history
            const botMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sender: "bot",
              text: `${outreachText} \n\n[Follow-up]`,
              timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
            };
            chat.messages.push(botMsg);
            chat.lastMessage = outreachText;
            chat.unread = true;
            chat.time = "Hozir";

            // Deduct credits
            const cost = Math.min(100, 5 + Math.ceil(outreachText.length / 10));
            credits.balance = Math.max(0, credits.balance - cost);
            credits.used = (credits.used || 0) + cost;
            credits.history.unshift({
              id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: "usage",
              amount: cost,
              description: `AI Curator avtomatik eslatma (Follow-up)`,
              date: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })
            });

            hasUpdates = true;
          }
        } catch (err) {
          console.error(`Failed to generate outreach for chat ${chat.id}:`, err);
        }
      }

      if (hasUpdates) {
        context[chatsKey] = JSON.stringify(chatsList);
        context["replai_ai_credits_data"] = JSON.stringify(credits);
      }
    });
  } catch (err) {
    console.error("Error in checkAndRunAutoOutreach:", err);
  }
}

async function runBotPollLoop(channelId: string, botState: TelegramBotState) {
  console.log(`Starting poll loop for bot channel ${channelId}`);
  
  try {
    const deleteWebhookUrl = `https://api.telegram.org/bot${botState.token}/deleteWebhook`;
    await fetch(deleteWebhookUrl, { cache: "no-store" });
    console.log(`Deleted webhook successfully for bot channel ${channelId}`);
  } catch (err) {
    console.error(`Error deleting webhook for bot channel ${channelId}:`, err);
  }

  const globalBots = (global as unknown as { telegramBots?: Record<string, TelegramBotState> }).telegramBots || {};

  while (botState.active) {
    // Check if this is still the active instance registered in globalBots
    if (globalBots[channelId] && globalBots[channelId].instanceId !== botState.instanceId) {
      console.log(`Stopping poll loop for channel ${channelId} because a newer instance is running.`);
      botState.active = false;
      break;
    }
    try {
      const url = `https://api.telegram.org/bot${botState.token}/getUpdates?offset=${botState.offset}&timeout=10`;
      const res = await fetch(url, { cache: "no-store" });
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

      // Periodically check and run auto outreach (every 5 minutes)
      const now = Date.now();
      const lastCheck = lastOutreachChecks[channelId] || 0;
      if (now - lastCheck > 5 * 60 * 1000) {
        lastOutreachChecks[channelId] = now;
        checkAndRunAutoOutreach(channelId, botState.token).catch((err) =>
          console.error("Auto outreach check failed:", err)
        );
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
    if (pgdb.isConfigured()) {
      dbData = await getDbDataFromRailway();
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

    // Push system bot if token is configured
    const systemBotToken = process.env.SYSTEM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (systemBotToken && systemBotToken !== "mock_telegram_token") {
      activeTelegramChannels.push({
        id: "system_bot",
        type: "telegram",
        name: "Sendly System Bot",
        username: "sendly_robot",
        isActive: true,
        isConnected: true,
        telegramToken: systemBotToken,
        createdAt: new Date().toISOString()
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
        const secretToken = crypto.createHash("sha256").update(token).digest("hex").substring(0, 32);
        console.log(`[Webhooks] Registering Telegram webhook for bot ${channelId} (${channel.username}) -> ${webhookUrl}`);
        
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secretToken}&drop_pending_updates=true`, { cache: "no-store" });
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
          instanceId: crypto.randomUUID(),
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
