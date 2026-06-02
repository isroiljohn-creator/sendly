import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // No Supabase configured – silently ignore tracking
      return NextResponse.json({ ok: true });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Read existing analytics
    const { data: row } = await supabase
      .from("instagram_accounts")
      .select("fb_field_mappings")
      .eq("instagram_page_id", "global_analytics_daily")
      .maybeSingle();

    let days: Array<{
      date: string;
      visitors: number;
      dau: number;
      newUsers: number;
    }> = [];

    if (row?.fb_field_mappings) {
      const parsed =
        typeof row.fb_field_mappings === "string"
          ? JSON.parse(row.fb_field_mappings)
          : row.fb_field_mappings;
      if (parsed.days && Array.isArray(parsed.days)) {
        days = parsed.days;
      }
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

    // Upsert back to Supabase
    await supabase.from("instagram_accounts").upsert(
      {
        user_id: "00000000-0000-0000-0000-000000000000",
        instagram_page_id: "global_analytics_daily",
        access_token: "global_analytics_token",
        fb_field_mappings: { days },
      },
      { onConflict: "instagram_page_id" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never crash – tracking must be fire-and-forget
    console.error("Track API error:", err);
    return NextResponse.json({ ok: true });
  }
}
