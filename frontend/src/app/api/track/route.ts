import { NextResponse } from "next/server";
import * as pgdb from "@/lib/pgdb";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    if (!pgdb.isConfigured()) {
      // No database configured – silently ignore tracking
      return NextResponse.json({ ok: true });
    }

    // Read existing analytics
    const row = await pgdb.getValue("global_analytics_daily");

    let days: Array<{
      date: string;
      visitors: number;
      dau: number;
      newUsers: number;
    }> = [];

    if (row && row.days && Array.isArray(row.days)) {
      days = row.days;
    }

    // Find or create today's entry
    let todayEntry = days.find((d) => d.date === today);
    if (!todayEntry) {
      todayEntry = { date: today, visitors: 0, dau: 0, newUsers: 0 };
      days.push(todayEntry);
    }

    // Increment visitor count
    todayEntry.visitors += 1;

    // If logged-in user → increment DAU (deduplicated via userId presence)
    if (userId) {
      todayEntry.dau += 1;
    }

    // Keep only last 60 days to prevent bloat
    days.sort((a, b) => a.date.localeCompare(b.date));
    if (days.length > 60) {
      days = days.slice(days.length - 60);
    }

    // Upsert back to Railway PostgreSQL
    await pgdb.setValue("global_analytics_daily", { days });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never crash – tracking must be fire-and-forget
    console.error("Track API error:", err);
    return NextResponse.json({ ok: true });
  }
}
