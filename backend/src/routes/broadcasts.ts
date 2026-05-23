import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../config/db";
import { sendInstagramMessage } from "../utils/meta";

const router = Router();

router.use(authMiddleware);

// Helper to delay execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Background worker to execute the broadcast rate-limiting send loop.
 * Throttles sending to 1 message per second.
 */
async function processBroadcast(broadcastId: string, userId: string) {
  console.log(`[Broadcast Worker] Starting broadcast ID: ${broadcastId}`);

  try {
    // 1. Fetch broadcast configuration
    const { data: broadcast, error: fetchErr } = await supabase
      .from("broadcasts")
      .select("*")
      .eq("id", broadcastId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr || !broadcast) {
      console.error(`[Broadcast Worker] Broadcast ${broadcastId} not found.`);
      return;
    }

    // Update status to 'sending'
    await supabase
      .from("broadcasts")
      .update({ status: "sending" })
      .eq("id", broadcastId);

    // 2. Fetch contact count to get total_count
    const { count: totalCount, error: countErr } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("account_id", broadcast.account_id)
      .eq("user_id", userId);

    if (countErr) {
      console.error(`[Broadcast Worker] Contacts count fetch failed:`, countErr);
      await supabase
        .from("broadcasts")
        .update({ status: "failed" })
        .eq("id", broadcastId);
      return;
    }

    const total = totalCount || 0;
    await supabase
      .from("broadcasts")
      .update({ total_count: total })
      .eq("id", broadcastId);

    if (total === 0) {
      console.log(`[Broadcast Worker] No contacts found for broadcast ${broadcastId}`);
      await supabase
        .from("broadcasts")
        .update({ status: "completed" })
        .eq("id", broadcastId);
      return;
    }

    // 3. Fetch Instagram page token
    const { data: account, error: accErr } = await supabase
      .from("instagram_accounts")
      .select("access_token")
      .eq("id", broadcast.account_id)
      .maybeSingle();

    if (accErr || !account) {
      console.error(`[Broadcast Worker] Instagram account access token not found.`);
      await supabase
        .from("broadcasts")
        .update({ status: "failed" })
        .eq("id", broadcastId);
      return;
    }

    let sent = 0;
    let failed = 0;
    let page = 0;
    const pageSize = 50;
    let hasMore = true;

    // 4. Send messages sequentially in paginated chunks
    while (hasMore) {
      const { data: contacts, error: contactsErr } = await supabase
        .from("contacts")
        .select("*")
        .eq("account_id", broadcast.account_id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (contactsErr || !contacts || contacts.length === 0) {
        hasMore = false;
        break;
      }

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];

        // Double-check status in database to allow cancellation (if status becomes stopped/failed)
        const { data: currentBroadcast } = await supabase
          .from("broadcasts")
          .select("status")
          .eq("id", broadcastId)
          .maybeSingle();

        if (currentBroadcast && currentBroadcast.status !== "sending") {
          console.log(`[Broadcast Worker] Broadcast ${broadcastId} stopped/cancelled externally.`);
          return;
        }

        const currentIndex = page * pageSize + i + 1;
        console.log(`[Broadcast Worker] Sending broadcast ${currentIndex}/${total} to contact ${contact.id}`);

        // Call Meta Graph API client
        const sendRes = await sendInstagramMessage(account.access_token, {
          recipientId: contact.instagram_user_id,
          text: broadcast.message_text,
        });

        if (sendRes.success) {
          sent++;
          // Log outbound message
          try {
            await supabase.from("messages").insert({
              contact_id: contact.id,
              direction: "outbound",
              content: broadcast.message_text,
              message_type: "text",
              instagram_message_id: sendRes.messageId,
            });
          } catch (logErr) {
            console.error("[Broadcast Worker] Message log entry insertion failed:", logErr);
          }
        } else {
          failed++;
        }

        // Update progress in database
        await supabase
          .from("broadcasts")
          .update({
            sent_count: sent,
            failed_count: failed,
          })
          .eq("id", broadcastId);

        // Throttling: 1 second sleep between sends (except for the last contact)
        if (currentIndex < total) {
          await sleep(1000);
        }
      }

      page++;
    }

    // Set final status to completed
    await supabase
      .from("broadcasts")
      .update({ status: "completed" })
      .eq("id", broadcastId);

    console.log(`[Broadcast Worker] Completed broadcast ${broadcastId}. Sent: ${sent}, Failed: ${failed}`);
  } catch (error) {
    console.error(`[Broadcast Worker] Fatal error running broadcast ${broadcastId}:`, error);
    await supabase
      .from("broadcasts")
      .update({ status: "failed" })
      .eq("id", broadcastId);
  }
}

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

    // Start background processor
    processBroadcast(id, userId!);

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
