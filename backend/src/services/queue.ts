import Queue from "bull";
import { env } from "../config/env";
import { supabase } from "../config/db";
import { executeSessionStep } from "./interpreter";

const isMockMode = env.META_APP_ID === "123456789";

let queue: Queue.Queue | null = null;
const mockTimers = new Map<string, NodeJS.Timeout>();

if (!isMockMode) {
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
    console.error("[Queue] Failed to initialize Bull queue, falling back to mock mode:", err);
    queue = null;
  }
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

  if (isMockMode || !queue) {
    // Memory mock mode delay using setTimeout
    const timer = setTimeout(async () => {
      mockTimers.delete(sessionId);
      await resumeSession(sessionId, nextBlockId);
    }, delaySeconds * 1000);
    
    // Cancel any existing timer first
    const existingTimer = mockTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    mockTimers.set(sessionId, timer);
    console.log(`[Queue Mock] Delay registered in-memory for session ${sessionId}`);
  } else {
    // Bull queue delay
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
    console.log(`[Queue Production] Delay job added to Bull queue for session ${sessionId}`);
  }
}

/**
 * Cancels a scheduled delay for a session.
 */
export async function cancelSessionDelay(sessionId: string): Promise<void> {
  console.log(`[Queue] Cancelling delay for session ${sessionId}`);

  if (isMockMode || !queue) {
    const timer = mockTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      mockTimers.delete(sessionId);
      console.log(`[Queue Mock] Cleared in-memory delay timer for session ${sessionId}`);
    }
  } else {
    try {
      const jobId = `delay_session_${sessionId}`;
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`[Queue Production] Removed job ${jobId} from Bull queue`);
      }
    } catch (err) {
      console.error(`[Queue] Error cancelling Bull job for session ${sessionId}:`, err);
    }
  }
}
