import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase, getPool } from "../config/db";

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

    // 2. Get messages count
    const { count: msgCount, error: msgErr } = await supabase
      .from("messages")
      .select("id, contacts!inner(user_id)", { count: "exact", head: true })
      .eq("contacts.user_id", userId);

    if (msgErr) throw msgErr;
    const messagesCount = msgCount || 0;

    // 3. Get runs count
    const { count: rCount, error: rErr } = await supabase
      .from("automation_runs")
      .select("id, contacts!inner(user_id)", { count: "exact", head: true })
      .eq("contacts.user_id", userId);

    if (rErr) throw rErr;
    const runsCount = rCount || 0;

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
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM contacts 
       WHERE user_id = $1 
       GROUP BY DATE(created_at) 
       ORDER BY DATE(created_at) ASC`,
      [userId]
    );

    const contactGrowth = rows.map((r: any) => {
      const dateStr = r.date instanceof Date 
        ? r.date.toISOString().split("T")[0] 
        : String(r.date).split("T")[0];
      return {
        date: dateStr,
        count: parseInt(r.count, 10),
      };
    });

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
    })).sort((a: any, b: any) => b.runs_count - a.runs_count);

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
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT 
         c.id, 
         c.converted_at, 
         c.automation_id, 
         c.contact_id,
         a.name as automation_name,
         cnt.username as contact_username
       FROM conversions c
       INNER JOIN contacts cnt ON c.contact_id = cnt.id
       INNER JOIN automations a ON c.automation_id = a.id
       WHERE cnt.user_id = $1
       ORDER BY c.converted_at DESC`,
      [userId]
    );

    const enrichedConversions = rows.map((r: any) => ({
      id: r.id,
      converted_at: r.converted_at,
      automation_id: r.automation_id,
      automation_name: r.automation_name || "Unknown",
      contact_id: r.contact_id,
      contact_username: r.contact_username || "Unknown",
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
