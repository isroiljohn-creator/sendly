import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { startTelegramBots } from "@/lib/telegramBotRunner";
import * as pgdb from "@/lib/pgdb";
import { verifyJwt } from "@/lib/jwt";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

const LOCK_DIR = path.join(process.cwd(), "db.lock");

// Clean any dangling lock directories on startup (module initialization)
try {
  if (fs.existsSync(LOCK_DIR)) {
    fs.rmdirSync(LOCK_DIR);
    console.log("[Startup] Cleaned dangling database lock directory.");
  }
} catch (e) {
  // ignore
}

async function acquireFileLock(): Promise<boolean> {
  const maxRetries = 15;
  const retryDelay = 50; // ms
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.mkdirSync(LOCK_DIR);
      return true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
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

function getInitialData() {
  return {};
}

function readDbUnlocked() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  const data = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(data);
}

function writeDbUnlocked(data: unknown) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  return true;
}

async function readDb() {
  const hasLock = await acquireFileLock();
  try {
    let dbData = readDbUnlocked();
    if (dbData && !dbData.userData && !dbData.users) {
      const users = dbData.replai_users ? JSON.parse(dbData.replai_users) : [];
      dbData = {
        users: users,
        userData: {}
      };
      writeDbUnlocked(dbData);
    }
    if (!dbData.users) dbData.users = [];
    if (!dbData.userData) dbData.userData = {};
    return dbData;
  } catch (err) {
    console.error("Error reading database file, returning empty state", err);
    return getInitialData();
  } finally {
    if (hasLock) releaseFileLock();
  }
}

async function writeDb(data: unknown) {
  const hasLock = await acquireFileLock();
  try {
    return writeDbUnlocked(data);
  } catch (err) {
    console.error("Error writing to database file", err);
    return false;
  } finally {
    if (hasLock) releaseFileLock();
  }
}

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "guest";

  // Check auth for non-guest userIds
  if (userId !== "guest") {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    const jwtPattern = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;
    
    if (!token || !jwtSecret || !jwtPattern.test(token)) {
      return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
    }
    
    const payload = verifyJwt(token, jwtSecret);
    if (!payload || payload.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }
  } else {
    // If it's a guest, restrict global users to protect privacy
    return NextResponse.json({
      replai_users: "[]"
    });
  }
  
  // Use Railway PostgreSQL if configured
  if (pgdb.isConfigured()) {
    try {
      // 1. Fetch user-specific settings
      const userSettings = await pgdb.getValue("global_settings_" + userId) || {};

      // 2. Fetch global users
      const globalUsers = await pgdb.getValue("global_users") || [];

      const responseData = {
        replai_users: JSON.stringify(globalUsers),
        ...userSettings
      };

      try {
        startTelegramBots();
      } catch (err) {
        console.error("Failed to auto-start telegram bots on db GET (Railway):", err);
      }

      return NextResponse.json(responseData);
    } catch (e) {
      console.error("Failed to fetch database from Railway, falling back to local file", e);
    }
  }

  // Fallback: Read from local db.json file
  let dbData = await readDb();
  
  // Extract user's specific data
  const userSpecificData = dbData.userData?.[userId] || {};
  
  // Combine userSpecificData with global users list
  const responseData = {
    replai_users: JSON.stringify(dbData.users || []),
    ...userSpecificData
  };

  try {
    startTelegramBots();
  } catch (err) {
    console.error("Failed to auto-start telegram bots on db GET:", err);
  }
  return NextResponse.json(responseData);
}

