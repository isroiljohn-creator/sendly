import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/gamification/leaderboard
 * Returns contacts ranked by gamification points for the user's account.
 * Query parameter: ?account_id=<uuid> (optional filter)
 */
router.get("/leaderboard", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { account_id } = req.query;

  try {
    let query = supabase
      .from("gamification_scores")
      .select(`
        points,
        updated_at,
        contacts!inner (
          id,
          instagram_user_id,
          username,
          full_name,
          profile_picture,
          user_id
        )
      `)
      .eq("contacts.user_id", userId);

    if (account_id) {
      query = query.eq("account_id", account_id);
    }

    const { data: scores, error } = await query
      .order("points", { ascending: false })
      .limit(50); // Top 50 leaderboard

    if (error) throw error;

    // Format output
    const leaderboard = (scores || []).map((s: any) => ({
      contact_id: s.contacts.id,
      instagram_user_id: s.contacts.instagram_user_id,
      username: s.contacts.username,
      full_name: s.contacts.full_name,
      profile_picture: s.contacts.profile_picture,
      points: s.points,
      updated_at: s.updated_at,
    }));

    return res.json({ leaderboard });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/score/:contact_id
 * Returns points score for a specific contact.
 */
router.get("/score/:contact_id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { contact_id } = req.params;

  try {
    // 1. Verify contact ownership
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, account_id")
      .eq("id", contact_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // 2. Fetch score
    const { data: scoreRecord, error } = await supabase
      .from("gamification_scores")
      .select("points, updated_at")
      .eq("contact_id", contact_id)
      .eq("account_id", contact.account_id)
      .maybeSingle();

    if (error) throw error;

    return res.json({
      contact_id,
      points: scoreRecord?.points || 0,
      updated_at: scoreRecord?.updated_at || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
