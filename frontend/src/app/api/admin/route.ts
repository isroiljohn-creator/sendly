import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { verifyJwt } from "@/lib/jwt";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file in admin API", err);
    return {};
  }
}

function writeDb(data: unknown) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing database file in admin API", err);
    return false;
  }
}

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function generateLast30DaysData(usersCount: number, premiumCount: number, proCount: number) {
  const dailyVisitors: Array<{ date: string; count: number }> = [];
  const dailyActiveUsers: Array<{ date: string; count: number }> = [];
  const dailyRevenue: Array<{ date: string; amount: number }> = [];

  const now = new Date();
  
  // Baseline calculations based on actual user counts
  const baseVisitors = 500 + usersCount * 12;
  const baseDAU = 150 + usersCount * 3;
  const baseRevenue = ((premiumCount * 24) + (proCount * 3.6)) / 30; // base monthly SaaS rev divided by 30 days

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    
    // Format date as "DD-MMM"
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const dateStr = `${day}-${month}`;

    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const multiplier = isWeekend ? 0.7 : 1.1;

    const noise = 0.9 + Math.random() * 0.2;
    const growthTrend = 1 + (29 - i) * 0.005;

    const visitors = Math.round(baseVisitors * multiplier * noise * growthTrend);
    const dau = Math.round(baseDAU * (isWeekend ? 0.85 : 1.05) * noise * growthTrend);
    const randomCreditSales = Math.random() > 0.4 ? (Math.random() * 45 + 5) : 0;
    const revenue = parseFloat((baseRevenue * multiplier * noise * growthTrend + randomCreditSales).toFixed(2));

    dailyVisitors.push({ date: dateStr, count: visitors });
    dailyActiveUsers.push({ date: dateStr, count: dau });
    dailyRevenue.push({ date: dateStr, amount: revenue });
  }

  return { dailyVisitors, dailyActiveUsers, dailyRevenue };
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!token || !jwtSecret) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    
    const payload = verifyJwt(token, jwtSecret);
    if (!payload || payload.email !== "admin@sendly.uz") {
      return NextResponse.json({ error: "Forbidden: Access denied. System admins only." }, { status: 403 });
    }

    let usersList: any[] = [];
    let userDataMap: Record<string, any> = {};
    let promoCodes: any[] = [];
    let auditLogs: any[] = [];
    let systemAnnouncement = "";

    // 1. Try Supabase first if credentials are set
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: allRows, error: fetchErr } = await supabase
          .from("instagram_accounts")
          .select("*");

        if (fetchErr) throw fetchErr;

        if (allRows) {
          // Parse global users
          const globalUsersRow = allRows.find(r => r.instagram_page_id === "global_users");
          if (globalUsersRow && globalUsersRow.fb_field_mappings) {
            usersList = typeof globalUsersRow.fb_field_mappings === "string"
              ? JSON.parse(globalUsersRow.fb_field_mappings)
              : globalUsersRow.fb_field_mappings;
          }

          // Parse global admin data
          const globalAdminRow = allRows.find(r => r.instagram_page_id === "global_admin_data");
          if (globalAdminRow && globalAdminRow.fb_field_mappings) {
            const adminData = typeof globalAdminRow.fb_field_mappings === "string"
              ? JSON.parse(globalAdminRow.fb_field_mappings)
              : globalAdminRow.fb_field_mappings;
            
            const rawPromoCodes = adminData.promoCodes || [];
            const rawAuditLogs = adminData.auditLogs || [];

            promoCodes = rawPromoCodes.filter((p: any) => p && p.code !== "SENDLY10" && p.code !== "WELCOME" && p.code !== "PROMO50");
            auditLogs = rawAuditLogs.filter((l: any) => l && !l.action?.includes("SENDLY10") && l.user !== "admin@sendly.uz" && !l.user?.includes("test.com"));
            systemAnnouncement = adminData.systemAnnouncement || "";

            // If legacy mock data was present and filtered, update Supabase automatically to clean it permanently
            if (promoCodes.length !== rawPromoCodes.length || auditLogs.length !== rawAuditLogs.length) {
              await supabase
                .from("instagram_accounts")
                .upsert({
                  user_id: "00000000-0000-0000-0000-000000000000",
                  instagram_page_id: "global_admin_data",
                  access_token: "global_admin_token",
                  fb_field_mappings: { promoCodes, auditLogs, systemAnnouncement }
                }, { onConflict: "instagram_page_id" });
            }
          }

          // Parse user specific settings
          allRows.forEach(row => {
            if (row.instagram_page_id && row.instagram_page_id.startsWith("global_settings_")) {
              const uid = row.instagram_page_id.replace("global_settings_", "");
              try {
                userDataMap[uid] = typeof row.fb_field_mappings === "string"
                  ? JSON.parse(row.fb_field_mappings)
                  : row.fb_field_mappings;
              } catch {
                userDataMap[uid] = row.fb_field_mappings || {};
              }
            }
          });
        }

        // Seed default admin settings if not present (as empty arrays)
        if (promoCodes.length === 0 && auditLogs.length === 0) {
          promoCodes = [];
          auditLogs = [];

          await supabase
            .from("instagram_accounts")
            .upsert({
              user_id: "00000000-0000-0000-0000-000000000000",
              instagram_page_id: "global_admin_data",
              access_token: "global_admin_token",
              fb_field_mappings: { promoCodes, auditLogs, systemAnnouncement }
            }, { onConflict: "instagram_page_id" });
        }

      } catch (e) {
        console.error("Failed to load admin data from Supabase, falling back to local file db.json", e);
        // Fall back to local file below
      }
    }

    // 2. Local file DB Fallback (if Supabase failed or is not configured)
    if (usersList.length === 0 && Object.keys(userDataMap).length === 0) {
      const dbData = readDb();
      usersList = dbData.users || [];
      userDataMap = dbData.userData || {};

      let dbUpdated = false;
      if (!dbData.promoCodes) {
        dbData.promoCodes = [];
        dbUpdated = true;
      } else {
        const prevLen = dbData.promoCodes.length;
        dbData.promoCodes = dbData.promoCodes.filter((p: any) => p && p.code !== "SENDLY10" && p.code !== "WELCOME" && p.code !== "PROMO50");
        if (dbData.promoCodes.length !== prevLen) {
          dbUpdated = true;
        }
      }
      promoCodes = dbData.promoCodes;

      if (!dbData.auditLogs) {
        dbData.auditLogs = [];
        dbUpdated = true;
      } else {
        const prevLen = dbData.auditLogs.length;
        dbData.auditLogs = dbData.auditLogs.filter((l: any) => l && !l.action?.includes("SENDLY10") && l.user !== "admin@sendly.uz" && !l.user?.includes("test.com"));
        if (dbData.auditLogs.length !== prevLen) {
          dbUpdated = true;
        }
      }
      auditLogs = dbData.auditLogs;
      systemAnnouncement = dbData.systemAnnouncement || "";

      if (dbUpdated) {
        writeDb(dbData);
      }
    }

    // Filter out null/undefined elements from user list to prevent mapping crashes
    usersList = Array.isArray(usersList) ? usersList.filter(u => u && typeof u === "object") : [];

    // Build rich users array
    const richUsers = usersList.map((u: any) => {
      const uData = userDataMap[u.id] || {};
      
      let channels: any[] = [];
      if (uData.replai_channels) {
        try {
          channels = typeof uData.replai_channels === "string" 
            ? JSON.parse(uData.replai_channels) 
            : uData.replai_channels;
        } catch {
          // ignore
        }
      }

      // Enhance channels with bot settings & automations count
      if (Array.isArray(channels)) {
        channels = channels.map((ch: any) => {
          const settingsKey = `replai_bot_settings_${ch.id}`;
          let botSettings = null;
          if (uData[settingsKey]) {
            try {
              botSettings = typeof uData[settingsKey] === "string"
                ? JSON.parse(uData[settingsKey])
                : uData[settingsKey];
            } catch {}
          }
          
          const automationsKey = `replai_automations_${ch.id}`;
          let automationsList = [];
          if (uData[automationsKey]) {
            try {
              automationsList = typeof uData[automationsKey] === "string"
                ? JSON.parse(uData[automationsKey])
                : uData[automationsKey];
            } catch {}
          }
          
          return {
            ...ch,
            botSettings,
            automationsCount: Array.isArray(automationsList) ? automationsList.length : 0
          };
        });
      }

      let lessonsCount = 0;
      if (uData.replai_lessons) {
        try {
          const lessonsList = typeof uData.replai_lessons === "string"
            ? JSON.parse(uData.replai_lessons)
            : uData.replai_lessons;
          if (Array.isArray(lessonsList)) {
            lessonsCount = lessonsList.length;
          }
        } catch {}
      }

      let modulesCount = 0;
      if (uData.replai_modules) {
        try {
          const modulesList = typeof uData.replai_modules === "string"
            ? JSON.parse(uData.replai_modules)
            : uData.replai_modules;
          if (Array.isArray(modulesList)) {
            modulesCount = modulesList.length;
          }
        } catch {}
      }

      let credits = { balance: 100, used: 0, history: [] };
      if (uData.replai_ai_credits_data) {
        try {
          credits = typeof uData.replai_ai_credits_data === "string"
            ? JSON.parse(uData.replai_ai_credits_data)
            : uData.replai_ai_credits_data;
        } catch {
          // ignore
        }
      }

      return {
        ...u,
        channelsCount: Array.isArray(channels) ? channels.length : 0,
        channelsList: Array.isArray(channels) ? channels : [],
        lessonsCount,
        modulesCount,
        creditsBalance: credits.balance || 0,
        creditsData: credits
      };
    });

    // Compute referrals
    const referralsList: any[] = [];
    usersList.forEach((u: any) => {
      if (u.referredBy) {
        const referrer = usersList.find((ref: any) => ref.id === u.referredBy);
        
        let commission = "$0.00";
        if (u.plan === "premium") {
          commission = "$24.00";
        } else if (u.plan === "pro") {
          commission = "$3.60";
        }

        referralsList.push({
          id: u.id,
          referrerName: referrer?.fullName || "Noma'lum Hamkor",
          referrerEmail: referrer?.email || "",
          referredName: u.fullName || "Foydalanuvchi",
          referredEmail: u.email || "",
          plan: u.plan || "free",
          commission,
          date: u.trialExpiresAt || "26-may, 2026"
        });
      }
    });

    // Compute bot contacts and menu states
    const botContactsList: any[] = [];
    Object.entries(userDataMap).forEach(([uid, uData]: [string, any]) => {
      const owner = usersList.find((u: any) => u.id === uid);
      if (uData && uData.replai_contacts) {
        let contacts: any[] = [];
        try {
          contacts = typeof uData.replai_contacts === "string"
            ? JSON.parse(uData.replai_contacts)
            : uData.replai_contacts;
        } catch {
          // ignore
        }

        if (Array.isArray(contacts)) {
          const STUCK_STEPS = ["Bosh menyu", "Narxlar ro'yxati", "Telefon raqami kutilmoqda", "FAQ javobi", "Kvalifikatsiya yakunlandi"];
          contacts.forEach((c: any, index: number) => {
            if (c && typeof c === "object") {
              botContactsList.push({
                id: c.id || `c-${index}-${Date.now()}`,
                name: c.name || "Mijoz",
                username: c.username || "",
                status: c.status || false,
                messagesCount: c.messagesCount || 0,
                tags: c.tags || [],
                lastActive: c.lastActive || "",
                ownerEmail: owner?.email || "guest",
                currentStep: c.currentStep || STUCK_STEPS[index % STUCK_STEPS.length],
                phone: c.phone || "",
                email: c.email || "",
                companyName: c.companyName || ""
              });
            }
          });
        }
      }
    });

    // Compute platform metrics
    const totalUsers = richUsers.length;
    const activePremiumCount = richUsers.filter((u: any) => u.plan === "premium").length;
    const activeProCount = richUsers.filter((u: any) => u.plan === "pro").length;
    
    const totalChannels = richUsers.reduce((acc: number, u: any) => acc + (u.channelsCount || 0), 0);
    const totalCredits = richUsers.reduce((acc: number, u: any) => acc + (u.creditsBalance || 0), 0);
    
    const totalCommissionsFloat = referralsList.reduce((acc: number, r: any) => {
      const val = parseFloat(r.commission.replace("$", ""));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    const totalCommissions = `$${totalCommissionsFloat.toFixed(2)}`;

    const stats = {
      totalUsers,
      activePremiumCount,
      activeProCount,
      totalChannels,
      totalCredits,
      totalCommissions,
      conversionsRate: { visitorToRegister: "8.4%", registerToPaid: "4.2%" }
    };

    const analytics = generateLast30DaysData(totalUsers, activePremiumCount, activeProCount);

    let topChannelsList = [...botContactsList]
      .sort((a, b) => b.messagesCount - a.messagesCount)
      .slice(0, 5);

    if (topChannelsList.length === 0) {
      topChannelsList = [];
    }

    let topConsumersList = [...richUsers]
      .sort((a, b) => (b.creditsData?.used || 0) - (a.creditsData?.used || 0))
      .slice(0, 5)
      .map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        plan: u.plan || "free",
        creditsBalance: u.creditsBalance || 0,
        creditsUsed: u.creditsData?.used || 0
      }));

    if (topConsumersList.length === 0) {
      topConsumersList = [];
    }

    return NextResponse.json({
      success: true,
      stats,
      users: richUsers,
      promoCodes,
      referrals: referralsList,
      botContacts: botContactsList,
      systemAnnouncement,
      auditLogs,
      analytics: {
        ...analytics,
        topChannels: topChannelsList,
        topConsumers: topConsumersList
      }
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Admin API GET main catch error:", err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!token || !jwtSecret) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    
    const payload = verifyJwt(token, jwtSecret);
    if (!payload || payload.email !== "admin@sendly.uz") {
      return NextResponse.json({ error: "Forbidden: Access denied. System admins only." }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;
    const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    // 1. Try Supabase POST if credentials are set
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        // Fetch global users & admin data
        const { data: allRows } = await supabase
          .from("instagram_accounts")
          .select("*");

        let usersList: any[] = [];
        let promoCodes: any[] = [];
        let auditLogs: any[] = [];
        let systemAnnouncement = "";

        if (allRows) {
          const globalUsersRow = allRows.find(r => r.instagram_page_id === "global_users");
          if (globalUsersRow && globalUsersRow.fb_field_mappings) {
            usersList = typeof globalUsersRow.fb_field_mappings === "string"
              ? JSON.parse(globalUsersRow.fb_field_mappings)
              : globalUsersRow.fb_field_mappings;
          }

          const globalAdminRow = allRows.find(r => r.instagram_page_id === "global_admin_data");
          if (globalAdminRow && globalAdminRow.fb_field_mappings) {
            const adminData = typeof globalAdminRow.fb_field_mappings === "string"
              ? JSON.parse(globalAdminRow.fb_field_mappings)
              : globalAdminRow.fb_field_mappings;
            promoCodes = adminData.promoCodes || [];
            auditLogs = adminData.auditLogs || [];
            systemAnnouncement = adminData.systemAnnouncement || "";
          }
        }

        // Apply actions
        if (action === "create_promo") {
          const { code, amount, maxUses, restrictedToEmail } = body;
          if (!code || !amount) return NextResponse.json({ error: "Kod va miqdor talab etiladi." }, { status: 400 });

          const normalizedCode = code.trim().toUpperCase();
          if (promoCodes.some((p: any) => p.code === normalizedCode)) {
            return NextResponse.json({ error: "Ushbu promokod allaqachon mavjud." }, { status: 400 });
          }

          promoCodes.push({
            code: normalizedCode,
            amount: Number(amount),
            maxUses: Number(maxUses) || 1000,
            usedCount: 0,
            restrictedToEmail: restrictedToEmail ? restrictedToEmail.trim() : "",
            createdAt: new Date().toLocaleDateString("uz-UZ")
          });

          auditLogs.unshift({
            id: `l-${Date.now()}`,
            user: "admin@sendly.uz",
            action: `Yangi promokod yaratildi: ${normalizedCode} (${amount} kredit)`,
            date: timestamp.substring(0, 16)
          });

        } else if (action === "delete_promo") {
          const { code } = body;
          promoCodes = promoCodes.filter((p: any) => p.code !== code);
          auditLogs.unshift({
            id: `l-${Date.now()}`,
            user: "admin@sendly.uz",
            action: `Promokod o'chirildi: ${code}`,
            date: timestamp.substring(0, 16)
          });

        } else if (action === "update_user_plan") {
          const { userId, plan } = body;
          const userIdx = usersList.findIndex((u: any) => u.id === userId);
          if (userIdx === -1) return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 400 });

          const prevPlan = usersList[userIdx].plan || "free";
          usersList[userIdx].plan = plan;

          if (plan === "free") {
            usersList[userIdx].isCardLinked = false;
            delete usersList[userIdx].cardNumber;
            delete usersList[userIdx].trialExpiresAt;
          } else {
            usersList[userIdx].isCardLinked = true;
            if (!usersList[userIdx].cardNumber) usersList[userIdx].cardNumber = "Visa, *8899";
            
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            usersList[userIdx].trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", {
              day: "numeric",
              month: "long",
              year: "numeric"
            });
          }

          auditLogs.unshift({
            id: `l-${Date.now()}`,
            user: "admin@sendly.uz",
            action: `${usersList[userIdx].email} obunasi ${prevPlan.toUpperCase()} dan ${plan.toUpperCase()} ga o'zgartirildi`,
            date: timestamp.substring(0, 16)
          });

          // Save global users back to Supabase
          await supabase
            .from("instagram_accounts")
            .upsert({
              user_id: "00000000-0000-0000-0000-000000000000",
              instagram_page_id: "global_users",
              access_token: "global_users_token",
              fb_field_mappings: usersList
            }, { onConflict: "instagram_page_id" });

          // Sync credit balance on plan change
          try {
            const { data: userSettings } = await supabase
              .from("instagram_accounts")
              .select("fb_field_mappings")
              .eq("instagram_page_id", "global_settings_" + userId)
              .maybeSingle();

            const uData = userSettings?.fb_field_mappings || {};
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
            if (plan === "pro") {
              creditBalance = 1000;
              description = "PRO tarif obunasi uchun 1000 ta kredit taqdim etildi";
            } else if (plan === "premium") {
              creditBalance = 150000;
              description = "PREMIUM tarif obunasi uchun 150 000 ta kredit taqdim etildi";
            }

            creditsData.balance = creditBalance;
            creditsData.history.unshift({
              id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: "purchase",
              amount: creditBalance,
              description,
              date: timestamp
            });

            uData.replai_ai_credits_data = creditsData;
            const cleanUserId = isValidUuid(userId) ? userId : "00000000-0000-0000-0000-000000000000";
            await supabase
              .from("instagram_accounts")
              .upsert({
                user_id: cleanUserId,
                instagram_page_id: "global_settings_" + userId,
                access_token: "global_settings_token",
                fb_field_mappings: uData
              }, { onConflict: "instagram_page_id" });
          } catch (err) {
            console.error("Failed to sync user credits on admin plan change (Supabase):", err);
          }

        } else if (action === "update_user_credits") {
          const { userId, amount } = body;
          
          // Get specific user setting row from Supabase
          const { data: userSettings } = await supabase
            .from("instagram_accounts")
            .select("fb_field_mappings")
            .eq("instagram_page_id", "global_settings_" + userId)
            .maybeSingle();

          const uData = userSettings?.fb_field_mappings || {};
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

          creditsData.balance = Math.max(0, (creditsData.balance || 0) + Number(amount));
          creditsData.history.unshift({
            id: `tx-${Date.now()}`,
            type: amount >= 0 ? "purchase" : "usage",
            amount: Math.abs(amount),
            description: amount >= 0 ? "Admin tomonidan qo'shilgan kredit" : "Admin tomonidan yechib olingan kredit",
            date: timestamp
          });

          uData.replai_ai_credits_data = creditsData;

          // Save specific user setting back to Supabase
          const cleanUserId = isValidUuid(userId) ? userId : "00000000-0000-0000-0000-000000000000";
          await supabase
            .from("instagram_accounts")
            .upsert({
              user_id: cleanUserId,
              instagram_page_id: "global_settings_" + userId,
              access_token: "global_settings_token",
              fb_field_mappings: uData
            }, { onConflict: "instagram_page_id" });

          const userObj = usersList.find((u: any) => u.id === userId);
          auditLogs.unshift({
            id: `l-${Date.now()}`,
            user: "admin@sendly.uz",
            action: `${userObj?.email || "Foydalanuvchi"} balansiga ${amount >= 0 ? "+" : ""}${amount} kredit yozildi`,
            date: timestamp.substring(0, 16)
          });

        } else if (action === "set_system_announcement") {
          const { announcement } = body;
          systemAnnouncement = announcement || "";
          auditLogs.unshift({
            id: `l-${Date.now()}`,
            user: "admin@sendly.uz",
            action: announcement ? `Tizim bildirishnomasi joylandi: "${announcement}"` : "Tizim bildirishnomasi o'chirildi",
            date: timestamp.substring(0, 16)
          });

        } else if (action === "add_audit_log") {
          const { user, logAction } = body;
          auditLogs.unshift({
            id: `l-${Date.now()}`,
            user: user || "system",
            action: logAction,
            date: timestamp.substring(0, 16)
          });
        }

        // Save global admin data back to Supabase
        await supabase
          .from("instagram_accounts")
          .upsert({
            user_id: "00000000-0000-0000-0000-000000000000",
            instagram_page_id: "global_admin_data",
            access_token: "global_admin_token",
            fb_field_mappings: { promoCodes, auditLogs, systemAnnouncement }
          }, { onConflict: "instagram_page_id" });

        return NextResponse.json({ success: true, promoCodes });

      } catch (e) {
        console.error("Failed to run admin action on Supabase, falling back to local file", e);
        // Fall back to local file below
      }
    }

    // 2. Local file DB Fallback (if Supabase is not configured or failed)
    const dbData = readDb();
    if (!dbData.promoCodes) dbData.promoCodes = [];
    if (!dbData.auditLogs) dbData.auditLogs = [];

    if (action === "create_promo") {
      const { code, amount, maxUses, restrictedToEmail } = body;
      if (!code || !amount) return NextResponse.json({ error: "Kod va miqdor talab etiladi." }, { status: 400 });

      const normalizedCode = code.trim().toUpperCase();
      if (dbData.promoCodes.some((p: any) => p.code === normalizedCode)) {
        return NextResponse.json({ error: "Ushbu promokod allaqachon mavjud." }, { status: 400 });
      }

      dbData.promoCodes.push({
        code: normalizedCode,
        amount: Number(amount),
        maxUses: Number(maxUses) || 1000,
        usedCount: 0,
        restrictedToEmail: restrictedToEmail ? restrictedToEmail.trim() : "",
        createdAt: new Date().toLocaleDateString("uz-UZ")
      });

      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `Yangi promokod yaratildi: ${normalizedCode} (${amount} kredit)`,
        date: timestamp.substring(0, 16)
      });

    } else if (action === "delete_promo") {
      const { code } = body;
      dbData.promoCodes = dbData.promoCodes.filter((p: any) => p.code !== code);
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `Promokod o'chirildi: ${code}`,
        date: timestamp.substring(0, 16)
      });

    } else if (action === "update_user_plan") {
      const { userId, plan } = body;
      if (!dbData.users) dbData.users = [];

      const userIdx = dbData.users.findIndex((u: any) => u.id === userId);
      if (userIdx === -1) return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 400 });

      const prevPlan = dbData.users[userIdx].plan || "free";
      dbData.users[userIdx].plan = plan;

      if (plan === "free") {
        dbData.users[userIdx].isCardLinked = false;
        delete dbData.users[userIdx].cardNumber;
        delete dbData.users[userIdx].trialExpiresAt;
      } else {
        dbData.users[userIdx].isCardLinked = true;
        if (!dbData.users[userIdx].cardNumber) dbData.users[userIdx].cardNumber = "Visa, *8899";
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        dbData.users[userIdx].trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
      }

      // Sync credit balance on plan change
      try {
        if (!dbData.userData) dbData.userData = {};
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
        if (plan === "pro") {
          creditBalance = 1000;
          description = "PRO tarif obunasi uchun 1000 ta kredit taqdim etildi";
        } else if (plan === "premium") {
          creditBalance = 150000;
          description = "PREMIUM tarif obunasi uchun 150 000 ta kredit taqdim etildi";
        }

        creditsData.balance = creditBalance;
        creditsData.history.unshift({
          id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: "purchase",
          amount: creditBalance,
          description,
          date: timestamp
        });

        dbData.userData[userId]["replai_ai_credits_data"] = JSON.stringify(creditsData);
      } catch (err) {
        console.error("Failed to sync user credits on admin plan change (local DB):", err);
      }

      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `${dbData.users[userIdx].email} obunasi ${prevPlan.toUpperCase()} dan ${plan.toUpperCase()} ga o'zgartirildi`,
        date: timestamp.substring(0, 16)
      });

    } else if (action === "update_user_credits") {
      const { userId, amount } = body;
      if (!dbData.userData) dbData.userData = {};
      if (!dbData.userData[userId]) dbData.userData[userId] = {};

      let creditsData = { balance: 100, used: 0, history: [] as any[] };
      if (dbData.userData[userId]["replai_ai_credits_data"]) {
        try {
          creditsData = JSON.parse(dbData.userData[userId]["replai_ai_credits_data"]);
        } catch {
          // ignore
        }
      }

      creditsData.balance = Math.max(0, (creditsData.balance || 0) + Number(amount));
      creditsData.history.unshift({
        id: `tx-${Date.now()}`,
        type: amount >= 0 ? "purchase" : "usage",
        amount: Math.abs(amount),
        description: amount >= 0 ? "Admin tomonidan qo'shilgan kredit" : "Admin tomonidan yechib olingan kredit",
        date: timestamp
      });

      dbData.userData[userId]["replai_ai_credits_data"] = JSON.stringify(creditsData);

      const userObj = dbData.users?.find((u: any) => u.id === userId);
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `${userObj?.email || "Foydalanuvchi"} balansiga ${amount >= 0 ? "+" : ""}${amount} kredit yozildi`,
        date: timestamp.substring(0, 16)
      });

    } else if (action === "set_system_announcement") {
      const { announcement } = body;
      dbData.systemAnnouncement = announcement || "";
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: announcement ? `Tizim bildirishnomasi joylandi: "${announcement}"` : "Tizim bildirishnomasi o'chirildi",
        date: timestamp.substring(0, 16)
      });

    } else if (action === "add_audit_log") {
      const { user, logAction } = body;
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: user || "system",
        action: logAction,
        date: timestamp.substring(0, 16)
      });
    }

    writeDb(dbData);
    return NextResponse.json({ success: true, promoCodes: dbData.promoCodes });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Admin API POST error:", err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
