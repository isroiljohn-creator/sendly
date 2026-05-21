import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";
import { sendInstagramMessage } from "../utils/meta";

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/messages/send
 * Sends a manual DM to a contact.
 */
router.post("/send", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { contact_id, text } = req.body;

  if (!contact_id || !text) {
    return res.status(400).json({ error: "Provide contact_id and text fields" });
  }

  try {
    // 1. Fetch contact and verify ownership
    const { data: contact, error: contactErr } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contact_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (contactErr || !contact) {
      return res.status(404).json({ error: "Contact not found or access denied" });
    }

    // 2. Fetch instagram account to get pageAccessToken
    const { data: account, error: accountErr } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("id", contact.account_id)
      .maybeSingle();

    if (accountErr || !account) {
      return res.status(404).json({ error: "Associated Instagram account not found" });
    }

    // 3. Send message via Meta Graph API Client
    const sendRes = await sendInstagramMessage(account.access_token, {
      recipientId: contact.instagram_user_id,
      text: text,
    });

    if (!sendRes.success) {
      return res.status(502).json({ error: "Failed to deliver message via Instagram Meta API" });
    }

    // 4. Log the outbound message in DB
    const { data: loggedMessage, error: logErr } = await supabase
      .from("messages")
      .insert({
        contact_id: contact.id,
        direction: "outbound",
        content: text,
        message_type: "text",
        instagram_message_id: sendRes.messageId,
      })
      .select()
      .single();

    if (logErr) {
      console.error("[Messages API] Logging failed:", logErr);
    }

    return res.json({
      success: true,
      message_id: sendRes.messageId,
      message: loggedMessage,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
