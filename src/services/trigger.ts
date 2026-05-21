import { supabase } from "../config/db";
import { env } from "../config/env";
import { decrypt } from "../utils/crypto";
import { executeSessionStep } from "./interpreter";
import { cancelSessionDelay } from "./queue";

export interface WebhookEventPayload {
  accountId: string;          // Database ID of instagram_accounts
  instagramPageId: string;    // Meta Page/IG ID
  senderId: string;           // Customer's Instagram user ID
  eventType: "direct_message" | "post_comment" | "live_comment" | "story_reaction" | "story_reply" | "story_mention";
  text?: string;
  buttonPayload?: string;     // payload from postback or quick reply
  commentId?: string;         // for comment trigger private reply
  postId?: string;            // for post comment verification (media/post ID)
  referralRef?: string;       // referral ref parameter
}

/**
 * Main handler for matching and routing incoming webhook events.
 */
export async function handleIncomingWebhookEvent(payload: WebhookEventPayload): Promise<void> {
  const { accountId, instagramPageId, senderId, eventType, text, buttonPayload, commentId, postId, referralRef } = payload;

  console.log(`[Trigger] Handling incoming event: ${eventType} from sender ${senderId} on page ${instagramPageId}. ReferralRef: ${referralRef}`);

  // 1. Resolve Instagram Account and verify user_id
  const { data: account, error: accountErr } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (accountErr || !account) {
    console.error(`[Trigger] Instagram account not found in database for ID ${accountId}:`, accountErr);
    return;
  }

  const userId = account.user_id;

  // 2. Find or Create Contact
  let contact: any = null;
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("*")
    .eq("account_id", account.id)
    .eq("instagram_user_id", senderId)
    .maybeSingle();

  const isDM = ["direct_message", "story_reply", "story_reaction", "story_mention"].includes(eventType);
  const dialogExpiresAt = isDM ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

  if (existingContact) {
    contact = existingContact;
    
    // Update contact fields: last message time, messaging window details
    const updates: any = {
      last_message: text || buttonPayload || "",
      last_message_at: new Date().toISOString(),
    };
    if (isDM) {
      updates.dialog_window_open = true;
      updates.dialog_expires_at = dialogExpiresAt;
    }

    const { data: updatedContact } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", contact.id)
      .select()
      .single();

    if (updatedContact) {
      contact = updatedContact;
    }
  } else {
    // Create new contact record
    let fullName = "User";
    let username = "user_" + senderId;
    let profilePicture = "";

    // If NOT mock mode, try fetching profile details from Meta Graph API
    if (env.META_APP_ID !== "123456789") {
      try {
        let token = account.access_token;
        if (token.includes(":")) {
          token = decrypt(token);
        }
        // Instagram Profile API
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${senderId}?fields=name,username,profile_pic&access_token=${encodeURIComponent(token)}`
        );
        if (response.ok) {
          const data = await response.json();
          fullName = data.name || "User";
          username = data.username || "user_" + senderId;
          profilePicture = data.profile_pic || "";
        } else {
          console.warn(`[Trigger] Could not fetch profile details, HTTP ${response.status}`);
        }
      } catch (err) {
        console.error(`[Trigger] Error fetching contact profile details from Meta:`, err);
      }
    }

    const { data: newContact, error: insertErr } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        account_id: account.id,
        instagram_user_id: senderId,
        username,
        full_name: fullName,
        profile_picture: profilePicture,
        last_message: text || buttonPayload || "",
        last_message_at: new Date().toISOString(),
        tags: [],
        variables: {},
        dialog_window_open: isDM,
        dialog_expires_at: dialogExpiresAt,
      })
      .select()
      .single();

    if (insertErr || !newContact) {
      console.error("[Trigger] Failed to create contact:", insertErr);
      return;
    }
    contact = newContact;
  }

  // 3. Log inbound message in the messages table
  if (text || buttonPayload) {
    try {
      await supabase.from("messages").insert({
        contact_id: contact.id,
        direction: "inbound",
        content: text || buttonPayload || "",
        message_type: buttonPayload ? "quick_reply" : "text",
        instagram_message_id: null,
      });
    } catch (logErr) {
      console.error("[Trigger] Inbound message logging failed:", logErr);
    }
  }

  // 4. Resume active session if buttonPayload is provided (indicating a button click)
  if (buttonPayload) {
    const { data: activeSessions } = await supabase
      .from("automation_sessions")
      .select("*")
      .eq("contact_id", contact.id)
      .in("status", ["running", "waiting_delay"])
      .order("created_at", { ascending: false });

    if (activeSessions && activeSessions.length > 0) {
      // Find session where the current block actually contains a button matching buttonPayload
      // But for simplicity/robustness, we can pass it directly to the interpreter which verifies block buttons
      const sessionToResume = activeSessions[0];
      console.log(`[Trigger] Resuming active session ${sessionToResume.id} with payload: ${buttonPayload}`);
      await executeSessionStep(sessionToResume.id, { buttonPayload }, commentId);
      return;
    }
  }

  // 4a. Check if active session is waiting for user input and process it if a text message is received
  if (text && !buttonPayload) {
    const { data: activeSessions } = await supabase
      .from("automation_sessions")
      .select("*")
      .eq("contact_id", contact.id)
      .eq("status", "running")
      .order("created_at", { ascending: false });

    if (activeSessions && activeSessions.length > 0) {
      const activeSession = activeSessions[0];
      // Fetch automation to read blocks
      const { data: automation } = await supabase
        .from("automations")
        .select("*")
        .eq("id", activeSession.automation_id)
        .maybeSingle();

      if (automation) {
        const blocks = automation.flow_data?.blocks || [];
        const currentBlock = blocks.find((b: any) => b.id === activeSession.current_block_id);
        if (currentBlock && currentBlock.type === "user_input") {
          const variableName = currentBlock.data?.variable_name;
          console.log(`[Trigger] Found active session ${activeSession.id} paused at user_input block: ${currentBlock.id}. Saving input to variable: ${variableName}`);
          
          const currentVars = contact.variables || {};
          const updatedVars = { ...currentVars, [variableName]: text };
          contact.variables = updatedVars; // Update local copy
          
          await supabase.from("contacts").update({ variables: updatedVars }).eq("id", contact.id);

          await executeSessionStep(activeSession.id, { text }, commentId);
          return; // Stop further matching
        }
      }
    }
  }

  // 4b. Handle Referral parameter if referralRef is provided
  if (referralRef) {
    const parts = referralRef.split("_");
    if (parts.length === 2) {
      const [referrerContactId, automationId] = parts;
      
      if (referrerContactId !== contact.id) {
        // Check if this referral is already recorded
        const { data: existingReferral } = await supabase
          .from("referrals")
          .select("id")
          .eq("referrer_contact_id", referrerContactId)
          .eq("referred_contact_id", contact.id)
          .eq("automation_id", automationId)
          .maybeSingle();

        if (!existingReferral) {
          await supabase.from("referrals").insert({
            referrer_contact_id: referrerContactId,
            referred_contact_id: contact.id,
            automation_id: automationId,
          });

          console.log(`[Trigger] Referral recorded: referrer ${referrerContactId} referred contact ${contact.id}`);

          // Award gamification points to referrer (+50 points)
          const { data: scoreRecord } = await supabase
            .from("gamification_scores")
            .select("points")
            .eq("contact_id", referrerContactId)
            .eq("account_id", account.id)
            .maybeSingle();

          const currentPoints = scoreRecord?.points || 0;
          const newPoints = currentPoints + 50;

          await supabase.from("gamification_scores").upsert({
            contact_id: referrerContactId,
            account_id: account.id,
            points: newPoints,
            updated_at: new Date().toISOString()
          }, { onConflict: "contact_id,account_id" });

          console.log(`[Trigger] Awarded +50 points to referrer ${referrerContactId}. New points: ${newPoints}`);
        }
      }

      // Automatically launch the target automation for the referred contact!
      const { data: referralAutomation } = await supabase
        .from("automations")
        .select("*")
        .eq("id", automationId)
        .eq("is_active", true)
        .maybeSingle();

      if (referralAutomation) {
        console.log(`[Trigger] Referral launch: Triggering automation "${referralAutomation.name}" for contact ${contact.id}`);
        if (!referralAutomation.work_without_interruption) {
          const { data: sessionsToStop } = await supabase
            .from("automation_sessions")
            .select("id")
            .eq("contact_id", contact.id)
            .in("status", ["running", "waiting_delay"]);

          if (sessionsToStop && sessionsToStop.length > 0) {
            for (const s of sessionsToStop) {
              await cancelSessionDelay(s.id);
            }
          }

          await supabase
            .from("automation_sessions")
            .update({ status: "stopped" })
            .eq("contact_id", contact.id)
            .in("status", ["running", "waiting_delay"]);
        }

        await supabase.from("automation_runs").insert({
          contact_id: contact.id,
          automation_id: referralAutomation.id,
        });

        await supabase
          .from("automations")
          .update({ launch_count: (referralAutomation.launch_count || 0) + 1 })
          .eq("id", referralAutomation.id);

        const { data: newSession } = await supabase
          .from("automation_sessions")
          .insert({
            contact_id: contact.id,
            automation_id: referralAutomation.id,
            current_block_id: null,
            status: "running",
          })
          .select()
          .single();

        if (newSession) {
          executeSessionStep(newSession.id, undefined, commentId).catch((err) => {
            console.error(`[Trigger] Session execution failed for referral:`, err);
          });
          return;
        }
      }
    }
  }

  // 5. Fetch all active automations for the account, with their triggers
  const { data: automations, error: automationsErr } = await supabase
    .from("automations")
    .select(`
      *,
      automation_triggers (*)
    `)
    .eq("account_id", account.id)
    .eq("is_active", true);

  if (automationsErr || !automations) {
    console.error("[Trigger] Failed to retrieve automations for account:", automationsErr);
    return;
  }

  console.log(`[Trigger] Found ${automations.length} active automations to match.`);

  // 6. Find first matching automation trigger
  let matchedAutomation: any = null;
  const inputMessage = (text || "").trim().toLowerCase();

  for (const automation of automations) {
    const triggers = automation.automation_triggers || [];
    for (const trigger of triggers) {
      let isTypeMatch = trigger.trigger_type === eventType;
      
      // Direct message keyword triggers can also match story replies, reactions, and mentions
      if (!isTypeMatch && trigger.trigger_type === "direct_message") {
        isTypeMatch = ["direct_message", "story_reply", "story_reaction", "story_mention"].includes(eventType);
      }

      if (!isTypeMatch) continue;

      // For post comments, if trigger specifies post_id, ensure it matches
      if (eventType === "post_comment" && trigger.post_id && postId) {
        if (trigger.post_id !== postId) continue;
      }

      // Keyword sensitivity evaluation
      if (trigger.sensitivity === "any_message") {
        if (inputMessage.length > 0) {
          matchedAutomation = automation;
          break;
        }
      } else {
        const keywords = (trigger.keywords || []).map((k: string) => k.trim().toLowerCase());
        if (keywords.length === 0) continue;

        if (trigger.sensitivity === "exact_match") {
          if (keywords.includes(inputMessage)) {
            matchedAutomation = automation;
            break;
          }
        } else if (trigger.sensitivity === "contains") {
          if (keywords.some((kw: string) => inputMessage.includes(kw))) {
            matchedAutomation = automation;
            break;
          }
        }
      }
    }
    if (matchedAutomation) break;
  }

  if (!matchedAutomation) {
    console.log("[Trigger] No matching active automation found for this event.");
    return;
  }

  console.log(`[Trigger] Event matched automation "${matchedAutomation.name}" (ID: ${matchedAutomation.id})`);

  // 7. Verify Frequency Limits (Restart Window Restriction)
  if (matchedAutomation.no_restart_seconds && matchedAutomation.no_restart_seconds > 0) {
    const cutoffTime = new Date(Date.now() - matchedAutomation.no_restart_seconds * 1000).toISOString();
    const { data: recentRuns } = await supabase
      .from("automation_runs")
      .select("id")
      .eq("contact_id", contact.id)
      .eq("automation_id", matchedAutomation.id)
      .gt("triggered_at", cutoffTime);

    if (recentRuns && recentRuns.length > 0) {
      console.log(`[Trigger] Skipping automation run: triggered within the last ${matchedAutomation.no_restart_seconds} seconds.`);
      return;
    }
  }

  // 8. Session Conflict Resolution (Interruption Settings)
  // If work_without_interruption is false, stop any existing active/waiting sessions for this contact
  if (!matchedAutomation.work_without_interruption) {
    console.log(`[Trigger] Interrupting active sessions for contact ${contact.id} before launching new automation.`);
    
    // Fetch active sessions to cancel any pending delay jobs/timers
    const { data: sessionsToStop } = await supabase
      .from("automation_sessions")
      .select("id")
      .eq("contact_id", contact.id)
      .in("status", ["running", "waiting_delay"]);

    if (sessionsToStop && sessionsToStop.length > 0) {
      for (const session of sessionsToStop) {
        await cancelSessionDelay(session.id);
      }
    }

    await supabase
      .from("automation_sessions")
      .update({ status: "stopped" })
      .eq("contact_id", contact.id)
      .in("status", ["running", "waiting_delay"]);
  }

  // 9. Record Automation Run
  try {
    await supabase.from("automation_runs").insert({
      contact_id: contact.id,
      automation_id: matchedAutomation.id,
    });
  } catch (err) {
    console.error("[Trigger] Failed to register automation run:", err);
  }

  // 10. Update Automation Launch Count
  try {
    await supabase
      .from("automations")
      .update({ launch_count: (matchedAutomation.launch_count || 0) + 1 })
      .eq("id", matchedAutomation.id);
  } catch (err) {
    console.error("[Trigger] Failed to update launch count:", err);
  }

  // 11. Create and Start New Automation Session
  const { data: newSession, error: sessionErr } = await supabase
    .from("automation_sessions")
    .insert({
      contact_id: contact.id,
      automation_id: matchedAutomation.id,
      current_block_id: null,
      status: "running",
    })
    .select()
    .single();

  if (sessionErr || !newSession) {
    console.error("[Trigger] Failed to create new automation session:", sessionErr);
    return;
  }

  console.log(`[Trigger] Started automation session ${newSession.id}. Launching interpreter...`);
  // Fire interpreter execution asynchronously
  executeSessionStep(newSession.id, undefined, commentId).catch((err) => {
    console.error(`[Trigger] Session execution failed for ${newSession.id}:`, err);
  });
}
