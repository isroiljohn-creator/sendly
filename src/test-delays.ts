import jwt from "jsonwebtoken";
import http from "http";
import crypto from "crypto";
import app from "./app";
import { env } from "./config/env";
import { supabase } from "./config/db";

// -------------------------------------------------------------
// 1. In-Memory Mock Database
// -------------------------------------------------------------
const mockDb: {
  instagram_accounts: any[];
  automations: any[];
  automation_triggers: any[];
  contacts: any[];
  automation_sessions: any[];
  messages: any[];
  automation_runs: any[];
} = {
  instagram_accounts: [],
  automations: [],
  automation_triggers: [],
  contacts: [],
  automation_sessions: [],
  messages: [],
  automation_runs: [],
};

// Reset mock database between tests
function resetMockDb() {
  mockDb.instagram_accounts = [];
  mockDb.automations = [];
  mockDb.automation_triggers = [];
  mockDb.contacts = [];
  mockDb.automation_sessions = [];
  mockDb.messages = [];
  mockDb.automation_runs = [];
}

// Fluent mock builder for Supabase client
const mockFrom = (table: string) => {
  const queryState: {
    filters: Array<{ type: "eq" | "in" | "gt" | "or"; col: string; val: any }>;
    sortCol?: string;
    sortAscending?: boolean;
  } = {
    filters: [],
  };

  const chain = {
    select: (fields?: string) => {
      return chain;
    },
    eq: (col: string, val: any) => {
      queryState.filters.push({ type: "eq", col, val });
      return chain;
    },
    in: (col: string, val: any[]) => {
      queryState.filters.push({ type: "in", col, val });
      return chain;
    },
    gt: (col: string, val: any) => {
      queryState.filters.push({ type: "gt", col, val });
      return chain;
    },
    or: (val: string) => {
      queryState.filters.push({ type: "or", col: "", val });
      return chain;
    },
    order: (col: string, options?: { ascending?: boolean }) => {
      queryState.sortCol = col;
      queryState.sortAscending = options?.ascending !== false;
      return chain;
    },
    maybeSingle: async () => {
      const data = runSelect();
      return { data: data.length > 0 ? data[0] : null, error: null };
    },
    single: async () => {
      const data = runSelect();
      if (data.length === 0) {
        return { data: null, error: new Error(`No record found in ${table}`) };
      }
      return { data: data[0], error: null };
    },
    then: (resolve: any) => {
      const data = runSelect();
      resolve({ data, error: null });
    },
    insert: (obj: any) => {
      const records = Array.isArray(obj) ? obj : [obj];
      const inserted: any[] = [];
      for (const rec of records) {
        const newRecord = {
          id: rec.id || "mock-uuid-" + Math.random().toString(36).substring(2, 11),
          created_at: new Date().toISOString(),
          triggered_at: new Date().toISOString(),
          ...rec,
        };
        (mockDb as any)[table].push(newRecord);
        inserted.push(newRecord);
      }
      
      const insertChain = {
        select: (fields?: string) => {
          return {
            single: async () => {
              return { data: inserted[0], error: null };
            },
            maybeSingle: async () => {
              return { data: inserted[0], error: null };
            }
          };
        }
      };
      return insertChain as any;
    },
    update: (obj: any) => {
      return {
        eq: (col: string, val: any) => {
          queryState.filters.push({ type: "eq", col, val });
          
          const updateChain = {
            in: (inCol: string, inVal: any[]) => {
              queryState.filters.push({ type: "in", col: inCol, val: inVal });
              return updateChain;
            },
            select: () => {
              return {
                single: async () => {
                  const updated = runUpdate(obj);
                  return { data: updated[0] || null, error: null };
                }
              };
            },
            then: (resolve: any) => {
              runUpdate(obj);
              resolve({ error: null });
            }
          };
          
          return updateChain;
        }
      };
    }
  };

  function runSelect(): any[] {
    let list = [...((mockDb as any)[table] || [])];

    for (const filter of queryState.filters) {
      if (filter.type === "eq") {
        list = list.filter((item) => String(item[filter.col]) === String(filter.val));
      } else if (filter.type === "in") {
        list = list.filter((item) => filter.val.includes(item[filter.col]));
      } else if (filter.type === "gt") {
        list = list.filter((item) => new Date(item[filter.col]) > new Date(filter.val));
      } else if (filter.type === "or") {
        const match = filter.val.match(/instagram_page_id\.eq\.([^,]+),instagram_page_id\.eq\.([^,]+)/);
        if (match) {
          const id1 = match[1];
          const id2 = match[2];
          list = list.filter((item) => item.instagram_page_id === id1 || item.instagram_page_id === id2);
        }
      }
    }

    if (table === "automations") {
      list = list.map((item) => {
        const triggers = mockDb.automation_triggers.filter((t) => t.automation_id === item.id);
        return { ...item, automation_triggers: triggers };
      });
    }

    if (queryState.sortCol) {
      list.sort((a, b) => {
        const valA = a[queryState.sortCol!];
        const valB = b[queryState.sortCol!];
        if (valA < valB) return queryState.sortAscending ? -1 : 1;
        if (valA > valB) return queryState.sortAscending ? 1 : -1;
        return 0;
      });
    }

    return list;
  }

  function runUpdate(obj: any): any[] {
    let list = [...((mockDb as any)[table] || [])];

    for (const filter of queryState.filters) {
      if (filter.type === "eq") {
        list = list.filter((item) => String(item[filter.col]) === String(filter.val));
      } else if (filter.type === "in") {
        list = list.filter((item) => filter.val.includes(item[filter.col]));
      }
    }

    const updatedRecords: any[] = [];
    for (const item of list) {
      const idx = (mockDb as any)[table].findIndex((x: any) => x.id === item.id);
      if (idx !== -1) {
        const updated = { ...(mockDb as any)[table][idx], ...obj, updated_at: new Date().toISOString() };
        (mockDb as any)[table][idx] = updated;
        updatedRecords.push(updated);
      }
    }
    return updatedRecords;
  }

  return chain as any;
};

