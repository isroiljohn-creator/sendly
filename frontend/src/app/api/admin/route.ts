import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as pgdb from "@/lib/pgdb";
import { verifyJwt } from "@/lib/jwt";
import modelPricing from "@/config/model_pricing.json";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeDb(data: unknown) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function checkIfUserIsAdmin(userId: string, email: string): Promise<boolean> {
  let usersList = [];
  if (pgdb.isConfigured()) {
    try {
      usersList = await pgdb.getValue("global_users") || [];
    } catch (e) {
      console.error("Failed to read users list in admin check", e);
    }
  } else {
    const dbData = readDb();
    usersList = dbData.users || [];
  }
  
  const user = usersList.find((u: any) => u.id === userId || (u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim()));
  if (!user) return false;
  const emailClean = user.email?.toLowerCase().trim() || "";
  return user.role === "admin" || emailClean === "admin@sendly.uz" || emailClean === "isroiljohnabdullayev@gmail.com" || emailClean === "aisroil005@gmail.com";
}

// ─── Real analytics: read from Railway global_analytics_daily ───────────────
async function readRealAnalytics(
  premiumCount: number,
  proCount: number
) {
  const dailyRevenue: Array<{ date: string; amount: number }> = [];
  const dailyVisitors: Array<{ date: string; count: number }> = [];
  const dailyActiveUsers: Array<{ date: string; count: number }> = [];

  // Build last-30-days date list
  const dates: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().split("T")[0]); // YYYY-MM-DD
  }

  // Read tracked analytics from Railway PostgreSQL
  let trackedMap: Record<string, { visitors: number; dau: number; newUsers: number }> = {};
  if (pgdb.isConfigured()) {
    try {
      const parsed = await pgdb.getValue("global_analytics_daily");
      if (parsed?.days && Array.isArray(parsed.days)) {
        for (const day of parsed.days) {
          if (day.date) trackedMap[day.date] = day;
        }
      }
    } catch {
      // ignore, use 0s
    }
  }

  // Daily revenue based on real plan counts (SaaS monthly / 30)
  const dailyRevenueAmount = Math.round((premiumCount * 600000 + proCount * 75000) / 30);

  for (const dateStr of dates) {
    const tracked = trackedMap[dateStr];
    const day = new Date(dateStr);
    const label = `${day.getDate()}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][day.getMonth()]}`;

    dailyVisitors.push({ date: label, count: tracked?.visitors ?? 0 });
    dailyActiveUsers.push({ date: label, count: tracked?.dau ?? 0 });
    // For today, use real-time revenue calculation; for past, use tracked or real-time
    dailyRevenue.push({ date: label, amount: tracked ? dailyRevenueAmount : 0 });
  }

  return { dailyVisitors, dailyActiveUsers, dailyRevenue };
}

