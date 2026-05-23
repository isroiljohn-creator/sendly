import { Router, Request, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/referral-links
 * Generates a referral code and saves it to referral_links table.
 * Protected by authMiddleware.
 */
router.post("/api/referral-links", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { automation_id } = req.body;

  if (!automation_id) {
    return res.status(400).json({ error: "automation_id is required" });
  }

  try {
    // 1. Verify automation ownership
    const { data: automation } = await supabase
      .from("automations")
      .select("id")
      .eq("id", automation_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!automation) {
      return res.status(404).json({ error: "Automation not found or access denied" });
    }

    // 2. Generate a random unique code
    const code = crypto.randomBytes(4).toString("hex"); // e.g. "a1b2c3d4"

    const { data: link, error } = await supabase
      .from("referral_links")
      .insert({
        automation_id,
        user_id: userId,
        code,
        click_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ link });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/referral-links
 * Lists referral links for the authenticated user.
 * Protected by authMiddleware.
 */
router.get("/api/referral-links", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const { data: links, error } = await supabase
      .from("referral_links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ links });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// In-memory rate limiting map for public redirects to prevent DoS/spam
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const REFERRAL_LIMIT = 30; // 30 requests per minute
const LIMIT_WINDOW = 60 * 1000; // 1 minute

function referralRateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + LIMIT_WINDOW });
    return next();
  }

  if (record.count >= REFERRAL_LIMIT) {
    console.warn(`[Referral Rate Limit] IP ${ip} exceeded limit.`);
    return res.status(429).send("Too many requests. Please try again later.");
  }

  record.count++;
  return next();
}

/**
 * GET /r/:code
 * Public route to handle referral link redirection.
 * Increments click count and redirects user to Instagram DM.
 * Expected query parameter: ?ref=<referrerContactId>
 */
router.get("/r/:code", referralRateLimiter, async (req: Request, res: Response) => {
  const { code } = req.params;
  const referrerContactId = req.query.ref as string || "none";

  try {
    // 1. Resolve referral link from DB
    const { data: link, error: linkErr } = await supabase
      .from("referral_links")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (linkErr || !link) {
      return res.status(404).send("Referral link not found");
    }

    // 2. Increment click count
    await supabase
      .from("referral_links")
      .update({ click_count: (link.click_count || 0) + 1 })
      .eq("id", link.id);

    // 3. Resolve the Instagram account username for redirect
    const { data: automation } = await supabase
      .from("automations")
      .select("account_id")
      .eq("id", link.automation_id)
      .maybeSingle();

    if (!automation) {
      return res.status(404).send("Associated automation not found");
    }

    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("username")
      .eq("id", automation.account_id)
      .maybeSingle();

    if (!account || !account.username) {
      return res.status(404).send("Associated Instagram account not found");
    }

    // 4. Construct deep link redirection: ig.me
    // Format of ref: <referrerContactId>_<automationId>
    const igMeUrl = `https://ig.me/m/${account.username}?ref=${referrerContactId}_${link.automation_id}`;
    
    console.log(`[Referral Redirect] Code: ${code}, Referrer: ${referrerContactId}, Redirecting to: ${igMeUrl}`);
    return res.redirect(igMeUrl);
  } catch (error: any) {
    return res.status(500).send("Internal server error: " + error.message);
  }
});

export default router;
