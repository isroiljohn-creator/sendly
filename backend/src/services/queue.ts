import Queue from "bull";
import { env } from "../config/env";
import { supabase } from "../config/db";
import { executeSessionStep } from "./interpreter";
import { sendInstagramMessage } from "../utils/meta";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let queue: Queue.Queue | null = null;
let broadcastsQueue: Queue.Queue | null = null;

try {
  queue = new Queue("instagram-chatbot-delays", env.REDIS_URL, {
    settings: {
      backoffStrategies: {},
    },
  });

  // Set up the processor
  queue.process(async (job) => {
    const { sessionId, nextBlockId } = job.data;
    console.log(`[Queue Processor] Processing delay job for session: ${sessionId}, next block: ${nextBlockId}`);
    await resumeSession(sessionId, nextBlockId);
  });

  queue.on("error", (err) => {
    console.error("[Queue] Bull queue error:", err);
  });
} catch (err) {
  console.error("[Queue] Failed to initialize Bull queue:", err);
  queue = null;
}

try {
  broadcastsQueue = new Queue("broadcasts-queue", env.REDIS_URL);

  broadcastsQueue.process(async (job) => {
    const { broadcastId, userId } = job.data;
    console.log(`[Broadcast Queue Processor] Processing job for broadcast ${broadcastId}, user ${userId}`);
    await processBroadcastJob(broadcastId, userId);
  });

  broadcastsQueue.on("error", (err) => {
    console.error("[Broadcast Queue] Bull queue error:", err);
  });
} catch (err) {
  console.error("[Broadcast Queue] Failed to initialize Bull broadcasts queue:", err);
  broadcastsQueue = null;
}

/**
 * Resumes session execution starting from nextBlockId.
 */
async function resumeSession(sessionId: string, nextBlockId: string) {
  // 1. Fetch active session and verify status
  const { data: session } = await supabase
    .from("automation_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    console.warn(`[Queue Processor] Session ${sessionId} not found.`);
    return;
  }

  if (session.status !== "waiting_delay") {
    console.log(`[Queue Processor] Session ${sessionId} is not waiting_delay (current status: ${session.status}). Skipping.`);
    return;
  }

  console.log(`[Queue Processor] Resuming session ${sessionId} to block ${nextBlockId}`);

  // 2. Update session to running and point to next block
  await supabase
    .from("automation_sessions")
    .update({
      status: "running",
      current_block_id: nextBlockId,
      next_step_at: null,
    })
    .eq("id", sessionId);

  // 3. Trigger interpreter step
  executeSessionStep(sessionId).catch((err) => {
    console.error(`[Queue Processor] Execution step failed for session ${sessionId}:`, err);
  });
}

/**
 * Recovers waiting_delay sessions on startup.
 * Checks for past next_step_at (runs immediately) and future next_step_at (reschedules).
 */