// ─── Real growth % calculation from user createdAt ───────────────────────────
function calcGrowthPct(users: any[], days = 7): string | null {
  const now = Date.now();
  const msPerDay = 86400000;
  const last = users.filter(u => {
    if (!u.createdAt) return false;
    const t = new Date(u.createdAt).getTime();
    return !isNaN(t) && (now - t) <= days * msPerDay;
  }).length;
  const prev = users.filter(u => {
    if (!u.createdAt) return false;
    const t = new Date(u.createdAt).getTime();
    return !isNaN(t) && (now - t) > days * msPerDay && (now - t) <= days * 2 * msPerDay;
  }).length;
  if (prev === 0) return last > 0 ? "+" + last : null;
  const pct = ((last - prev) / prev * 100);
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;

    // For announcement fetching (no token required, only stats)
    const isAnnouncementOnly = !token;
    
    if (!isAnnouncementOnly && !jwtSecret) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }

    let isAdmin = false;
    if (token && jwtSecret) {
      const payload = verifyJwt(token, jwtSecret);
      if (payload) {
        isAdmin = await checkIfUserIsAdmin(payload.user_id, payload.email);
      }
    }

    // For non-admin: only return systemAnnouncement
    if (!isAdmin) {
      let announcement = "";
      if (pgdb.isConfigured()) {
        try {
          const adminData = await pgdb.getValue("global_admin_data");
          announcement = adminData?.systemAnnouncement || "";
        } catch { /* ignore */ }
      } else {
        const db = readDb();
        announcement = db.systemAnnouncement || "";
      }
      return NextResponse.json({ systemAnnouncement: announcement });
    }

    // ─── ADMIN FULL DATA ──────────────────────────────────────────────────────
    let usersList: any[] = [];
    let userDataMap: Record<string, any> = {};
    let promoCodes: any[] = [];
    let auditLogs: any[] = [];
    let systemAnnouncement = "";

    if (pgdb.isConfigured()) {
      try {
        // 1. Get global users
        usersList = await pgdb.getValue("global_users") || [];

        // 2. Get global admin data
        const adminData = await pgdb.getValue("global_admin_data") || {};
        const rawPromoCodes = adminData.promoCodes || [];
        const rawAuditLogs = adminData.auditLogs || [];
        promoCodes = rawPromoCodes.filter((p: any) => p && p.code !== "SENDLY10" && p.code !== "WELCOME" && p.code !== "PROMO50");
        auditLogs = rawAuditLogs.filter((l: any) => l && !l.action?.includes("SENDLY10") && l.user !== "admin@sendly.uz" && !l.user?.includes("test.com"));
        systemAnnouncement = adminData.systemAnnouncement || "";

        if (promoCodes.length !== rawPromoCodes.length || auditLogs.length !== rawAuditLogs.length) {
          await pgdb.setValue("global_admin_data", { promoCodes, auditLogs, systemAnnouncement });
        }

        // 3. Get all user settings
        const allSettings = await pgdb.getAllLike("global_settings_%");
        allSettings.forEach(row => {
          const uid = row.key.replace("global_settings_", "");
          try {
            userDataMap[uid] = typeof row.value === "string"
              ? JSON.parse(row.value)
              : row.value;
          } catch {
            userDataMap[uid] = row.value || {};
          }
        });

        if (promoCodes.length === 0 && auditLogs.length === 0) {
          await pgdb.setValue("global_admin_data", { promoCodes: [], auditLogs: [], systemAnnouncement });
        }
      } catch (e) {
        console.error("Admin Railway fetch failed, falling back to local", e);
      }
    }

    if (usersList.length === 0 && Object.keys(userDataMap).length === 0) {
      const dbData = readDb();
      usersList = dbData.users || [];
      userDataMap = dbData.userData || {};
      let dbUpdated = false;
      if (!dbData.promoCodes) { dbData.promoCodes = []; dbUpdated = true; }
      else {
        const prev = dbData.promoCodes.length;
        dbData.promoCodes = dbData.promoCodes.filter((p: any) => p && p.code !== "SENDLY10" && p.code !== "WELCOME" && p.code !== "PROMO50");
        if (dbData.promoCodes.length !== prev) dbUpdated = true;
      }
      promoCodes = dbData.promoCodes;
      if (!dbData.auditLogs) { dbData.auditLogs = []; dbUpdated = true; }
      else {
        const prev = dbData.auditLogs.length;
        dbData.auditLogs = dbData.auditLogs.filter((l: any) => l && !l.action?.includes("SENDLY10") && l.user !== "admin@sendly.uz" && !l.user?.includes("test.com"));
        if (dbData.auditLogs.length !== prev) dbUpdated = true;
      }
      auditLogs = dbData.auditLogs;
      systemAnnouncement = dbData.systemAnnouncement || "";
      if (dbUpdated) writeDb(dbData);
    }

    usersList = Array.isArray(usersList) ? usersList.filter(u => u && typeof u === "object") : [];

    // Build rich users
    const richUsers = usersList.map((u: any) => {
      const uData = userDataMap[u.id] || {};
      let channels: any[] = [];
      if (uData.replai_channels) {
        try { channels = typeof uData.replai_channels === "string" ? JSON.parse(uData.replai_channels) : uData.replai_channels; } catch {}
      }
      if (Array.isArray(channels)) {
        channels = channels.map((ch: any) => {
          const settingsKey = `replai_bot_settings_${ch.id}`;
          let botSettings = null;
          if (uData[settingsKey]) {
            try { botSettings = typeof uData[settingsKey] === "string" ? JSON.parse(uData[settingsKey]) : uData[settingsKey]; } catch {}
          }
          const automationsKey = `replai_automations_${ch.id}`;
          let automationsList: any[] = [];
          if (uData[automationsKey]) {
            try { automationsList = typeof uData[automationsKey] === "string" ? JSON.parse(uData[automationsKey]) : uData[automationsKey]; } catch {}
          }
          return { ...ch, botSettings, automationsCount: Array.isArray(automationsList) ? automationsList.length : 0 };
        });
      }

      let lessonsCount = 0;
      Object.entries(uData).forEach(([key, val]) => {
        if (key === "replai_lessons" || key.startsWith("replai_lessons_")) {
          try {
            const l = typeof val === "string" ? JSON.parse(val) : val;
            if (Array.isArray(l)) lessonsCount += l.length;
          } catch {}
        }
      });
      let modulesCount = 0;
      Object.entries(uData).forEach(([key, val]) => {
        if (key === "replai_modules" || key.startsWith("replai_modules_")) {
          try {
            const m = typeof val === "string" ? JSON.parse(val) : val;
            if (Array.isArray(m)) modulesCount += m.length;
          } catch {}
        }
      });

      let credits = { balance: 100, used: 0, history: [] };
      if (uData.replai_ai_credits_data) {
        try { credits = typeof uData.replai_ai_credits_data === "string" ? JSON.parse(uData.replai_ai_credits_data) : uData.replai_ai_credits_data; } catch {}
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

    // Referrals
    const referralsList: any[] = [];
    usersList.forEach((u: any) => {
      if (u.referredBy) {
        const referrer = usersList.find((r: any) => r.id === u.referredBy);
        const commission = u.plan === "vip" ? "180 000 UZS" : u.plan === "premium" ? "45 000 UZS" : u.plan === "pro" ? "22 500 UZS" : "0 UZS";
        referralsList.push({
          id: u.id,
          referrerName: referrer?.fullName || "Noma'lum Hamkor",
          referrerEmail: referrer?.email || "",
          referredName: u.fullName || "Foydalanuvchi",
          referredEmail: u.email || "",
          plan: u.plan || "free",
          commission,
          date: u.trialExpiresAt || u.createdAt?.split("T")[0] || "—"
        });
      }
    });

    // Bot contacts – use REAL currentStep from contact data
    const botContactsList: any[] = [];
    Object.entries(userDataMap).forEach(([uid, uData]: [string, any]) => {
      const owner = usersList.find((u: any) => u.id === uid);
      if (uData?.replai_contacts) {
        let contacts: any[] = [];
        try { contacts = typeof uData.replai_contacts === "string" ? JSON.parse(uData.replai_contacts) : uData.replai_contacts; } catch {}
        if (Array.isArray(contacts)) {
          contacts.forEach((c: any, idx: number) => {
            if (c && typeof c === "object") {
              botContactsList.push({
                id: c.id || `c-${idx}-${Date.now()}`,
                name: c.name || "Mijoz",
                username: c.username || "",
                status: c.status || false,
                messagesCount: c.messagesCount || 0,
                tags: c.tags || [],
                lastActive: c.lastActive || "",
                ownerEmail: owner?.email || "guest",
                // Real currentStep from contact data, NOT randomized
                currentStep: c.currentStep || c.menuStep || "—",
                phone: c.phone || "",
                email: c.email || "",
                companyName: c.companyName || ""
              });
            }
          });
        }
      }
    });

    // Real platform metrics
    const totalUsers = richUsers.length;
    const activeVipCount = richUsers.filter((u: any) => u.plan === "vip").length;
    const activePremiumCount = richUsers.filter((u: any) => u.plan === "premium").length;
    const activeProCount = richUsers.filter((u: any) => u.plan === "pro").length;
    const totalChannels = richUsers.reduce((acc: number, u: any) => acc + (u.channelsCount || 0), 0);
    const totalCredits = richUsers.reduce((acc: number, u: any) => acc + (u.creditsBalance || 0), 0);
    const totalCommissionsFloat = referralsList.reduce((acc: number, r: any) => {
      const val = parseFloat(r.commission.replace(/[^0-9]/g, ""));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    // Real growth % based on createdAt
    const userGrowthPct = calcGrowthPct(usersList, 7);
    const premiumGrowthPct = calcGrowthPct(usersList.filter((u: any) => u.plan === "vip" || u.plan === "premium"), 7);

    // Real channel growth: compare channels created in last 7 days vs prev 7 days
    const allChannels: any[] = [];
    Object.values(userDataMap).forEach((uData: any) => {
      if (uData?.replai_channels) {
        try {
          const chs = typeof uData.replai_channels === "string" ? JSON.parse(uData.replai_channels) : uData.replai_channels;
          if (Array.isArray(chs)) allChannels.push(...chs);
        } catch {}
      }
    });
    const channelGrowthPct = calcGrowthPct(allChannels.map(ch => ({ createdAt: ch.createdAt })), 7);

    // Real conversion rates
    const paidCount = activeVipCount + activePremiumCount + activeProCount;
    const registerToPaid = totalUsers > 0
      ? ((paidCount / totalUsers) * 100).toFixed(1) + "%"
      : "0%";

    // visitorToRegister: read from analytics tracker (today's data)
    let visitorToRegister: string | null = null;
    if (pgdb.isConfigured()) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const parsed = await pgdb.getValue("global_analytics_daily");
        if (parsed?.days) {
          const todayData = parsed.days.find((d: any) => d.date === today);
          if (todayData?.visitors > 0 && todayData?.newUsers > 0) {
            visitorToRegister = ((todayData.newUsers / todayData.visitors) * 100).toFixed(1) + "%";
          } else if (todayData?.visitors > 0) {
            visitorToRegister = "0%";
          }
        }
      } catch { /* ignore */ }
    }

    const stats = {
      totalUsers,
      activeVipCount,
      activePremiumCount,
      activeProCount,
      totalChannels,
      totalCredits,
      totalCommissions: `${totalCommissionsFloat.toLocaleString("uz-UZ")} UZS`,
      // Real growth badges (null means not enough data to show)
      userGrowthPct,
      premiumGrowthPct,
      channelGrowthPct,
      conversionsRate: {
        visitorToRegister: visitorToRegister,
        registerToPaid
      }
    };

    // Real analytics charts
    const analyticsData = await readRealAnalytics(activePremiumCount, activeProCount);

    const topConsumersList = [...richUsers]
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

    const topChannelsList = [...botContactsList]
      .sort((a, b) => b.messagesCount - a.messagesCount)
      .slice(0, 5);

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
        ...analyticsData,
        topChannels: topChannelsList,
        topConsumers: topConsumersList
      }
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Admin API GET error:", err);
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
    const isAdmin = payload ? await checkIfUserIsAdmin(payload.user_id, payload.email) : false;
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied. System admins only." }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;
    const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    if (pgdb.isConfigured()) {
      try {
        let usersList = await pgdb.getValue("global_users") || [];
        const adminData = await pgdb.getValue("global_admin_data") || {};
        let promoCodes = adminData.promoCodes || [];
        let auditLogs = adminData.auditLogs || [];
        let systemAnnouncement = adminData.systemAnnouncement || "";

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
          auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `Yangi promokod yaratildi: ${normalizedCode} (${amount} kredit)`, date: timestamp.substring(0, 16) });

        } else if (action === "delete_promo") {
          const { code } = body;
          promoCodes = promoCodes.filter((p: any) => p.code !== code);
          auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `Promokod o'chirildi: ${code}`, date: timestamp.substring(0, 16) });

        } else if (action === "update_user_plan") {
          const { userId, plan } = body;
          const userIdx = usersList.findIndex((u: any) => u.id === userId);
          if (userIdx === -1) return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 400 });
          const prevPlan = usersList[userIdx].plan || "free";
          usersList[userIdx].plan = plan;
          if (plan === "free") {
            usersList[userIdx].isCardLinked = false;
            delete usersList[userIdx].cardNumber;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            usersList[userIdx].trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
          } else {
            usersList[userIdx].isCardLinked = true;
            if (!usersList[userIdx].cardNumber) usersList[userIdx].cardNumber = "Visa, *8899";
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            usersList[userIdx].trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
          }
          auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `${usersList[userIdx].email} obunasi ${prevPlan.toUpperCase()} dan ${plan.toUpperCase()} ga o'zgartirildi`, date: timestamp.substring(0, 16) });
          await pgdb.setValue("global_users", usersList);

          try {
            const uData = await pgdb.getValue("global_settings_" + userId) || {};
            let creditsData = { balance: 500, used: 0, history: [] as any[] };
            if (uData.replai_ai_credits_data) {
              try { creditsData = typeof uData.replai_ai_credits_data === "string" ? JSON.parse(uData.replai_ai_credits_data) : uData.replai_ai_credits_data; } catch {}
            }
            let creditBalance = 500;
            const planKey = plan.toLowerCase();
            if (planKey in modelPricing.plans) {
              creditBalance = (modelPricing.plans as Record<string, number>)[planKey];
            }
            const description = `${plan.toUpperCase()} tarif obunasi uchun ${creditBalance.toLocaleString("uz-UZ")} ta kredit taqdim etildi`;
            creditsData.balance = creditBalance;
            creditsData.history.unshift({ id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`, type: "purchase", amount: creditBalance, description, date: timestamp });
            uData.replai_ai_credits_data = creditsData;
            await pgdb.setValue("global_settings_" + userId, uData);
          } catch (err) {
            console.error("Failed to sync user credits on admin plan change:", err);
          }

        } else if (action === "update_user_credits") {
          const { userId, amount } = body;
          const uData = await pgdb.getValue("global_settings_" + userId) || {};
          let creditsData = { balance: 100, used: 0, history: [] as any[] };
          if (uData.replai_ai_credits_data) {
            try { creditsData = typeof uData.replai_ai_credits_data === "string" ? JSON.parse(uData.replai_ai_credits_data) : uData.replai_ai_credits_data; } catch {}
          }
          creditsData.balance = Math.max(0, (creditsData.balance || 0) + Number(amount));
          creditsData.history.unshift({ id: `tx-${Date.now()}`, type: amount >= 0 ? "purchase" : "usage", amount: Math.abs(amount), description: amount >= 0 ? "Admin tomonidan qo'shilgan kredit" : "Admin tomonidan yechib olingan kredit", date: timestamp });
          uData.replai_ai_credits_data = creditsData;
          await pgdb.setValue("global_settings_" + userId, uData);
          const userObj = usersList.find((u: any) => u.id === userId);
          auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `${userObj?.email || "Foydalanuvchi"} balansiga ${amount >= 0 ? "+" : ""}${amount} kredit yozildi`, date: timestamp.substring(0, 16) });

        } else if (action === "set_system_announcement") {
          const { announcement } = body;
          systemAnnouncement = announcement || "";
          auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: announcement ? `Tizim bildirishnomasi joylandi: "${announcement}"` : "Tizim bildirishnomasi o'chirildi", date: timestamp.substring(0, 16) });

        } else if (action === "add_audit_log") {
          const { user, logAction } = body;
          auditLogs.unshift({ id: `l-${Date.now()}`, user: user || "system", action: logAction, date: timestamp.substring(0, 16) });
        }

        await pgdb.setValue("global_admin_data", { promoCodes, auditLogs, systemAnnouncement });

        return NextResponse.json({ success: true, promoCodes });
      } catch (e) {
        console.error("Admin POST Railway failed, falling back to local", e);
      }
    }

    // Local file fallback
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
      dbData.promoCodes.push({ code: normalizedCode, amount: Number(amount), maxUses: Number(maxUses) || 1000, usedCount: 0, restrictedToEmail: restrictedToEmail ? restrictedToEmail.trim() : "", createdAt: new Date().toLocaleDateString("uz-UZ") });
      dbData.auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `Yangi promokod yaratildi: ${normalizedCode} (${amount} kredit)`, date: timestamp.substring(0, 16) });
    } else if (action === "delete_promo") {
      const { code } = body;
      dbData.promoCodes = dbData.promoCodes.filter((p: any) => p.code !== code);
      dbData.auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `Promokod o'chirildi: ${code}`, date: timestamp.substring(0, 16) });
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
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        dbData.users[userIdx].trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
      } else {
        dbData.users[userIdx].isCardLinked = true;
        if (!dbData.users[userIdx].cardNumber) dbData.users[userIdx].cardNumber = "Visa, *8899";
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        dbData.users[userIdx].trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
      }
      if (!dbData.userData) dbData.userData = {};
      if (!dbData.userData[userId]) dbData.userData[userId] = {};
      let creditsData = { balance: 500, used: 0, history: [] as any[] };
      const rawCreds = dbData.userData[userId]["replai_ai_credits_data"];
      if (rawCreds) { try { creditsData = typeof rawCreds === "string" ? JSON.parse(rawCreds) : rawCreds; } catch {} }
      let creditBalance = 500;
      const planKey = plan.toLowerCase();
      if (planKey in modelPricing.plans) {
        creditBalance = (modelPricing.plans as Record<string, number>)[planKey];
      }
      const description = `${plan.toUpperCase()} tarif obunasi uchun ${creditBalance.toLocaleString("uz-UZ")} ta kredit taqdim etildi`;
      creditsData.balance = creditBalance;
      if (!creditsData.history) creditsData.history = [];
      creditsData.history.unshift({ id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`, type: "purchase", amount: creditBalance, description, date: timestamp });
      dbData.userData[userId]["replai_ai_credits_data"] = creditsData;
      dbData.auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `${dbData.users[userIdx].email} obunasi ${prevPlan.toUpperCase()} dan ${plan.toUpperCase()} ga o'zgartirildi`, date: timestamp.substring(0, 16) });
    } else if (action === "update_user_credits") {
      const { userId, amount } = body;
      if (!dbData.userData) dbData.userData = {};
      if (!dbData.userData[userId]) dbData.userData[userId] = {};
      let creditsData = { balance: 100, used: 0, history: [] as any[] };
      const rawCreds = dbData.userData[userId]["replai_ai_credits_data"];
      if (rawCreds) { try { creditsData = typeof rawCreds === "string" ? JSON.parse(rawCreds) : rawCreds; } catch {} }
      creditsData.balance = Math.max(0, (creditsData.balance || 0) + Number(amount));
      if (!creditsData.history) creditsData.history = [];
      creditsData.history.unshift({ id: `tx-${Date.now()}`, type: amount >= 0 ? "purchase" : "usage", amount: Math.abs(amount), description: amount >= 0 ? "Admin tomonidan qo'shilgan kredit" : "Admin tomonidan yechib olingan kredit", date: timestamp });
      dbData.userData[userId]["replai_ai_credits_data"] = creditsData;
      const userObj = (dbData.users || []).find((u: any) => u.id === userId);
      dbData.auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: `${userObj?.email || "Foydalanuvchi"} balansiga ${amount >= 0 ? "+" : ""}${amount} kredit yozildi`, date: timestamp.substring(0, 16) });
    } else if (action === "set_system_announcement") {
      const { announcement } = body;
      dbData.systemAnnouncement = announcement || "";
      dbData.auditLogs.unshift({ id: `l-${Date.now()}`, user: "admin@sendly.uz", action: announcement ? `Tizim bildirishnomasi joylandi: "${announcement}"` : "Tizim bildirishnomasi o'chirildi", date: timestamp.substring(0, 16) });
    } else if (action === "add_audit_log") {
      const { user, logAction } = body;
      dbData.auditLogs.unshift({ id: `l-${Date.now()}`, user: user || "system", action: logAction, date: timestamp.substring(0, 16) });
    }

    writeDb(dbData);
    return NextResponse.json({ success: true, promoCodes: dbData.promoCodes });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Admin API POST error:", err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
