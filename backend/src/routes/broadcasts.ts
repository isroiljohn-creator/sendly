import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";
import { addBroadcastToQueue } from "../services/queue";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/broadcasts
 * Lists all broadcasts.
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const { data: broadcasts, error } = await supabase
      .from("broadcasts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ broadcasts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/broadcasts
 * Creates a new broadcast configuration in pending state.
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { account_id, name, message_text } = req.body;

  if (!account_id || !name || !message_text) {
    return res.status(400).json({ error: "Provide account_id, name, and message_text fields" });
  }

  try {
    // 1. Verify Instagram Account ownership
    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("id", account_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!account) {
      return res.status(404).json({ error: "Instagram account not found or access denied" });
    }

    // 2. Fetch contact count to estimate total_count
    const { count, error: countErr } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("account_id", account_id)
      .eq("user_id", userId);

    if (countErr) throw countErr;

    // 3. Create the pending broadcast config
    const { data: broadcast, error } = await supabase
      .from("broadcasts")
      .insert({
        user_id: userId,
        account_id,
        name,
        message_text,
        status: "pending",
        sent_count: 0,
        failed_count: 0,
        total_count: count || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ broadcast });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/broadcasts/:id/send
 * Triggers background rate-limited sending of the broadcast.
 */
router.post("/:id/send", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;

  try {
    const { data: broadcast, error } = await supabase
      .from("broadcasts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!broadcast) {
      return res.status(404).json({ error: "Broadcast configuration not found" });
    }

    if (broadcast.status !== "pending") {
      return res.status(400).json({ error: `Cannot send broadcast in status: ${broadcast.status}` });
    }

    // Start background processor via Bull queue
    await addBroadcastToQueue(id, userId!);

    return res.json({ success: true, message: "Broadcast transmission initiated in background." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/broadcasts/:id/stats
 * Returns progress statistics of a broadcast.
 */
router.get("/:id/stats", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;

  try {
    const { data: broadcast, error } = await supabase
      .from("broadcasts")
      .select("id, status, sent_count, failed_count, total_count")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!broadcast) {
      return res.status(404).json({ error: "Broadcast not found" });
    }

    return res.json({ stats: broadcast });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
