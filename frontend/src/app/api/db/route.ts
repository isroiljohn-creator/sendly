import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { startTelegramBots } from "@/lib/telegramBotRunner";
import * as pgdb from "@/lib/pgdb";
import { verifyJwt } from "@/lib/jwt";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function getInitialData() {
  return {};
}

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(getInitialData(), null, 2), "utf8");
      return getInitialData();
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, returning empty state", err);
    return getInitialData();
  }
}

function writeDb(data: unknown) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing to database file", err);
    return false;
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
    
    if (!token || !jwtSecret) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
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
  let dbData = readDb();
  
  // Migration support for old format without userData/users
  if (dbData && !dbData.userData && !dbData.users) {
    const users = dbData.replai_users ? JSON.parse(dbData.replai_users) : [];
    dbData = {
      users: users,
      userData: {}
    };
    writeDb(dbData);
  }

  if (!dbData.users) {
    dbData.users = [];
  }
  if (!dbData.userData) {
    dbData.userData = {};
  }
  writeDb(dbData);
  
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

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "guest";

  if (userId === "guest") {
    return NextResponse.json({ error: "Forbidden: Guests cannot write to database" }, { status: 403 });
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!token || !jwtSecret) {
    return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
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
          
          if (newUser && (!prevUser || prevUser.plan !== newUser.plan)) {
            const newPlan = newUser.plan || "free";
            const uData = await pgdb.getValue("global_settings_" + userId) || {};

            let creditsData = { balance: 100, used: 0, history: [] as any[] };
            if (uData.replai_ai_credits_data) {
              try {
                creditsData = typeof uData.replai_ai_credits_data === "string"
                  ? JSON.parse(uData.replai_ai_credits_data)
                  : uData.replai_ai_credits_data;
              } catch {
                // ignore
              }
            }

            let creditBalance = 100;
            let description = "Hisob bepul tarifga o'tkazildi (Free reset)";
            if (newPlan === "pro") {
              creditBalance = 1000;
              description = "PRO tarif obunasi uchun 1000 ta kredit taqdim etildi";
            } else if (newPlan === "premium") {
              creditBalance = 150000;
              description = "PREMIUM tarif obunasi uchun 150 000 ta kredit taqdim etildi";
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
    let dbData = readDb();
    
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
        
        // Detect plan change to sync credits in local mode
        const prevUser = prevUsers.find((u: any) => u.id === userId || (u.email && u.email === dbData.users.find((x: any) => x.id === userId)?.email));
        const newUser = dbData.users.find((u: any) => u.id === userId);
        
        if (newUser && (!prevUser || prevUser.plan !== newUser.plan)) {
          const newPlan = newUser.plan || "free";
          if (!dbData.userData[userId]) dbData.userData[userId] = {};
          
          let creditsData = { balance: 100, used: 0, history: [] as any[] };
          if (dbData.userData[userId]["replai_ai_credits_data"]) {
            try {
              creditsData = JSON.parse(dbData.userData[userId]["replai_ai_credits_data"]);
            } catch {
              // ignore
            }
          }

          let creditBalance = 100;
          let description = "Hisob bepul tarifga o'tkazildi (Free reset)";
          if (newPlan === "pro") {
            creditBalance = 1000;
            description = "PRO tarif obunasi uchun 1000 ta kredit taqdim etildi";
          } else if (newPlan === "premium") {
            creditBalance = 150000;
            description = "PREMIUM tarif obunasi uchun 150 000 ta kredit taqdim etildi";
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

    const success = writeDb(dbData);
    
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
