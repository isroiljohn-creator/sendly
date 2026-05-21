import { supabase } from "../config/db";
import { sendInstagramMessage } from "../utils/meta";
import { scheduleSessionDelay, cancelSessionDelay } from "./queue";

/**
 * Helper to interpolate variables inside text template.
 * Matches standard variables: {{first_name}}, {{last_name}}, {{username}}, {{full_name}}
 * Matches custom variables: {{variables.var_name}} or {{var_name}}
 */
export function interpolateVariables(text: string, contact: any): string {
  if (!text) return "";
  
  let result = text;
  
  // Standard mappings
  const mappings: Record<string, string> = {
    first_name: contact.full_name?.split(" ")[0] || contact.username || "User",
    last_name: contact.full_name?.split(" ").slice(1).join(" ") || "",
    full_name: contact.full_name || contact.username || "User",
    username: contact.username || "",
  };

  // Interpolate standard mappings
  for (const [key, val] of Object.entries(mappings)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    result = result.replace(regex, val);
  }

  // Interpolate custom variables: e.g. {{variables.var_name}} or {{var_name}}
  const customVarRegex = /\{\{\s*(?:variables\.)?([a-zA-Z0-9_-]+)\s*\}\}/g;
  result = result.replace(customVarRegex, (match, varName) => {
    if (contact.variables && contact.variables[varName] !== undefined) {
      return String(contact.variables[varName]);
    }
    return ""; // Return empty string if variable is not defined
  });

  return result;
}

/**
 * Steps through and executes visual builder blocks for a session.
 * Continues loop until block execution hits a pause condition (waiting for input/delay) or finishes.
 */
