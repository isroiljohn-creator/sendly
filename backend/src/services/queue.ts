import Queue from "bull";
import { env } from "../config/env";
import { supabase } from "../config/db";
import { executeSessionStep } from "./interpreter";

let queue: Queue.Queue | null = null;

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
