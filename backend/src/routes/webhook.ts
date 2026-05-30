import { Router, Response } from "express";
import { env } from "../config/env";
import { verifyWebhookSignature, RequestWithRawBody } from "../middleware/signature";
import { supabase } from "../config/db";
import { addWebhookToQueue } from "../services/queue";

const router = Router();

/**
 * GET /webhook/instagram
 * Meta webhook verification challenge.
 */
router.get("/instagram", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log("[Webhook] Verification successful.");
    return res.status(200).send(challenge);
  } else {
    console.error("[Webhook] Verification failed. Tokens do not match.");
    return res.status(403).json({ error: "Verification failed. Tokens do not match." });
  }
});

/**
 * POST /webhook/instagram
 * Receives incoming webhook events from Meta, verifies signature,
 * parses messages/comments/stories, and routes them to trigger service.
 */
router.post("/instagram", verifyWebhookSignature, async (req: RequestWithRawBody, res: Response) => {
  const body = req.body;

  // Verify object type is instagram (or page for legacy/some page messaging settings)
  if (body.object !== "instagram" && body.object !== "page") {
    console.warn(`[Webhook] Warning: Received event with object type: ${body.object}`);
  }

  const entries = body.entry || [];
  
  for (const entry of entries) {
    const entryId = entry.id; // Usually the Page ID or IG Business Account ID
    console.log(`[Webhook] Processing entry ID: ${entryId} for object: ${body.object}`);

    // 1. Process Direct Messages (messaging events)
    if (entry.messaging) {
      for (const messagingEvent of entry.messaging) {
        const senderId = messagingEvent.sender?.id;
        const recipientId = messagingEvent.recipient?.id;

        // Try to match the business account in our DB
        // Check if either recipientId (incoming message target) or entryId matches our instagram_page_id
        let dbAccount = null;
        try {
          const { data } = await supabase
            .from("instagram_accounts")
            .select("id, username, user_id")
            .or(`instagram_page_id.eq.${recipientId},instagram_page_id.eq.${entryId}`)
            .eq("is_active", true)
            .maybeSingle();
          dbAccount = data;
        } catch (dbErr) {
          console.error("[Webhook] DB query failed when resolving account:", dbErr);
        }

        const accountLogStr = dbAccount 
          ? `DB Account: ${dbAccount.username} (${dbAccount.id})` 
          : `Unlinked Account (Recipient: ${recipientId}, Entry: ${entryId})`;

        console.log(`[Webhook] [DM] Received messaging event from ${senderId} to ${recipientId}. ${accountLogStr}`);

        // Handle messaging events, postbacks, or referrals
        if (messagingEvent.message || messagingEvent.postback || messagingEvent.referral) {
          const referralRef = messagingEvent.referral?.ref || messagingEvent.postback?.referral?.ref;
          
          let text = messagingEvent.message?.text;
          let buttonPayload = messagingEvent.postback?.payload || messagingEvent.message?.quick_reply?.payload;
          
          let eventType: any = "direct_message";
          
          if (messagingEvent.message) {
            const message = messagingEvent.message;
            if (message.is_echo) {
              console.log(`[Webhook] [DM] [Echo] Outbound message echo detected (mid: ${message.mid}). Ignoring to prevent loops.`);
              continue;
            }
            const attachments = message.attachments || [];
            const replyTo = message.reply_to;
            if (replyTo?.story) {
              eventType = "story_reply";
            } else if (attachments.some((a: any) => a.type === "story_mention")) {
              eventType = "story_mention";
            } else if (attachments.some((a: any) => a.type === "story_reaction")) {
              eventType = "story_reaction";
            }
          }

          if (dbAccount) {
            addWebhookToQueue({
              accountId: dbAccount.id,
              instagramPageId: recipientId || entryId || "",
              senderId,
              eventType,
              text,
              buttonPayload,
              referralRef,
            }, "standard").catch((err) => {
              console.error("[Webhook] Error adding standard webhook event to queue:", err);
            });
          }
        }
      }
    }

    // 2. Process Feed Changes (e.g. comments, mentions on posts)
    if (entry.changes) {
      for (const change of entry.changes) {
        const field = change.field;
        const value = change.value;

        console.log(`[Webhook] [Change] Field: ${field}`);

        if (field === "comments" && value) {
          const commentId = value.id;
          const parentId = value.parent_id;
          const text = value.text;
          const mediaId = value.media?.id;
          const fromUser = value.from; // { id, username }

          // Only respond to parent comments, to avoid reply threads nesting infinitely
          if (parentId) {
            console.log(`[Webhook] [CommentReply] Ignoring child comment reply (ID: ${commentId}, Parent ID: ${parentId})`);
            continue;
          }

          let dbAccount = null;
          try {
            const { data } = await supabase
              .from("instagram_accounts")
              .select("id, username, instagram_page_id")
              .eq("instagram_page_id", entryId)
              .eq("is_active", true)
              .maybeSingle();
            dbAccount = data;
          } catch (dbErr) {
            console.error("[Webhook] DB query failed when resolving account for comment:", dbErr);
          }

          if (dbAccount) {
            // Avoid loops: check if comment author is the page itself
            if (fromUser && fromUser.id !== dbAccount.instagram_page_id) {
              console.log(`[Webhook] [Comment] Forwarding feed comment from ${fromUser.username} to queue.`);
              addWebhookToQueue({
                accountId: dbAccount.id,
                instagramPageId: entryId,
                senderId: fromUser.id,
                eventType: "post_comment",
                text,
                commentId,
                postId: mediaId,
              }, "standard").catch((err) => {
                console.error("[Webhook] Error adding comment webhook event to queue:", err);
              });
            } else {
              console.log("[Webhook] [Comment] Ignoring comment authored by self/unknown user.");
            }
          }
        } else if (field === "leadgen" && value) {
          const pageId = entryId;
          const leadgenId = value.leadgen_id;
          const formId = value.form_id;
          const fieldData = value.field_data;

          let dbAccount = null;
          try {
            const { data } = await supabase
              .from("instagram_accounts")
              .select("id, username")
              .eq("instagram_page_id", pageId)
              .eq("is_active", true)
              .maybeSingle();
            dbAccount = data;
          } catch (dbErr) {
            console.error("[Webhook] DB query failed when resolving account for leadgen:", dbErr);
          }

          if (dbAccount) {
            console.log(`[Webhook] [Leadgen] Received lead gen event for Page ${pageId} (${dbAccount.username}). Form ID: ${formId}, Lead ID: ${leadgenId}`);
            addWebhookToQueue({
              accountId: dbAccount.id,
              pageId,
              leadgenId,
              formId,
              fieldData,
            }, "leadgen").catch((err) => {
              console.error("[Webhook] Error adding leadgen webhook event to queue:", err);
            });
          } else {
            console.warn(`[Webhook] [Leadgen] Received lead gen event for unlinked Page ID: ${pageId}`);
          }
        }
      }
    }
  }

  // Always return 200 OK to Meta to acknowledge receipt of webhook payload
  return res.status(200).json({ success: true });
});

export default router;