export async function executeSessionStep(
  sessionId: string,
  inputPayload?: { text?: string; buttonPayload?: string },
  commentId?: string // Passed if session is triggered by a comment and it's the first step
): Promise<void> {
  console.log(`[Interpreter] Stepping session: ${sessionId}`);

  // 1. Fetch active session with nested automation, contact, and account
  const { data: session, error: sessionErr } = await supabase
    .from("automation_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !session) {
    console.error(`[Interpreter] Session ${sessionId} not found:`, sessionErr);
    return;
  }

  if (session.status === "completed" || session.status === "stopped") {
    console.log(`[Interpreter] Session ${sessionId} is already terminal (${session.status}).`);
    return;
  }

  const { data: automation } = await supabase
    .from("automations")
    .select("*")
    .eq("id", session.automation_id)
    .maybeSingle();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", session.contact_id)
    .maybeSingle();

  if (!automation || !contact) {
    console.error(`[Interpreter] Automation or Contact missing for session ${sessionId}`);
    return;
  }

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("id", automation.account_id)
    .maybeSingle();

  if (!account) {
    console.error(`[Interpreter] Instagram account not found for automation ${automation.id}`);
    return;
  }

  const flowData = automation.flow_data || {};
  const blocks = flowData.blocks || [];
  
  let currentBlockId = session.current_block_id || flowData.start_block_id;
  
  if (!currentBlockId && blocks.length > 0) {
    currentBlockId = blocks[0].id;
  }

  let executionCount = 0;
  const maxIterations = 50; // Infinite loop safety limit

  let hasInputBeenProcessed = false;

  while (currentBlockId && executionCount < maxIterations) {
    executionCount++;
    console.log(`[Interpreter] Processing block ID: ${currentBlockId} (Iteration: ${executionCount})`);

    const block = blocks.find((b: any) => b.id === currentBlockId);
    if (!block) {
      console.warn(`[Interpreter] Block with ID ${currentBlockId} not found in automation.`);
      await updateSession(sessionId, currentBlockId, "completed");
      return;
    }

    // --- MESSAGE BLOCK ---
    if (block.type === "message") {
      const blockData = block.data || {};
      const buttons = blockData.buttons || [];
      
      // If we are resumed via a button click input (e.g. postback payload matching a button ID),
      // we navigate to that button's target instead of sending the message again!
      if (inputPayload?.buttonPayload && !hasInputBeenProcessed) {
        const clickedButton = buttons.find((btn: any) => btn.id === inputPayload.buttonPayload || btn.next_block_id === inputPayload.buttonPayload);
        if (clickedButton && clickedButton.next_block_id) {
          console.log(`[Interpreter] Resuming message block via button click: transition to ${clickedButton.next_block_id}`);
          currentBlockId = clickedButton.next_block_id;
          hasInputBeenProcessed = true;
          continue;
        }
      }

      // Interpolate text
      const rawText = blockData.text || "";
      const interpolatedText = interpolateVariables(rawText, contact);

      console.log(`[Interpreter] Sending Message Block. Original: "${rawText.substring(0, 30)}...", Interpolated: "${interpolatedText.substring(0, 30)}..."`);

      // Dispatch via Meta Graph API Client
      // If first message in a comment-triggered session, reply privately to that comment
      const sendCommentId = (session.current_block_id === null || session.current_block_id === flowData.start_block_id) ? commentId : undefined;
      
      const sendRes = await sendInstagramMessage(account.access_token, {
        recipientId: contact.instagram_user_id,
        text: interpolatedText,
        buttons: blockData.buttons,
        attachments: blockData.attachments,
        commentId: sendCommentId,
      });

      // Write to Message Log table
      try {
        await supabase.from("messages").insert({
          contact_id: contact.id,
          automation_id: automation.id,
          direction: "outbound",
          content: interpolatedText || JSON.stringify(blockData.attachments || {}),
          message_type: blockData.attachments && blockData.attachments.length > 0 ? blockData.attachments[0].type : "text",
          instagram_message_id: sendRes.messageId,
        });
      } catch (logErr) {
        console.error("[Interpreter] Message logging failed:", logErr);
      }

      // Check if message block requires user input (action buttons or quick replies)
      const hasActionButtons = buttons.some((btn: any) => btn.type === "action");
      if (hasActionButtons) {
        console.log(`[Interpreter] Message block has action buttons. Pausing session, waiting for input.`);
        await updateSession(sessionId, currentBlockId, "running"); // Keep running but store current block so we know where to resume
        return;
      }

      // Otherwise, immediately proceed to next block
      currentBlockId = blockData.next_block_id;
    }

    // --- ACTION BLOCK ---
    else if (block.type === "action") {
      const blockData = block.data || {};
      const actions = blockData.actions || [];

      console.log(`[Interpreter] Executing Action Block actions: ${actions.length}`);

      for (const action of actions) {
        if (action.type === "add_tag" && action.tag) {
          const currentTags = contact.tags || [];
          if (!currentTags.includes(action.tag)) {
            const updatedTags = [...currentTags, action.tag];
            contact.tags = updatedTags; // Update local copy
            await supabase.from("contacts").update({ tags: updatedTags }).eq("id", contact.id);
            console.log(`[Interpreter] Action: Added tag "${action.tag}" to contact.`);
          }
        }
        
        else if (action.type === "remove_tag" && action.tag) {
          const currentTags = contact.tags || [];
          if (currentTags.includes(action.tag)) {
            const updatedTags = currentTags.filter((t: string) => t !== action.tag);
            contact.tags = updatedTags; // Update local copy
            await supabase.from("contacts").update({ tags: updatedTags }).eq("id", contact.id);
            console.log(`[Interpreter] Action: Removed tag "${action.tag}" from contact.`);
          }
        }
        
        else if (action.type === "set_variable" && action.variable_name) {
          const currentVars = contact.variables || {};
          const updatedVars = { ...currentVars, [action.variable_name]: action.variable_value };
          contact.variables = updatedVars; // Update local copy
          await supabase.from("contacts").update({ variables: updatedVars }).eq("id", contact.id);
          console.log(`[Interpreter] Action: Set variable "${action.variable_name}" = "${action.variable_value}".`);
        }
        
        else if (action.type === "adjust_points" && action.points !== undefined) {
          const delta = Number(action.points);
          const { data: scoreRecord } = await supabase
            .from("gamification_scores")
            .select("points")
            .eq("contact_id", contact.id)
            .eq("account_id", account.id)
            .maybeSingle();

          const currentPoints = scoreRecord?.points || 0;
          const newPoints = Math.max(0, currentPoints + delta);

          await supabase.from("gamification_scores").upsert({
            contact_id: contact.id,
            account_id: account.id,
            points: newPoints,
            updated_at: new Date().toISOString()
          }, { onConflict: "contact_id,account_id" });
          console.log(`[Interpreter] Action: Adjusted points by ${delta}. New points: ${newPoints}`);
        }
        
        else if (action.type === "send_webhook" && action.webhook_url) {
          console.log(`[Interpreter] Action: Dispatching webhook POST to ${action.webhook_url}`);
          // Fire-and-forget webhook request
          fetch(action.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "chatbot_action_webhook",
              timestamp: new Date().toISOString(),
              contact: {
                id: contact.id,
                instagram_user_id: contact.instagram_user_id,
                username: contact.username,
                full_name: contact.full_name,
                tags: contact.tags,
                variables: contact.variables,
              },
              session: {
                id: sessionId,
                automation_id: automation.id,
                name: automation.name,
              }
            }),
          }).catch((err) => {
            console.error(`[Interpreter] Action webhook failed to ${action.webhook_url}:`, err.message);
          });
        }
        
        else if (action.type === "trigger_flow" && action.flow_id) {
          console.log(`[Interpreter] Action: Triggering sub-flow/automation ID ${action.flow_id}`);
          // Wait, to trigger a flow, we update this session to complete, and let the caller trigger a new session,
          // or we pivot this session to the new flow ID. Pivoting is extremely clean and preserves context.
          // Let's perform a redirect pivot:
          await updateSession(sessionId, null, "running"); // Reset block ID
          // Update the session's automation ID in database
          await supabase.from("automation_sessions").update({
            automation_id: action.flow_id,
            current_block_id: null
          }).eq("id", sessionId);
          
          // Re-trigger execution with the new automation
          console.log(`[Interpreter] Pivoting session ${sessionId} to new automation flow ${action.flow_id}`);
          setTimeout(() => {
            executeSessionStep(sessionId, undefined, commentId);
          }, 0);
          return;
        }
      }

      currentBlockId = blockData.next_block_id;
    }

    // --- CONDITION BLOCK ---
    else if (block.type === "condition") {
      const blockData = block.data || {};
      const conditions = blockData.conditions || [];
      const matchAll = blockData.match_all !== false; // Default to AND evaluation

      console.log(`[Interpreter] Evaluating Condition Block. MatchAll: ${matchAll}, Conditions: ${conditions.length}`);

      let blockMatched = matchAll; // Start with true for AND (all must match), false for OR (any must match)
      if (!matchAll) blockMatched = false;

      for (const cond of conditions) {
        let conditionResult = false;

        if (cond.type === "has_tag" && cond.tag) {
          const currentTags = contact.tags || [];
          conditionResult = currentTags.includes(cond.tag);
        }
        
        else if (cond.type === "variable_equals" && cond.variable_name) {
          const currentVars = contact.variables || {};
          conditionResult = String(currentVars[cond.variable_name]) === String(cond.variable_value);
        }
        
        else if (cond.type === "is_subscribed") {
          // If profile follower counts are present, assume subscribed
          conditionResult = contact.dialog_window_open || !!contact.profile_picture;
        }

        if (matchAll) {
          blockMatched = blockMatched && conditionResult;
        } else {
          blockMatched = blockMatched || conditionResult;
        }
      }

      const nextBranchId = blockMatched ? blockData.then_block_id : blockData.else_block_id;
      console.log(`[Interpreter] Condition Evaluation Result: ${blockMatched}. Routing to: ${nextBranchId}`);
      currentBlockId = nextBranchId;
    }
    
    // --- USER INPUT BLOCK ---
    else if (block.type === "user_input") {
      const blockData = block.data || {};
      const variableName = blockData.variable_name;
      const rawText = blockData.text || "";
      const interpolatedText = interpolateVariables(rawText, contact);

      if (inputPayload?.text && !hasInputBeenProcessed) {
        console.log(`[Interpreter] Resuming user_input block via text input. Transitioning to: ${blockData.next_block_id}`);
        currentBlockId = blockData.next_block_id;
        hasInputBeenProcessed = true;
        continue;
      }

      console.log(`[Interpreter] Encountered User Input Block. Sending prompt: "${interpolatedText.substring(0, 30)}..."`);

      const sendRes = await sendInstagramMessage(account.access_token, {
        recipientId: contact.instagram_user_id,
        text: interpolatedText,
      });

      try {
        await supabase.from("messages").insert({
          contact_id: contact.id,
          automation_id: automation.id,
          direction: "outbound",
          content: interpolatedText,
          message_type: "text",
          instagram_message_id: sendRes.messageId,
        });
      } catch (logErr) {
        console.error("[Interpreter] Message logging failed:", logErr);
      }

      await updateSession(sessionId, currentBlockId, "running");
      console.log(`[Interpreter] Session ${sessionId} paused at User Input block: ${currentBlockId}, waiting for variable: ${variableName}`);
      return;
    }

    // --- DELAY BLOCK ---
    else if (block.type === "delay") {
      const blockData = block.data || {};
      const delaySeconds = blockData.delay_seconds || 0;
      const nextBlockId = blockData.next_block_id;

      if (delaySeconds > 0 && nextBlockId) {
        console.log(`[Interpreter] Encountered Delay Block. Pausing session for ${delaySeconds}s (pointing to ${nextBlockId}).`);
        await updateSession(sessionId, currentBlockId, "waiting_delay");
        await scheduleSessionDelay(sessionId, nextBlockId, delaySeconds);
        return; // Halt interpretation loop
      } else {
        currentBlockId = nextBlockId;
      }
    }

    // Safety break for unsupported blocks
    else {
      console.warn(`[Interpreter] Unsupported block type: ${block.type}`);
      currentBlockId = null;
    }
  }

  // Execution has finished or hit a dead end
  if (!currentBlockId || executionCount >= maxIterations) {
    console.log(`[Interpreter] Session ${sessionId} run finished. Iterations: ${executionCount}. Setting status to completed.`);
    await updateSession(sessionId, null, "completed");
  }
}

/**
 * Updates the session block pointer and status in database.
 */
async function updateSession(sessionId: string, currentBlockId: string | null, status: "running" | "waiting_delay" | "completed" | "stopped") {
  await supabase
    .from("automation_sessions")
    .update({
      current_block_id: currentBlockId,
      status: status,
    })
    .eq("id", sessionId);

  if (status === "completed" || status === "stopped") {
    await cancelSessionDelay(sessionId);
  }
}