// Overwrite the Supabase from client method with our mock
supabase.from = mockFrom as any;

// Mock global fetch
let capturedWebhookPayloads: any[] = [];
(global as any).fetch = async (url: string, options?: any) => {
  if (options && options.body) {
    try {
      const parsedBody = JSON.parse(options.body);
      capturedWebhookPayloads.push({ url, body: parsedBody });
    } catch {
      capturedWebhookPayloads.push({ url, rawBody: options.body });
    }
  } else {
    capturedWebhookPayloads.push({ url, method: options?.method });
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
    text: async () => "ok",
  } as any;
};

// -------------------------------------------------------------
// 2. HTTP Helper functions
// -------------------------------------------------------------
const port = 4004;
let server: http.Server;

const makeRequest = (
  method: "GET" | "POST",
  path: string,
  headers: Record<string, string> = {},
  body?: string
): Promise<{ status: number; headers: any; data: any }> => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "localhost",
        port,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              data: JSON.parse(responseBody),
            });
          } catch (e) {
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              data: responseBody,
            });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
};

const generateSignatureHeader = (bodyStr: string) => {
  const hash = crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(bodyStr)
    .digest("hex");
  return `sha256=${hash}`;
};

// Helper for test delay
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// -------------------------------------------------------------
// 3. Test Runner
// -------------------------------------------------------------
async function runTests() {
  console.log("=================================================");
  console.log("Starting Phase 4: Delay & Interruption Tests...");
  console.log("=================================================");

  server = app.listen(port);
  console.log(`Test server running on port ${port}`);

  try {
    // -----------------------------------------------------------
    // TEST CASE 1: Delay block execution & auto-resumption
    // -----------------------------------------------------------
    console.log("\n[Test 1] Delay Block execution, pause, and auto-resumption");
    resetMockDb();
    capturedWebhookPayloads = [];

    const mockAccount = {
      id: "acc_delays",
      user_id: "user_owner_id",
      instagram_page_id: "page_insta_delay",
      username: "delay_test_business",
      access_token: "mock_token_key",
      is_active: true,
    };
    mockDb.instagram_accounts.push(mockAccount);

    // Setup visual builder block flow: Message -> Delay 2 seconds -> Message
    const flowData = {
      start_block_id: "block_msg_1",
      blocks: [
        {
          id: "block_msg_1",
          type: "message",
          data: {
            text: "Hello! Starting delay test.",
            next_block_id: "block_delay_wait",
          },
        },
        {
          id: "block_delay_wait",
          type: "delay",
          data: {
            delay_seconds: 2,
            next_block_id: "block_msg_2",
          },
        },
        {
          id: "block_msg_2",
          type: "message",
          data: {
            text: "Delay completed successfully!",
          },
        },
      ],
    };

    const mockAutomation = {
      id: "auto_delay_1",
      user_id: "user_owner_id",
      account_id: "acc_delays",
      name: "Delay Test Automation",
      is_active: true,
      flow_data: flowData,
      launch_count: 0,
      no_restart_seconds: 0,
      work_without_interruption: false,
    };
    mockDb.automations.push(mockAutomation);

    const mockTrigger = {
      id: "trig_delay_1",
      automation_id: "auto_delay_1",
      trigger_type: "direct_message",
      sensitivity: "exact_match",
      keywords: ["start-delay"],
    };
    mockDb.automation_triggers.push(mockTrigger);

    const webhookPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_delay",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_delay_777" },
              recipient: { id: "page_insta_delay" },
              message: { mid: "mid_msg_delay_start", text: "start-delay" },
            },
          ],
        },
      ],
    };

    const payloadStr = JSON.stringify(webhookPayload);
    const signature = generateSignatureHeader(payloadStr);

    console.log("- Sending trigger message...");
    const res1 = await makeRequest(
      "POST",
      "/webhook/instagram",
      { "X-Hub-Signature-256": signature },
      payloadStr
    );

    if (res1.status !== 200 || !res1.data.success) {
      throw new Error(`Webhook trigger failed: status ${res1.status}`);
    }

    // Wait a brief moment for trigger & initial execution steps
    await wait(150);

    const contact = mockDb.contacts.find((c) => c.instagram_user_id === "cust_delay_777");
    if (!contact) {
      throw new Error("Contact not created");
    }

    const session = mockDb.automation_sessions.find((s) => s.contact_id === contact.id);
    if (!session) {
      throw new Error("Session not created");
    }

    console.log(`- Session current block: ${session.current_block_id}`);
    console.log(`- Session status: ${session.status}`);
    console.log(`- Session next_step_at: ${session.next_step_at}`);

    // Verify session state is waiting_delay at block_delay_wait
    if (session.status !== "waiting_delay" || session.current_block_id !== "block_delay_wait") {
      throw new Error("Expected session to be paused in 'waiting_delay' at block 'block_delay_wait'");
    }

    if (!session.next_step_at) {
      throw new Error("Expected session to have 'next_step_at' set");
    }

    // Verify message 1 is logged, but message 2 is NOT yet logged
    const messagesBefore = mockDb.messages.filter((m) => m.contact_id === contact.id && m.direction === "outbound");
    console.log(`- Message logs count before delay finishes: ${messagesBefore.length}`);
    if (messagesBefore.length !== 1 || messagesBefore[0].content !== "Hello! Starting delay test.") {
      throw new Error("First message was not logged correctly, or multiple messages logged prematurely");
    }

    console.log("- Waiting 2.3 seconds for delay to finish...");
    await wait(2300);

    // Verify that the delay resumed, executed block_msg_2, and session completed
    const updatedSession = mockDb.automation_sessions.find((s) => s.id === session.id);
    console.log(`- Session status after delay: ${updatedSession.status}`);
    console.log(`- Session current block after delay: ${updatedSession.current_block_id}`);

    if (updatedSession.status !== "completed") {
      throw new Error(`Expected session status to be 'completed', but got '${updatedSession.status}'`);
    }

    const messagesAfter = mockDb.messages.filter((m) => m.contact_id === contact.id && m.direction === "outbound");
    console.log(`- Message logs count after delay finishes: ${messagesAfter.length}`);
    if (messagesAfter.length !== 2) {
      throw new Error(`Expected exactly 2 outbound messages, got ${messagesAfter.length}`);
    }

    if (messagesAfter[1].content !== "Delay completed successfully!") {
      throw new Error(`Second message content is incorrect: ${messagesAfter[1].content}`);
    }

    console.log("✅ Test 1 Passed: Delay executed and auto-resumed successfully.");

    // -----------------------------------------------------------
    // TEST CASE 2: Interruption cancelling delay jobs
    // -----------------------------------------------------------
    console.log("\n[Test 2] Interruption cancelling pending delay jobs");
    resetMockDb();
    capturedWebhookPayloads = [];

    mockDb.instagram_accounts.push(mockAccount);

    // Setup Automation A (with 5 seconds delay)
    const flowDataA = {
      start_block_id: "block_a_start",
      blocks: [
        {
          id: "block_a_start",
          type: "message",
          data: {
            text: "Hello from Flow A!",
            next_block_id: "block_a_delay",
          },
        },
        {
          id: "block_a_delay",
          type: "delay",
          data: {
            delay_seconds: 5,
            next_block_id: "block_a_end",
          },
        },
        {
          id: "block_a_end",
          type: "message",
          data: {
            text: "Flow A finished delay!",
          },
        },
      ],
    };

    mockDb.automations.push({
      ...mockAutomation,
      id: "auto_interrupt_a",
      name: "Automation A (Delay)",
      flow_data: flowDataA,
    });

    mockDb.automation_triggers.push({
      id: "trig_a",
      automation_id: "auto_interrupt_a",
      trigger_type: "direct_message",
      sensitivity: "exact_match",
      keywords: ["start-a"],
    });

    // Setup Automation B (interrupter)
    const flowDataB = {
      start_block_id: "block_b_start",
      blocks: [
        {
          id: "block_b_start",
          type: "message",
          data: {
            text: "Interrupted by Flow B!",
          },
        },
      ],
    };

    mockDb.automations.push({
      ...mockAutomation,
      id: "auto_interrupt_b",
      name: "Automation B (Interrupter)",
      work_without_interruption: false, // will interrupt active sessions
      flow_data: flowDataB,
    });

    mockDb.automation_triggers.push({
      id: "trig_b",
      automation_id: "auto_interrupt_b",
      trigger_type: "direct_message",
      sensitivity: "exact_match",
      keywords: ["start-b"],
    });

    const triggerAPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_delay",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_interrupt_999" },
              recipient: { id: "page_insta_delay" },
              message: { mid: "mid_msg_a", text: "start-a" },
            },
          ],
        },
      ],
    };

    const triggerAPayloadStr = JSON.stringify(triggerAPayload);
    const triggerASig = generateSignatureHeader(triggerAPayloadStr);

    console.log("- Triggering Automation A...");
    await makeRequest("POST", "/webhook/instagram", { "X-Hub-Signature-256": triggerASig }, triggerAPayloadStr);
    await wait(150);

    const contact2 = mockDb.contacts.find((c) => c.instagram_user_id === "cust_interrupt_999");
    if (!contact2) {
      throw new Error("Contact 2 not created");
    }

    const sessionA = mockDb.automation_sessions.find((s) => s.contact_id === contact2.id && s.automation_id === "auto_interrupt_a");
    if (!sessionA) {
      throw new Error("Session A not created");
    }

    console.log(`- Session A started. Current status: ${sessionA.status}, current block: ${sessionA.current_block_id}`);
    if (sessionA.status !== "waiting_delay") {
      throw new Error("Session A should be waiting_delay");
    }

    const triggerBPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_delay",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_interrupt_999" },
              recipient: { id: "page_insta_delay" },
              message: { mid: "mid_msg_b", text: "start-b" },
            },
          ],
        },
      ],
    };

    const triggerBPayloadStr = JSON.stringify(triggerBPayload);
    const triggerBSig = generateSignatureHeader(triggerBPayloadStr);

    console.log("- Triggering Automation B (Interrupter)...");
    await makeRequest("POST", "/webhook/instagram", { "X-Hub-Signature-256": triggerBSig }, triggerBPayloadStr);
    await wait(150);

    // Verify Session A status changed to stopped
    const updatedSessionA = mockDb.automation_sessions.find((s) => s.id === sessionA.id);
    console.log(`- Session A status after B trigger: ${updatedSessionA.status}`);
    if (updatedSessionA.status !== "stopped") {
      throw new Error(`Expected Session A to be 'stopped', but got '${updatedSessionA.status}'`);
    }

    // Verify Session B started and completed
    const sessionB = mockDb.automation_sessions.find((s) => s.contact_id === contact2.id && s.automation_id === "auto_interrupt_b");
    if (!sessionB) {
      throw new Error("Session B not created");
    }
    console.log(`- Session B status: ${sessionB.status}`);
    if (sessionB.status !== "completed") {
      throw new Error(`Expected Session B to be 'completed', but got '${sessionB.status}'`);
    }

    console.log("- Waiting 6 seconds (to verify cancelled delay timer does NOT fire)...");
    await wait(6000);

    // Verify that the second message of Flow A was NEVER sent/logged
    const flowAMessages = mockDb.messages.filter((m) => m.contact_id === contact2.id && m.content.includes("Flow A"));
    console.log(`- Flow A message logs count after waiting: ${flowAMessages.length}`);
    if (flowAMessages.length !== 1) {
      throw new Error("Flow A second message was sent! Delay timer was not cancelled properly upon interruption.");
    }

    console.log("✅ Test 2 Passed: Interruption successfully cancelled pending delay timers.");

    console.log("\n=================================================");
    console.log("🎉 All Phase 4 Delay & Interruption Tests Passed!");
    console.log("=================================================");
    
    server.close(() => {
      console.log("Test server stopped.");
      process.exit(0);
    });
  } catch (error) {
    console.error("\n❌ Test Suite Failed:", error);
    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  }
}

runTests();
