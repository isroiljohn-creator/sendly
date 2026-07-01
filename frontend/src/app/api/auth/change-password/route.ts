import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as pgdb from "@/lib/pgdb";
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
    console.error("Error reading database file in change-password API", err);
    return {};
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing database file in change-password API", err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
    }

    const payload = verifyJwt(token, jwtSecret);
    if (!payload || !payload.user_id) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { oldPassword, newPassword } = await request.json();
    if (!newPassword) {
      return NextResponse.json({ error: "Yangi parol kiritilishi shart." }, { status: 400 });
    }

    const newHashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update in Railway Postgres if configured
    if (pgdb.isConfigured()) {
      try {
        const usersList = await pgdb.getValue("global_users") || [];
        const idx = usersList.findIndex((u: any) => u.id === payload.user_id);
        if (idx > -1) {
          const user = usersList[idx];
          
          // Verify old password if they have one set (Google auth users might not have one)
          if (user.password) {
            if (!oldPassword) {
              return NextResponse.json({ error: "Eski parol kiritilishi shart." }, { status: 400 });
            }
            
            let oldValid = false;
            try {
              oldValid = bcrypt.compareSync(oldPassword, user.password);
            } catch {
              // Not a bcrypt hash
            }
            
            if (!oldValid) {
              const oldLegacyHashed = crypto.createHash("sha256").update(oldPassword).digest("hex");
              if (user.password !== oldLegacyHashed && user.password !== oldPassword) {
                return NextResponse.json({ error: "Eski parol noto'g'ri." }, { status: 400 });
              }
            }
          }

          usersList[idx].password = newHashedPassword;
          await pgdb.setValue("global_users", usersList);
          console.log(`[change-password] Successfully changed password for user ID: ${payload.user_id} in PostgreSQL`);
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
        }
      } catch (e: any) {
        console.error("Failed to update password in pgdb:", e);
        return NextResponse.json({ error: "Baza bilan bog'lanishda xatolik: " + e.message }, { status: 500 });
      }
    }

    // Fallback: update in local db.json file
    const dbData = readDb();
    const users = dbData.users || [];
    const idx = users.findIndex((u: any) => u.id === payload.user_id);
    if (idx > -1) {
      const user = users[idx];
      
      if (user.password) {
        if (!oldPassword) {
          return NextResponse.json({ error: "Eski parol kiritilishi shart." }, { status: 400 });
        }
        
        let oldValid = false;
        try {
          oldValid = bcrypt.compareSync(oldPassword, user.password);
        } catch {
          // Not a bcrypt hash
        }
        
        if (!oldValid) {
          const oldLegacyHashed = crypto.createHash("sha256").update(oldPassword).digest("hex");
          if (user.password !== oldLegacyHashed && user.password !== oldPassword) {
            return NextResponse.json({ error: "Eski parol noto'g'ri." }, { status: 400 });
          }
        }
      }

      users[idx].password = newHashedPassword;
      dbData.users = users;
      writeDb(dbData);
      console.log(`[change-password] Successfully changed password for user ID: ${payload.user_id} in db.json`);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
    }
  } catch (err: unknown) {
    console.error("[change-password-api] Unexpected error:", err);
    const errMsg = err instanceof Error ? err.message : "Parolni o'zgartirishda xatolik yuz berdi.";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
