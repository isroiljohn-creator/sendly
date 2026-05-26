import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "db.json");

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

export async function GET(request: Request) {
  try {
    const dbData = readDb();
    
    // Ensure lists exist
    const usersList = dbData.users || [];
    
    if (!dbData.promoCodes) {
      dbData.promoCodes = [
        { code: "SENDLY10", amount: 10000, maxUses: 1000, usedCount: 142, restrictedToEmail: "", createdAt: "15-may, 2026" },
        { code: "WELCOME", amount: 5000, maxUses: 1000, usedCount: 521, restrictedToEmail: "", createdAt: "10-may, 2026" },
        { code: "PROMO50", amount: 50000, maxUses: 50, usedCount: 12, restrictedToEmail: "", createdAt: "20-may, 2026" }
      ];
      writeDb(dbData);
    }

    if (!dbData.auditLogs) {
      dbData.auditLogs = [
        { id: "l-1", user: "admin@sendly.uz", action: "Tizim sozlamalari yangilandi", date: "26-May, 20:10" },
        { id: "l-2", user: "ali@test.com", action: "SENDLY10 promokodini faollashtirdi", date: "26-May, 19:42" },
        { id: "l-3", user: "nodir@test.com", action: "PRO obunaga bog'landi (UzCard)", date: "26-May, 18:15" },
        { id: "l-4", user: "shavkat@test.com", action: "Yangi telegram ulanishini yaratdi", date: "26-May, 15:30" }
      ];
      writeDb(dbData);
    }

    // Build user profiles list with their local channels & credits
    const userDataMap = dbData.userData || {};
    const richUsers = usersList.map((u: any) => {
      const uData = userDataMap[u.id] || {};
      
      // Parse channels
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

      // Parse credits
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
        channelsCount: channels.length,
        channelsList: channels,
        creditsBalance: credits.balance || 0,
        creditsData: credits
      };
    });

    // Compute referrals relationships
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
          referredName: u.fullName,
          referredEmail: u.email,
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
      if (uData.replai_contacts) {
        let contacts: any[] = [];
        try {
          contacts = typeof uData.replai_contacts === "string"
            ? JSON.parse(uData.replai_contacts)
            : uData.replai_contacts;
        } catch {
          // ignore
        }

        if (Array.isArray(contacts)) {
          // Mock stuck steps if none exist to present a rich panel
          const STUCK_STEPS = ["Bosh menyu", "Narxlar ro'yxati", "Telefon raqami kutilmoqda", "FAQ javobi", "Kvalifikatsiya yakunlandi"];
          contacts.forEach((c: any, index: number) => {
            botContactsList.push({
              id: c.id,
              name: c.name,
              username: c.username,
              status: c.status,
              messagesCount: c.messagesCount,
              tags: c.tags || [],
              lastActive: c.lastActive,
              ownerEmail: owner?.email || "guest",
              currentStep: c.currentStep || STUCK_STEPS[index % STUCK_STEPS.length]
            });
          });
        }
      }
    });

    // Compute general platform metrics
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
      totalCommissions
    };

    return NextResponse.json({
      success: true,
      stats,
      users: richUsers,
      promoCodes: dbData.promoCodes || [],
      referrals: referralsList,
      botContacts: botContactsList,
      systemAnnouncement: dbData.systemAnnouncement || "",
      auditLogs: dbData.auditLogs || []
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    const dbData = readDb();

    if (!dbData.promoCodes) dbData.promoCodes = [];
    if (!dbData.auditLogs) dbData.auditLogs = [];

    const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    if (action === "create_promo") {
      const { code, amount, maxUses, restrictedToEmail } = body;
      if (!code || !amount) {
        return NextResponse.json({ error: "Kod va miqdor talab etiladi." }, { status: 400 });
      }

      const normalizedCode = code.trim().toUpperCase();
      if (dbData.promoCodes.some((p: any) => p.code === normalizedCode)) {
        return NextResponse.json({ error: "Ushbu promokod allaqachon mavjud." }, { status: 400 });
      }

      const newPromo = {
        code: normalizedCode,
        amount: Number(amount),
        maxUses: Number(maxUses) || 1000,
        usedCount: 0,
        restrictedToEmail: restrictedToEmail ? restrictedToEmail.trim() : "",
        createdAt: new Date().toLocaleDateString("uz-UZ")
      };

      dbData.promoCodes.push(newPromo);
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `Yangi promokod yaratildi: ${normalizedCode} (${amount} kredit)`,
        date: timestamp.substring(0, 16)
      });

      writeDb(dbData);
      return NextResponse.json({ success: true, promoCodes: dbData.promoCodes });

    } else if (action === "delete_promo") {
      const { code } = body;
      dbData.promoCodes = dbData.promoCodes.filter((p: any) => p.code !== code);
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `Promokod o'chirildi: ${code}`,
        date: timestamp.substring(0, 16)
      });

      writeDb(dbData);
      return NextResponse.json({ success: true, promoCodes: dbData.promoCodes });

    } else if (action === "update_user_plan") {
      const { userId, plan } = body;
      if (!dbData.users) dbData.users = [];

      const userIdx = dbData.users.findIndex((u: any) => u.id === userId);
      if (userIdx === -1) {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 400 });
      }

      const prevPlan = dbData.users[userIdx].plan || "free";
      dbData.users[userIdx].plan = plan;

      if (plan === "free") {
        dbData.users[userIdx].isCardLinked = false;
        delete dbData.users[userIdx].cardNumber;
        delete dbData.users[userIdx].trialExpiresAt;
      } else {
        dbData.users[userIdx].isCardLinked = true;
        if (!dbData.users[userIdx].cardNumber) {
          dbData.users[userIdx].cardNumber = "Visa, *8899";
        }
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        dbData.users[userIdx].trialExpiresAt = expiresAt.toLocaleDateString("uz-UZ", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
      }

      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `${dbData.users[userIdx].email} obunasi ${prevPlan.toUpperCase()} dan ${plan.toUpperCase()} ga o'zgartirildi`,
        date: timestamp.substring(0, 16)
      });

      writeDb(dbData);
      return NextResponse.json({ success: true });

    } else if (action === "update_user_credits") {
      const { userId, amount } = body; // amount can be positive or negative
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

      // Find user email
      const usersList = dbData.users || [];
      const userObj = usersList.find((u: any) => u.id === userId);

      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: `${userObj?.email || "Foydalanuvchi"} balansiga ${amount >= 0 ? "+" : ""}${amount} kredit yozildi`,
        date: timestamp.substring(0, 16)
      });

      writeDb(dbData);
      return NextResponse.json({ success: true });

    } else if (action === "set_system_announcement") {
      const { announcement } = body;
      dbData.systemAnnouncement = announcement || "";
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: "admin@sendly.uz",
        action: announcement ? `Tizim bildirishnomasi joylandi: "${announcement}"` : "Tizim bildirishnomasi o'chirildi",
        date: timestamp.substring(0, 16)
      });

      writeDb(dbData);
      return NextResponse.json({ success: true });

    } else if (action === "add_audit_log") {
      const { user, logAction } = body;
      dbData.auditLogs.unshift({
        id: `l-${Date.now()}`,
        user: user || "system",
        action: logAction,
        date: timestamp.substring(0, 16)
      });
      writeDb(dbData);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
