import { supabase } from "../config/db";
import { env } from "../config/env";
import { decrypt } from "../utils/crypto";
import { sendInstagramMessage } from "../utils/meta";
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

    // Try fetching profile details from Meta Graph API
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

export interface LeadgenEventPayload {
  accountId: string;          // Database ID of instagram_accounts
  pageId: string;             // Meta Page ID
  leadgenId: string;          // Meta Leadgen ID
  formId: string;             // Meta Form ID
  fieldData?: Array<{ name: string; values: string[] }>;
}

export async function handleIncomingLeadgenEvent(payload: LeadgenEventPayload): Promise<void> {
  const { accountId, pageId, leadgenId, formId, fieldData } = payload;
  console.log(`[Trigger] Handling incoming Leadgen event for account ${accountId}, leadgenId ${leadgenId}, formId ${formId}`);

  // 1. Resolve Instagram Account to verify active state and read settings
  const { data: account, error: accountErr } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (accountErr || !account) {
    console.error(`[Trigger] Instagram account not found in database for ID ${accountId}:`, accountErr);
    return;
  }

  // 1.5. Resolve settings from global settings row to support shared DB configurations
  const { data: globalSettingsRow } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("instagram_page_id", "global_settings_" + account.user_id)
    .maybeSingle();

  const userSettings = (globalSettingsRow?.fb_field_mappings || {}) as Record<string, any>;
  
  // Find connected telegram bot channel to retrieve its specific settings
  let botSettings: any = {};
  let telegramBotToken = "";
  if (userSettings.replai_channels) {
    try {
      const channels = typeof userSettings.replai_channels === "string"
        ? JSON.parse(userSettings.replai_channels)
        : userSettings.replai_channels;
      
      if (Array.isArray(channels)) {
        const tgChannel = channels.find((c: any) => c.type === "telegram" && c.isConnected && c.telegramToken);
        if (tgChannel) {
          telegramBotToken = tgChannel.telegramToken;
          const botSettingsKey = `replai_bot_settings_${tgChannel.id}`;
          const botSettingsRaw = userSettings[botSettingsKey];
          botSettings = typeof botSettingsRaw === "string"
            ? JSON.parse(botSettingsRaw)
            : (botSettingsRaw || {});
        }
      }
    } catch (err) {
      console.error("[Trigger] Error parsing replai_channels or bot settings:", err);
    }
  }

  // Use botSettings as primary, fallback to account columns
  const fbAgentEnabled = typeof botSettings.fbAgentEnabled !== "undefined" ? botSettings.fbAgentEnabled : account.fb_agent_enabled;
  const fbAgentMode = botSettings.fbAgentMode || "ai"; // default to ai mode if not set

  // Check if Facebook agent is enabled
  if (!fbAgentEnabled) {
    console.log(`[Trigger] Facebook lead handler is disabled for account ${accountId}. Skipping.`);
    return;
  }

  // 2. Fetch Lead Field Data if not present
  let resolvedFieldData = fieldData;
  if (!resolvedFieldData) {
    try {
      let token = account.access_token;
      if (token.includes(":")) {
        token = decrypt(token);
      }
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${encodeURIComponent(token)}`
      );
      if (response.ok) {
        const data = await response.json();
        resolvedFieldData = data.field_data;
      } else {
        console.warn(`[Trigger] Could not fetch lead details from Graph API, HTTP ${response.status}`);
      }
    } catch (err) {
      console.error(`[Trigger] Error fetching lead details from Meta:`, err);
    }
  }

  if (!resolvedFieldData) {
    console.error(`[Trigger] Missing field data for leadgenId ${leadgenId}`);
    return;
  }

  // 3. Match Field Mappings
  const mappings = typeof botSettings.fbFieldMappings === "string"
    ? JSON.parse(botSettings.fbFieldMappings)
    : (botSettings.fbFieldMappings || (typeof account.fb_field_mappings === "string" 
        ? JSON.parse(account.fb_field_mappings) 
        : (account.fb_field_mappings || [])));

  let leadName = "Noma'lum Mijoz";
  let leadPhone = "Noma'lum Telefon";
  let leadMessage = "";
  let leadEmail = "";
  let leadCompany = "";

  mappings.forEach((m: any) => {
    const match = resolvedFieldData?.find((fd: any) => fd.name === m.metaField);
    if (match && match.values && match.values[0]) {
      const val = match.values[0];
      if (m.sendlyField === "name") leadName = val;
      else if (m.sendlyField === "phone") leadPhone = val;
      else if (m.sendlyField === "message") leadMessage = val;
      else if (m.sendlyField === "email") leadEmail = val;
      else if (m.sendlyField === "company") leadCompany = val;
    }
  });

  // Fallback to searching basic field names if mappings didn't find anything
  if (leadName === "Noma'lum Mijoz") {
    const nameMatch = resolvedFieldData.find((fd: any) => 
      ["full_name", "name", "first_name", "last_name", "ism", "familiya"].includes(fd.name.toLowerCase())
    );
    if (nameMatch && nameMatch.values && nameMatch.values[0]) {
      leadName = nameMatch.values[0];
    }
  }
  if (leadPhone === "Noma'lum Telefon") {
    const phoneMatch = resolvedFieldData.find((fd: any) => 
      ["phone_number", "phone", "tel", "telefon", "raqam"].includes(fd.name.toLowerCase())
    );
    if (phoneMatch && phoneMatch.values && phoneMatch.values[0]) {
      leadPhone = phoneMatch.values[0];
    }
  }
  if (leadMessage === "") {
    const msgMatch = resolvedFieldData.find((fd: any) => 
      ["message", "question", "comment", "notes", "savol", "izoh", "murojaat"].includes(fd.name.toLowerCase())
    );
    if (msgMatch && msgMatch.values && msgMatch.values[0]) {
      leadMessage = msgMatch.values[0];
    }
  }

  // 4. Run AI Qualification / Categorization (Skip if direct forwarding mode is active)
  let detectedGroupId = botSettings.targetGroupId || account.target_group_id || "sales";
  let tags = Array.isArray(botSettings.fbTags) ? [...botSettings.fbTags] : (Array.isArray(account.fb_tags) ? [...account.fb_tags] : []);
  let summary = "Mijoz reklama formasi orqali murojaat qildi.";

  if (fbAgentMode === "direct") {
    tags.push("Yo'naltirilgan");
    summary = "Facebook forma orqali ariza (To'g'ridan-to'g'ri yo'naltirish).";
  } else {
    // If Gemini key is available, attempt to call Gemini model
    let runRuleFallback = true;
    if (env.GEMINI_API_KEY) {
      try {
        const systemPrompt = (botSettings.fbAgentPrompt || account.fb_agent_prompt || "Categorize this customer query to 'sales' or 'support' and provide tags.") +
          "\n\nYou MUST respond in a strict JSON format with the following keys:\n" +
          "{\n" +
          "  \"group\": \"sales\" | \"support\",\n" +
          "  \"tags\": string[],\n" +
          "  \"summary\": string\n" +
          "}";

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: `Mijoz ismi: ${leadName}\nTelefon raqami: ${leadPhone}\nSavol/Murojaat: ${leadMessage}` }]
                }
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (response.ok) {
          const json = await response.json();
          const contentText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const aiData = JSON.parse(contentText);
          if (aiData.group) {
            detectedGroupId = aiData.group.toLowerCase().includes("support") || aiData.group.toLowerCase().includes("qo'llab") ? "support" : "sales";
          }
          if (Array.isArray(aiData.tags)) {
            tags = [...tags, ...aiData.tags];
          }
          if (aiData.summary) {
            summary = aiData.summary;
          }
          runRuleFallback = false;
          console.log(`[Trigger] AI Qualification Success. Group: ${detectedGroupId}, Tags: ${tags.join(", ")}, Summary: ${summary}`);
        } else {
          console.error(`[Trigger] Gemini API error: ${response.status}`, await response.text());
        }
      } catch (geminiErr) {
        console.error("[Trigger] Gemini call failed, falling back to rule engine:", geminiErr);
      }
    }

    // Rule-based qualification fallback (Uzbek language keywords)
    if (runRuleFallback) {
      const msg = leadMessage.toLowerCase();
      if (
        msg.includes("narx") ||
        msg.includes("qancha") ||
        msg.includes("chegirma") ||
        msg.includes("to'lov") ||
        msg.includes("narxi") ||
        msg.includes("aksiy") ||
        msg.includes("sotib") ||
        msg.includes("dollar") ||
        msg.includes("so'm") ||
        msg.includes("aksiya") ||
        msg.includes("skidka") ||
        msg.includes("pul")
      ) {
        detectedGroupId = "sales";
        tags.push("Yuqori qiziqish", "Narxga qiziqqan");
        summary = "Mijoz to'lov shakli, narx yoki chegirmalar bo'yinta ma'lumot so'ragan.";
      } else if (
        msg.includes("kirish") ||
        msg.includes("kirmayapti") ||
        msg.includes("parol") ||
        msg.includes("kod") ||
        msg.includes("ochilmadi") ||
        msg.includes("texnik") ||
        msg.includes("yordam") ||
        msg.includes("xatolik") ||
        msg.includes("muammo") ||
        msg.includes("sayt") ||
        msg.includes("ishlamayapti")
      ) {
        detectedGroupId = "support";
        tags.push("Texnik muammo", "Qo'llab-quvvatlash");
        summary = "Mijoz tizimga kirish yoki texnik nosozlik yuzasidan yordam so'ragan.";
      } else {
        detectedGroupId = botSettings.targetGroupId || account.target_group_id || "sales";
        tags.push("Yangi Lead");
        summary = leadMessage ? `Mijoz savoli: "${leadMessage}"` : "Mijoz reklama formasi orqali murojaat qildi.";
      }
    }
  }

  // Remove duplicates from tags
  tags = Array.from(new Set(tags.filter(Boolean)));

  // 5. Create or Update Contact in CRM
  let contact: any = null;
  const username = `fb_${leadPhone.replace(/\s+/g, "").replace("+", "") || leadgenId}`;

  const { data: existingContact } = await supabase
    .from("contacts")
    .select("*")
    .eq("account_id", account.id)
    .eq("instagram_user_id", `fb_${leadgenId}`)
    .maybeSingle();

  const updates: any = {
    full_name: leadName,
    username: username,
    last_message: leadMessage || "Facebook Lead Form submitted",
    last_message_at: new Date().toISOString(),
    tags: tags,
    variables: {
      qualification_summary: summary,
      lead_phone: leadPhone,
      lead_message: leadMessage,
      lead_email: leadEmail,
      lead_company: leadCompany,
      form_id: formId,
      assigned_group: detectedGroupId
    }
  };

  if (existingContact) {
    const { data: updatedContact } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", existingContact.id)
      .select()
      .single();
    contact = updatedContact;
  } else {
    const { data: newContact, error: insertErr } = await supabase
      .from("contacts")
      .insert({
        user_id: account.user_id,
        account_id: account.id,
        instagram_user_id: `fb_${leadgenId}`,
        full_name: leadName,
        username: username,
        profile_picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        last_message: leadMessage || "Facebook Lead Form submitted",
        last_message_at: new Date().toISOString(),
        tags: tags,
        variables: updates.variables,
        dialog_window_open: true,
        dialog_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    if (insertErr) {
      console.error("[Trigger] Error creating contact for Facebook lead:", insertErr);
      return;
    }
    contact = newContact;
  }

  // 6. Log message in Messages table
  try {
    await supabase.from("messages").insert({
      contact_id: contact.id,
      direction: "inbound",
      content: leadMessage || `Facebook lead submitted (Form ID: ${formId})`,
      message_type: "text",
      instagram_message_id: null
    });
  } catch (logErr) {
    console.error("[Trigger] Lead inbound message logging failed:", logErr);
  }

  // 7. Send Auto Welcome Message if configured (Skip in direct forwarding mode)
  const welcomeMessageTemplate = botSettings.fbWelcomeMessage || account.fb_welcome_message;
  if (welcomeMessageTemplate && contact && fbAgentMode !== "direct") {
    let welcomeMsg = welcomeMessageTemplate;
    welcomeMsg = welcomeMsg.replace(/\{\{\s*name\s*\}\}/gi, leadName);

    console.log(`[Trigger] Dispatching Facebook Welcome Message: "${welcomeMsg}"`);

    let messageId = null;
    try {
      let token = account.access_token;
      if (token.includes(":")) {
        token = decrypt(token);
      }
      const sendRes = await sendInstagramMessage(token, {
        recipientId: contact.instagram_user_id,
        text: welcomeMsg
      });
      messageId = sendRes.messageId;
    } catch (sendErr) {
      console.error("[Trigger] Failed to send Facebook welcome message:", sendErr);
    }

    // Log outbound message
    try {
      await supabase.from("messages").insert({
        contact_id: contact.id,
        direction: "outbound",
        content: welcomeMsg,
        message_type: "text",
        instagram_message_id: messageId
      });
    } catch (logErr) {
      console.error("[Trigger] Lead welcome message outbound logging failed:", logErr);
    }
  }

  // 8. If direct forwarding mode and Telegram connection info is available, notify the admin chat ID
  if (fbAgentMode === "direct" && telegramBotToken && botSettings.adminTelegramChatId) {
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const htmlMessage = `<b>🔔 Yangi Lid (AIsiz To'g'ridan-to'g'ri Yo'naltirish)</b>\n\n` +
        `<b>Ism:</b> ${leadName}\n` +
        `<b>Tel:</b> ${leadPhone}\n` +
        (leadEmail ? `<b>E-mail:</b> ${leadEmail}\n` : "") +
        (leadCompany ? `<b>Kompaniya:</b> ${leadCompany}\n` : "") +
        (leadMessage ? `<b>Murojaat:</b> ${leadMessage}\n` : "");

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: botSettings.adminTelegramChatId,
          text: htmlMessage,
          parse_mode: "HTML",
        }),
      });

      if (res.ok) {
        console.log(`[Trigger] Direct Lead Telegram notification sent to chat ID ${botSettings.adminTelegramChatId}`);
      } else {
        const errText = await res.text();
        console.error(`[Trigger] Failed to send Telegram notification: ${errText}`);
      }
    } catch (err) {
      console.error("[Trigger] Error sending direct lead Telegram notification:", err);
    }
  }
}