function countActiveAutomations(payload: any): number {
  let count = 0;
  if (!payload || typeof payload !== "object") return 0;
  Object.entries(payload).forEach(([key, val]) => {
    if (key === "replai_automations" || key.startsWith("replai_automations_")) {
      try {
        const autos = typeof val === "string" ? JSON.parse(val) : val;
        if (Array.isArray(autos)) {
          autos.forEach((a: any) => {
            if (a && a.active === true) {
              count++;
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse automations for active count", e);
      }
    }
  });
  return count;
}

function pruneOrphanSettings(settings: any, activeChannelIds: string[]) {
  if (!settings || typeof settings !== "object") return;
  const activeIdsSet = new Set(activeChannelIds);
  Object.keys(settings).forEach((key) => {
    if (key.startsWith("replai_automations_") || key.startsWith("replai_bot_settings_") || key.startsWith("replai_chats_")) {
      const suffix = key.replace("replai_automations_", "").replace("replai_bot_settings_", "").replace("replai_chats_", "");
      if (!activeIdsSet.has(suffix)) {
        delete settings[key];
      }
    }
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "guest";

  if (userId === "guest") {
    return NextResponse.json({ error: "Forbidden: Guests cannot write to database" }, { status: 403 });
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtPattern = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;
  
  if (!token || !jwtSecret || !jwtPattern.test(token)) {
    return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
  }
  
  const payloadJwt = verifyJwt(token, jwtSecret);
  if (!payloadJwt || payloadJwt.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // --- Plan Limits & Orphan Pruning ---
  let plan = "free";
  if (pgdb.isConfigured()) {
    try {
      const usersList = await pgdb.getValue("global_users") || [];
      const userObj = usersList.find((u: any) => u.id === userId);
      plan = userObj?.plan || "free";
    } catch (e) {
      console.error("Failed to fetch user plan in pgdb limits check", e);
    }
  } else {
    try {
      const dbData = readDbUnlocked();
      const userObj = dbData.users?.find((u: any) => u.id === userId);
      plan = userObj?.plan || "free";
    } catch (e) {
      console.error("Failed to fetch user plan in local db limits check", e);
    }
  }

  const maxChannels = plan === "vip" ? 10 : 1;
  const maxActiveAutomations = plan === "vip" ? 50 : 5;

  let activeChannelIds: string[] = [];
  if (payload.replai_channels) {
    try {
      const incomingChannels = JSON.parse(payload.replai_channels);
      if (Array.isArray(incomingChannels)) {
        if (incomingChannels.length > maxChannels) {
          return NextResponse.json({
            success: false,
            error: `Sizning tarifingizda kanallar soni cheklangan (Maksimal: ${maxChannels}). Iltimos, tarifingizni yangilang.`
          }, { status: 400 });
        }
        activeChannelIds = incomingChannels.map((c: any) => c.id).filter(Boolean);
      }
    } catch (e) {
      console.error("Failed to parse channels for limits check", e);
    }
  }

  const activeAutosCount = countActiveAutomations(payload);
  if (activeAutosCount > maxActiveAutomations) {
    return NextResponse.json({
      success: false,
      error: `Sizning tarifingizda faol avtomatlashtirishlar soni cheklangan (Maksimal: ${maxActiveAutomations}). Iltimos, tarifingizni yangilang.`
    }, { status: 400 });
  }

  // Prune orphans from payload
  if (payload.replai_channels && activeChannelIds.length > 0) {
    pruneOrphanSettings(payload, activeChannelIds);
  }

  try {
    // Use Railway PostgreSQL if configured
    if (pgdb.isConfigured()) {
      // 1. Channel duplication check
      if (payload.replai_channels) {
        try {
          const incomingChannels = JSON.parse(payload.replai_channels);
          if (Array.isArray(incomingChannels)) {
            for (const ch of incomingChannels) {
              if (!ch.username) continue;
              const channelUsernameNormalized = ch.username.toLowerCase().replace(/^@+/, "");
              
              // Query other users' settings
              const allSettings = await pgdb.getAllSettingsExcept(userId);

              for (const row of allSettings) {
                const otherUserChannelsRaw = row.value?.replai_channels;
                if (otherUserChannelsRaw) {
                  const otherUserChannels = typeof otherUserChannelsRaw === "string"
                    ? JSON.parse(otherUserChannelsRaw)
                    : otherUserChannelsRaw;
                  if (Array.isArray(otherUserChannels)) {
                    const duplicate = otherUserChannels.find(
                      (oCh) =>
                        oCh.type === ch.type &&
                        oCh.username.toLowerCase().replace(/^@+/, "") === channelUsernameNormalized
                    );
                    if (duplicate) {
                      return NextResponse.json(
                        {
                          success: false,
                          error: `Ushbu ${ch.type === "telegram" ? "Telegram bot" : "Instagram sahifa"} (@${ch.username.replace(/^@+/, "")}) allaqachon boshqa foydalanuvchiga ulangan!`,
                        },
                        { status: 400 }
                      );
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to validate channels during Railway POST:", e);
        }
      }

      // 2. Save shared users list
      if (payload.replai_users) {
        let usersList = [];
        try {
          usersList = JSON.parse(payload.replai_users);
        } catch (e) {
          console.error("Failed to parse replai_users payload:", e);
        }

        try {
          const prevUsersList = await pgdb.getValue("global_users") || [];
          
          const prevUser = prevUsersList.find((u: any) => u.id === userId || (u.email && u.email === usersList.find((x: any) => x.id === userId)?.email));
          const newUser = usersList.find((u: any) => u.id === userId);
          
          if (newUser) {
            if (prevUser) {
              newUser.plan = prevUser.plan || "free";
              newUser.trialExpiresAt = prevUser.trialExpiresAt;
              newUser.role = prevUser.role || "user";
            } else {
              newUser.plan = "free";
              newUser.role = "user";
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 7);
              newUser.trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
            }
          }
          
          if (newUser && prevUser && prevUser.plan !== newUser.plan) {
            const newPlan = newUser.plan || "free";
            const uData = await pgdb.getValue("global_settings_" + userId) || {};

            let creditsData = { balance: 500, used: 0, history: [] as any[] };
            if (uData.replai_ai_credits_data) {
              try {
                creditsData = typeof uData.replai_ai_credits_data === "string"
                  ? JSON.parse(uData.replai_ai_credits_data)
                  : uData.replai_ai_credits_data;
              } catch {
                // ignore
              }
            }

            let creditBalance = 500;
            let description = "Bepul tarif uchun 500 ta sinov krediti taqdim etildi";
            if (newPlan === "pro") {
              creditBalance = 1000;
              description = "PRO tarif obunasi uchun 1000 ta kredit taqdim etildi";
            } else if (newPlan === "premium") {
              creditBalance = 30000;
              description = "PREMIUM tarif obunasi uchun 30 000 ta kredit taqdim etildi";
            } else if (newPlan === "vip") {
              creditBalance = 150000;
              description = "VIP tarif obunasi uchun 150 000 ta kredit taqdim etildi";
            }

            creditsData.balance = creditBalance;
            creditsData.history.unshift({
              id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: "purchase",
              amount: creditBalance,
              description,
              date: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })
            });

            uData.replai_ai_credits_data = creditsData;
            await pgdb.setValue("global_settings_" + userId, uData);
          }
        } catch (planChangeErr) {
          console.error("Failed to sync credits on plan change detection (Railway API):", planChangeErr);
        }

        await pgdb.setValue("global_users", usersList);
      }

      // 3. Extract and save user specific fields
      const userSpecificData = await pgdb.getValue("global_settings_" + userId) || {};
      Object.entries(payload).forEach(([key, val]) => {
        if (
          key.startsWith("replai_") &&
          key !== "replai_users" &&
          key !== "replai_current_user" &&
          key !== "replai_ai_credits_data"
        ) {
          userSpecificData[key] = val;
        }
      });

      if (payload.replai_channels && activeChannelIds.length > 0) {
        pruneOrphanSettings(userSpecificData, activeChannelIds);
      }
      await runAutoLearningPipeline(userSpecificData);
      await pgdb.setValue("global_settings_" + userId, userSpecificData);

      try {
        startTelegramBots();
      } catch (err) {
        console.error("Failed to auto-start telegram bots on db POST (Railway):", err);
      }
      return NextResponse.json({ success: true });
    }
  } catch (supabaseErr: any) {
    console.error("Supabase POST error, falling back to local file", supabaseErr);
  }

  // Fallback: Read and write to local db.json file
  try {
    let dbData = await readDb();
    
    // Migration support for old format
    if (dbData && !dbData.userData && !dbData.users) {
      const users = dbData.replai_users ? JSON.parse(dbData.replai_users) : [];
      dbData = {
        users: users,
        userData: {}
      };
    }

    if (!dbData.userData) {
      dbData.userData = {};
    }
    if (!dbData.users) {
      dbData.users = [];
    }

    // 1. Update shared user list if present in payload
    if (payload.replai_users) {
      try {
        const prevUsers = [...(dbData.users || [])];
        dbData.users = JSON.parse(payload.replai_users);
        
        const prevUser = prevUsers.find((u: any) => u.id === userId || (u.email && u.email === dbData.users.find((x: any) => x.id === userId)?.email));
        const newUser = dbData.users.find((u: any) => u.id === userId);
        
        if (newUser) {
          if (prevUser) {
            newUser.plan = prevUser.plan || "free";
            newUser.trialExpiresAt = prevUser.trialExpiresAt;
            newUser.role = prevUser.role || "user";
          } else {
            newUser.plan = "free";
            newUser.role = "user";
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            newUser.trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
          }
        }
        
        if (newUser && prevUser && prevUser.plan !== newUser.plan) {
          const newPlan = newUser.plan || "free";
          if (!dbData.userData[userId]) dbData.userData[userId] = {};
          
          let creditsData = { balance: 500, used: 0, history: [] as any[] };
          if (dbData.userData[userId]["replai_ai_credits_data"]) {
            try {
              const rawCreds = dbData.userData[userId]["replai_ai_credits_data"];
              creditsData = typeof rawCreds === "string"
                ? JSON.parse(rawCreds)
                : rawCreds;
            } catch {
              // ignore
            }
          }

          let creditBalance = 500;
          let description = "Bepul tarif uchun 500 ta sinov krediti taqdim etildi";
          if (newPlan === "pro") {
            creditBalance = 1000;
            description = "PRO tarif obunasi uchun 1000 ta kredit taqdim etildi";
          } else if (newPlan === "premium") {
            creditBalance = 30000;
            description = "PREMIUM tarif obunasi uchun 30 000 ta kredit taqdim etildi";
          } else if (newPlan === "vip") {
            creditBalance = 150000;
            description = "VIP tarif obunasi uchun 150 000 ta kredit taqdim etildi";
          }

          creditsData.balance = creditBalance;
          creditsData.history.unshift({
            id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: "purchase",
            amount: creditBalance,
            description,
            date: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })
          });

          dbData.userData[userId]["replai_ai_credits_data"] = JSON.stringify(creditsData);
        }
      } catch (e) {
        console.error("Failed to parse replai_users payload:", e);
      }
    }

    // 2. Isolate all other fields starting with replai_ under userData[userId]
    if (!dbData.userData[userId]) {
      dbData.userData[userId] = {};
    }

    if (payload.replai_channels) {
      try {
        const incomingChannels = JSON.parse(payload.replai_channels);
        if (Array.isArray(incomingChannels)) {
          for (const ch of incomingChannels) {
            if (!ch.username) continue;
            const channelUsernameNormalized = ch.username.toLowerCase().replace(/^@+/, "");
            // Check other users' channels
            for (const [otherUserId, otherUserData] of Object.entries(dbData.userData || {})) {
              if (otherUserId === userId) continue;
              const otherUserChannelsRaw = (otherUserData as any)?.replai_channels;
              if (otherUserChannelsRaw) {
                const otherUserChannels = typeof otherUserChannelsRaw === "string"
                  ? JSON.parse(otherUserChannelsRaw)
                  : otherUserChannelsRaw;
                if (Array.isArray(otherUserChannels)) {
                  const duplicate = otherUserChannels.find(
                    (oCh) =>
                      oCh.type === ch.type &&
                      oCh.username.toLowerCase().replace(/^@+/, "") === channelUsernameNormalized
                  );
                  if (duplicate) {
                    return NextResponse.json(
                      {
                        success: false,
                        error: `Ushbu ${ch.type === "telegram" ? "Telegram bot" : "Instagram sahifa"} (@${ch.username.replace(/^@+/, "")}) allaqachon boshqa foydalanuvchiga ulangan!`,
                      },
                      { status: 400 }
                    );
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to validate channels during POST:", e);
      }
    }
    if (payload.replai_channels && activeChannelIds.length > 0) {
      pruneOrphanSettings(dbData.userData[userId], activeChannelIds);
    }

    Object.entries(payload).forEach(([key, val]) => {
      if (
        key.startsWith("replai_") &&
        key !== "replai_users" &&
        key !== "replai_current_user" &&
        key !== "replai_ai_credits_data"
      ) {
        dbData.userData[userId][key] = val;
      }
    });

    await runAutoLearningPipeline(dbData.userData[userId]);

    const success = await writeDb(dbData);
    
    if (success) {
      try {
        startTelegramBots();
      } catch (err) {
        console.error("Failed to auto-start telegram bots on db POST:", err);
      }
    }
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
  }
}

async function runAutoLearningPipeline(userData: Record<string, any>, userId: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  const botSettingsKeys = Object.keys(userData).filter(k => k.startsWith("replai_bot_settings_"));

  for (const settingsKey of botSettingsKeys) {
    const botId = settingsKey.replace("replai_bot_settings_", "");
    const rawSettings = userData[settingsKey];
    const settings = typeof rawSettings === "string" ? JSON.parse(rawSettings) : rawSettings;

    if (settings && settings.autoLearnEnabled === true) {
      const chatsKey = `replai_chats_${botId}`;
      const rawChats = userData[chatsKey];
      const chatsList: any[] = typeof rawChats === "string" ? JSON.parse(rawChats) : (rawChats || []);

      const lessonsKey = `replai_lessons_${botId}`;
      const rawLessons = userData[lessonsKey];
      const lessons: any[] = typeof rawLessons === "string" ? JSON.parse(rawLessons) : (rawLessons || []);

      const modulesKey = `replai_modules_${botId}`;
      const rawModules = userData[modulesKey];
      const modules: any[] = typeof rawModules === "string" ? JSON.parse(rawModules) : (rawModules || []);

      let chatsUpdated = false;
      let lessonsUpdated = false;

      for (const chat of chatsList) {
        if (chat.liveTakeover === false && !chat.autoLearned && chat.messages && chat.messages.length > 0) {
          const msgs = chat.messages.filter((m: any) => m.text);
          if (msgs.length < 2) continue;

          const conversationText = msgs.map((m: any) => `${m.sender === "user" ? "Mijoz" : "Operator"}: ${m.text}`).join("\n");

          try {
            const systemPrompt = `Siz professional marketing darsliklari va savol-javob (Q&A) qo'llanmalari tuzuvchisiz.\n` +
              `Sizga operator va mijoz o'rtasidagi chat yozishmalari taqdim etiladi. Yozishmalardan foydali savol va unga berilgan aniq javobni (fakt, ma'lumot yoki qoida) topib, foydali marketing darsligi shakllantiring.\n` +
              `Agar suhbatda hech qanday foydali darslik darajasidagi ma'lumot (masalan, narxlar, kurs tafsilotlari, qoidalar) bo'lmasa, bo'sh JSON {} qaytaring.\n` +
              `Javobni FAQAT quyidagi JSON formatida qaytaring, boshqa hech qanday matn qo'shmang:\n` +
              `{\n` +
              `  "title": "Mavzu nomi (masalan: Kurs narxi va to'lov turlari)",\n` +
              `  "transcript": "Darslik/tushuntirish matni (mijoz so'ragan masalaga to'liq javob, batafsil yoritilgan)"\n` +
              `}`;

            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  system_instruction: {
                    parts: [{ text: systemPrompt }],
                  },
                  contents: [
                    {
                      role: "user",
                      parts: [{ text: `SUHBAT:\n${conversationText}` }],
                    }
                  ],
                  generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                  },
                }),
              }
            );

            if (res.ok) {
              const data = await res.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const parsed = JSON.parse(text);
                if (parsed.title && parsed.transcript) {
                  let autoModule = modules.find(m => m.title === "Avtomatik o'rganilgan bilimlar");
                  if (!autoModule) {
                    autoModule = {
                      id: "mod-auto-" + Date.now(),
                      title: "Avtomatik o'rganilgan bilimlar",
                      description: "Mijozlar bilan suhbatlar asosida avtomatik shakllantirilgan bilimlar bazasi."
                    };
                    modules.push(autoModule);
                  }

                  const newLesson = {
                    id: "les-auto-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                    moduleId: autoModule.id,
                    title: parsed.title,
                    transcript: parsed.transcript
                  };

                  lessons.push(newLesson);
                  lessonsUpdated = true;
                }
              }
            }
          } catch (err) {
            console.error("[AutoLearn] Error running AI summarization:", err);
          }

          chat.autoLearned = true;
          chatsUpdated = true;
        }
      }

      if (chatsUpdated) {
        userData[chatsKey] = JSON.stringify(chatsList);
      }
      if (lessonsUpdated) {
        userData[lessonsKey] = JSON.stringify(lessons);
        userData[modulesKey] = JSON.stringify(modules);
      }
    }
  }

  // Save the updated userData back to PostgreSQL/file system
  if (pgdb.isConfigured()) {
    await pgdb.setValue("global_settings_" + userId, userData);
  } else {
    const dbData = await readDb();
    if (!dbData.userData) dbData.userData = {};
    dbData.userData[userId] = userData;
    await writeDb(dbData);
  }
  console.log(`[AutoLearn] Finished background auto learning for user ${userId}.`);
}
