import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/analytics/summary
 * Returns aggregated counts of contacts, messages, and automation runs.
 */
router.get("/summary", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    // 1. Get contacts count
    const { count: contactsCount, error: contactsErr } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (contactsErr) throw contactsErr;

    // 2. Fetch contact IDs to filter messages and runs
    const { data: userContacts, error: ucErr } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId);

    if (ucErr) throw ucErr;

    const contactIds = (userContacts || []).map((c: any) => c.id);

    let messagesCount = 0;
    let runsCount = 0;

    if (contactIds.length > 0) {
      // Get messages count
      const { count: msgCount, error: msgErr } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("contact_id", contactIds);

      if (msgErr) throw msgErr;
      messagesCount = msgCount || 0;

      // Get runs count
      const { count: rCount, error: rErr } = await supabase
        .from("automation_runs")
        .select("*", { count: "exact", head: true })
        .in("contact_id", contactIds);

      if (rErr) throw rErr;
      runsCount = rCount || 0;
    }

    return res.json({
      summary: {
        contacts_count: contactsCount || 0,
        messages_count: messagesCount,
        automation_runs_count: runsCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/contacts
 * Returns contact counts grouped by creation date (YYYY-MM-DD).
 */
router.get("/contacts", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("created_at")
      .eq("user_id", userId);

    if (error) throw error;

    // Group contacts by day in JavaScript to ensure compat with mock DB client
    const grouped: Record<string, number> = {};
    (contacts || []).forEach((c: any) => {
      const dateVal = c.created_at || new Date().toISOString();
      const dateStr = new Date(dateVal).toISOString().split("T")[0];
      grouped[dateStr] = (grouped[dateStr] || 0) + 1;
    });

    const contactGrowth = Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({ contacts_growth: contactGrowth });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/automations
 * Returns launch run counts per automation.
 */
router.get("/automations", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const { data: automations, error } = await supabase
      .from("automations")
      .select("id, name, launch_count")
      .eq("user_id", userId);

    if (error) throw error;

    const stats = (automations || []).map((auto: any) => ({
      automation_id: auto.id,
      name: auto.name,
      runs_count: auto.launch_count || 0,
    })).sort((a, b) => b.runs_count - a.runs_count);

    return res.json({ automations_stats: stats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/conversions
 * Returns counts of recorded conversions.
 */
router.get("/conversions", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    // 1. Fetch contact IDs belonging to user
    const { data: userContacts, error: ucErr } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId);

    if (ucErr) throw ucErr;

    const contactIds = (userContacts || []).map((c: any) => c.id);

    if (contactIds.length === 0) {
      return res.json({ conversions: [], total_conversions: 0 });
    }

    // 2. Fetch conversions
    const { data: conversions, error } = await supabase
      .from("conversions")
      .select(`
        id,
        converted_at,
        automation_id,
        contact_id
      `)
      .in("contact_id", contactIds)
      .order("converted_at", { ascending: false });

    if (error) throw error;

    // Fetch automations and contacts details to enrich conversions info
    const { data: automations } = await supabase
      .from("automations")
      .select("id, name")
      .eq("user_id", userId);

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, username")
      .eq("user_id", userId);

    const autoMap = new Map((automations || []).map((a: any) => [a.id, a.name]));
    const contactMap = new Map((contacts || []).map((c: any) => [c.id, c.username]));

    const enrichedConversions = (conversions || []).map((conv: any) => ({
      id: conv.id,
      converted_at: conv.converted_at,
      automation_id: conv.automation_id,
      automation_name: autoMap.get(conv.automation_id) || "Unknown",
      contact_id: conv.contact_id,
      contact_username: contactMap.get(conv.contact_id) || "Unknown",
    }));

    return res.json({
      total_conversions: enrichedConversions.length,
      conversions: enrichedConversions,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