export async function recoverStuckSessions(): Promise<void> {
  console.log("[Recovery] Checking for stuck waiting_delay sessions...");
  try {
    const now = new Date();
    const nowStr = now.toISOString();

    // 1. Fetch sessions stuck in waiting_delay where next_step_at is in the past or null
    const { data: stuckSessions, error } = await supabase
      .from("automation_sessions")
      .select("id, current_block_id, automation_id")
      .eq("status", "waiting_delay")
      .or(`next_step_at.lt.${nowStr},next_step_at.is.null`);

    if (error) {
      console.error("[Recovery] Failed to fetch stuck sessions:", error);
    } else if (stuckSessions && stuckSessions.length > 0) {
      console.log(`[Recovery] Found ${stuckSessions.length} stuck sessions. Attempting recovery...`);
      for (const session of stuckSessions) {
        const { data: automation } = await supabase
          .from("automations")
          .select("flow_data")
          .eq("id", session.automation_id)
          .maybeSingle();

        if (!automation) {
          console.warn(`[Recovery] Automation ${session.automation_id} not found for session ${session.id}. Skipping.`);
          continue;
        }

        const blocks = automation.flow_data?.blocks || [];
        const delayBlock = blocks.find((b: any) => b.id === session.current_block_id);
        const nextBlockId = delayBlock?.data?.next_block_id;

        if (!nextBlockId) {
          console.warn(`[Recovery] Could not resolve next block for session ${session.id}. Marking as completed.`);
          await supabase
            .from("automation_sessions")
            .update({ status: "completed" })
            .eq("id", session.id);
          continue;
        }

        console.log(`[Recovery] Resuming session ${session.id} to block ${nextBlockId}`);
        await resumeSession(session.id, nextBlockId);
      }
    }

    // 2. Fetch future sessions to reschedule
    const { data: futureSessions, error: futErr } = await supabase
      .from("automation_sessions")
      .select("id, current_block_id, automation_id, next_step_at")
      .eq("status", "waiting_delay")
      .gt("next_step_at", nowStr);

    if (futErr) {
      console.error("[Recovery] Failed to fetch future sessions:", futErr);
    } else if (futureSessions && futureSessions.length > 0) {
      console.log(`[Recovery] Found ${futureSessions.length} future sessions. Rescheduling delays...`);
      for (const session of futureSessions) {
        const nextStepAt = new Date(session.next_step_at).getTime();
        const delaySeconds = Math.max(1, Math.round((nextStepAt - Date.now()) / 1000));

        const { data: automation } = await supabase
          .from("automations")
          .select("flow_data")
          .eq("id", session.automation_id)
          .maybeSingle();

        if (automation) {
          const blocks = automation.flow_data?.blocks || [];
          const delayBlock = blocks.find((b: any) => b.id === session.current_block_id);
          const nextBlockId = delayBlock?.data?.next_block_id;
          if (nextBlockId) {
            await scheduleSessionDelay(session.id, nextBlockId, delaySeconds);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Recovery] Unexpected error during session recovery:", err);
  }
}

/**
 * Schedules a delayed execution step for a session.
 */
export async function scheduleSessionDelay(
  sessionId: string,
  nextBlockId: string,
  delaySeconds: number
): Promise<void> {
  console.log(`[Queue] Scheduling delay for session ${sessionId}: ${delaySeconds}s (Next block: ${nextBlockId})`);

  // Record next step timestamp in database session row
  const nextStepAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
  await supabase
    .from("automation_sessions")
    .update({ next_step_at: nextStepAt })
    .eq("id", sessionId);

  if (queue) {
    const jobId = `delay_session_${sessionId}`;
    await queue.add(
      { sessionId, nextBlockId },
      {
        delay: delaySeconds * 1000,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    console.log(`[Queue] Delay job added to Bull queue for session ${sessionId}`);
  } else {
    console.warn(`[Queue] Bull queue not available. Delay for session ${sessionId} could not be scheduled.`);
  }
}

/**
 * Cancels a scheduled delay for a session.
 */
export async function cancelSessionDelay(sessionId: string): Promise<void> {
  console.log(`[Queue] Cancelling delay for session ${sessionId}`);

  if (queue) {
    try {
      const jobId = `delay_session_${sessionId}`;
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`[Queue] Removed job ${jobId} from Bull queue`);
      }
    } catch (err) {
      console.error(`[Queue] Error cancelling Bull job for session ${sessionId}:`, err);
    }
  }
}

/**
 * Processes a broadcast job in the Bull queue.
 */
async function processBroadcastJob(broadcastId: string, userId: string): Promise<void> {
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

    let sent = broadcast.sent_count || 0;
    let failed = broadcast.failed_count || 0;
    const pageSize = 50;
    let hasMore = true;

    // 4. Send messages sequentially in paginated chunks, resuming where left off
    while (hasMore) {
      const startIndex = sent + failed;
      if (startIndex >= total) {
        hasMore = false;
        break;
      }

      const { data: contacts, error: contactsErr } = await supabase
        .from("contacts")
        .select("*")
        .eq("account_id", broadcast.account_id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .range(startIndex, startIndex + pageSize - 1);

      if (contactsErr || !contacts || contacts.length === 0) {
        hasMore = false;
        break;
      }

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];

        // Double-check status in database to allow cancellation
        const { data: currentBroadcast } = await supabase
          .from("broadcasts")
          .select("status")
          .eq("id", broadcastId)
          .maybeSingle();

        if (currentBroadcast && currentBroadcast.status !== "sending") {
          console.log(`[Broadcast Worker] Broadcast ${broadcastId} stopped/cancelled externally.`);
          return;
        }

        const currentIndex = startIndex + i + 1;
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
 * Adds a broadcast to the Bull queue.
 */
export async function addBroadcastToQueue(broadcastId: string, userId: string): Promise<void> {
  console.log(`[Queue] Adding broadcast ${broadcastId} for user ${userId} to queue...`);
  if (broadcastsQueue) {
    const jobId = `broadcast_${broadcastId}`;
    await broadcastsQueue.add(
      { broadcastId, userId },
      {
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    console.log(`[Queue] Broadcast job ${jobId} added to Bull queue`);
  } else {
    console.warn(`[Queue] Bull queue for broadcasts not available. Cannot add job.`);
  }
}

/**
 * Recovers stuck sending broadcasts from the database on startup.
 */
export async function recoverStuckBroadcasts(): Promise<void> {
  console.log("[Recovery] Checking for stuck sending broadcasts...");
  try {
    const { data: stuckBroadcasts, error } = await supabase
      .from("broadcasts")
      .select("id, user_id")
      .eq("status", "sending");

    if (error) {
      console.error("[Recovery] Failed to fetch stuck broadcasts:", error);
    } else if (stuckBroadcasts && stuckBroadcasts.length > 0) {
      console.log(`[Recovery] Found ${stuckBroadcasts.length} stuck broadcasts. Attempting recovery...`);
      for (const b of stuckBroadcasts) {
        await addBroadcastToQueue(b.id, b.user_id);
      }
    }
  } catch (err) {
    console.error("[Recovery] Unexpected error during broadcast recovery:", err);
  }
}
