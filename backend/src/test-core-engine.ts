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
      // Return chain
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
      // Supporting direct await on query builder
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
            // Direct await support
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

  // Run selection filter algorithm
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
        // e.g. instagram_page_id.eq.recipientId,instagram_page_id.eq.entryId
        const match = filter.val.match(/instagram_page_id\.eq\.([^,]+),instagram_page_id\.eq\.([^,]+)/);
        if (match) {
          const id1 = match[1];
          const id2 = match[2];
          list = list.filter((item) => item.instagram_page_id === id1 || item.instagram_page_id === id2);
        }
      }
    }

    // Attach automation triggers if doing select("*", "automation_triggers (*)")
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

  // Run update action
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

// Mock fetch to prevent outgoing webhook API requests during tests
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
const port = 4003;
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

// -------------------------------------------------------------
// 3. Test Runner
// -------------------------------------------------------------
async function runTests() {
  console.log("=================================================");
  console.log("Starting Phase 3: Core Execution Engine Tests...");
  console.log("=================================================");

  server = app.listen(port);
  console.log(`Test server running on port ${port}`);

  try {
    // -----------------------------------------------------------
    // TEST CASE 1: DM Keyword Flow Execution
    // -----------------------------------------------------------
    console.log("\n[Test 1] DM Keyword Flow (Any/Exact keyword matching)");
    resetMockDb();
    capturedWebhookPayloads = [];

    // Register Instagram Page account in mock database
    const mockAccount = {
      id: "acc_999",
      user_id: "user_owner_id",
      instagram_page_id: "page_insta_1",
      username: "my_business_page",
      access_token: "mock_token_key",
      is_active: true,
    };
    mockDb.instagram_accounts.push(mockAccount);

    // Setup visual builder block flow
    // Start -> Msg (w/ buttons) -> Pause -> Button Click -> Action (tag/variable/webhook) -> Condition -> Success/Failure Msg
    const flowData = {
      start_block_id: "block_msg_start",
      blocks: [
        {
          id: "block_msg_start",
          type: "message",
          data: {
            text: "Hello {{first_name}}! Do you want to receive the coupon?",
            buttons: [
              { id: "btn_coupon_yes", type: "action", text: "Yes, please!", next_block_id: "block_action_assign" },
              { id: "btn_coupon_no", type: "action", text: "No thanks", next_block_id: "block_msg_cancel" },
            ],
          },
        },
        {
          id: "block_action_assign",
          type: "action",
          data: {
            actions: [
              { type: "add_tag", tag: "promo_lead" },
              { type: "set_variable", variable_name: "coupon_code", variable_value: "SAVE50" },
              { type: "send_webhook", webhook_url: "https://my-webhook-receiver.com/promo" },
            ],
            next_block_id: "block_check_conditions",
          },
        },
        {
          id: "block_check_conditions",
          type: "condition",
          data: {
            conditions: [
              { type: "has_tag", tag: "promo_lead" },
              { type: "variable_equals", variable_name: "coupon_code", variable_value: "SAVE50" },
            ],
            match_all: true,
            then_block_id: "block_msg_success",
            else_block_id: "block_msg_fail",
          },
        },
        {
          id: "block_msg_success",
          type: "message",
          data: {
            text: "Awesome! Your custom coupon is: {{variables.coupon_code}}",
          },
        },
        {
          id: "block_msg_fail",
          type: "message",
          data: {
            text: "Conditions failed.",
          },
        },
        {
          id: "block_msg_cancel",
          type: "message",
          data: {
            text: "No coupon was requested.",
          },
        },
      ],
    };

    // Register automation and trigger rule
    const mockAutomation = {
      id: "auto_123",
      user_id: "user_owner_id",
      account_id: "acc_999",
      name: "Promo Discount Flow",
      is_active: true,
      flow_data: flowData,
      launch_count: 0,
      no_restart_seconds: 0,
      work_without_interruption: false,
    };
    mockDb.automations.push(mockAutomation);

    const mockTrigger = {
      id: "trig_123",
      automation_id: "auto_123",
      trigger_type: "direct_message",
      sensitivity: "exact_match",
      keywords: ["promo", "coupon", "sale"],
      post_id: null,
    };
    mockDb.automation_triggers.push(mockTrigger);

    // Simulate sending DM to trigger the flow
    const webhookPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_sender_777" },
              recipient: { id: "page_insta_1" },
              timestamp: Date.now(),
              message: {
                mid: "mid_msg_start_1",
                text: "coupon",
              },
            },
          ],
        },
      ],
    };

    const payloadStr = JSON.stringify(webhookPayload);
    const signature = generateSignatureHeader(payloadStr);

    console.log("- Dispatching exact keyword webhook payload...");
    const res1 = await makeRequest(
      "POST",
      "/webhook/instagram",
      { "X-Hub-Signature-256": signature },
      payloadStr
    );

    if (res1.status !== 200 || !res1.data.success) {
      throw new Error(`Webhook call failed: status ${res1.status}, data ${JSON.stringify(res1.data)}`);
    }

    // Wait a brief tick for async trigger matching/interpreter processing to complete
    await new Promise((r) => setTimeout(r, 100));

    // Verify Contact was synchronized
    const contact = mockDb.contacts.find((c) => c.instagram_user_id === "cust_sender_777");
    if (!contact) {
      throw new Error("Contact not synchronized after DM webhook");
    }
    console.log(`- Contact synchronized correctly: ID ${contact.id}, Username: ${contact.username}`);

    // Verify inbound message is logged
    const inboundLog = mockDb.messages.find((m) => m.contact_id === contact.id && m.direction === "inbound");
    if (!inboundLog || inboundLog.content !== "coupon") {
      throw new Error("Inbound message not logged or has wrong content");
    }
    console.log(`- Inbound message correctly logged.`);

    // Verify outbound reply is logged
    const outboundLog = mockDb.messages.find((m) => m.contact_id === contact.id && m.direction === "outbound");
    if (!outboundLog) {
      throw new Error("First outbound message from bot not logged");
    }
    console.log(`- Outbound message logged: "${outboundLog.content}"`);
    if (!outboundLog.content.includes("Hello User! Do you want to receive the coupon?")) {
      throw new Error(`Outbound message content incorrect. Got: ${outboundLog.content}`);
    }

    // Verify session state was created and is currently waiting for input (running status with block pointer)
    const session = mockDb.automation_sessions.find((s) => s.contact_id === contact.id);
    if (!session) {
      throw new Error("Automation session not created");
    }
    console.log(`- Session created successfully: ID ${session.id}, status: ${session.status}, block ID: ${session.current_block_id}`);
    if (session.status !== "running" || session.current_block_id !== "block_msg_start") {
      throw new Error("Session state is incorrect: session should be running at block_msg_start awaiting input.");
    }
    console.log("✅ DM Keyword execution test passed.");

    // -----------------------------------------------------------
    // TEST CASE 2: Button Click Resumption & Actions/Conditions
    // -----------------------------------------------------------
    console.log("\n[Test 2] Button click resumption, variables interpolation & condition routing");

    // Simulate clicking "Yes, please!" button
    const buttonPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_sender_777" },
              recipient: { id: "page_insta_1" },
              timestamp: Date.now(),
              postback: {
                payload: "btn_coupon_yes",
                title: "Yes, please!",
              },
            },
          ],
        },
      ],
    };

    const buttonPayloadStr = JSON.stringify(buttonPayload);
    const buttonSignature = generateSignatureHeader(buttonPayloadStr);

    console.log("- Dispatching button click webhook payload...");
    const res2 = await makeRequest(
      "POST",
      "/webhook/instagram",
      { "X-Hub-Signature-256": buttonSignature },
      buttonPayloadStr
    );

    if (res2.status !== 200 || !res2.data.success) {
      throw new Error("Webhook button press failed");
    }

    await new Promise((r) => setTimeout(r, 100));

    // Verify actions executed on the Contact: tag added, variable set
    const updatedContact = mockDb.contacts.find((c) => c.id === contact.id);
    console.log(`- Contact tags after button click:`, updatedContact.tags);
    console.log(`- Contact variables after button click:`, updatedContact.variables);

    if (!updatedContact.tags.includes("promo_lead")) {
      throw new Error("Action: tag 'promo_lead' was not appended to contact");
    }
    if (updatedContact.variables.coupon_code !== "SAVE50") {
      throw new Error("Action: variable 'coupon_code' was not set to 'SAVE50'");
    }

    // Verify webhook action payload was fired
    const promoWebhook = capturedWebhookPayloads.find((w) => w.url === "https://my-webhook-receiver.com/promo");
    if (!promoWebhook) {
      throw new Error("Action: webhook was not dispatched");
    }
    console.log(`- Webhook dispatched correctly. Payload coupon code: ${promoWebhook.body.contact.variables.coupon_code}`);

    // Verify condition block ran and went to success path
    const successLog = mockDb.messages.find(
      (m) => m.contact_id === contact.id && m.content.includes("Awesome! Your custom coupon is: SAVE50")
    );
    if (!successLog) {
      throw new Error("Routing failed: Did not arrive at success message block or failed to interpolate variables.");
    }
    console.log(`- Success block reached and variables correctly interpolated: "${successLog.content}"`);

    // Verify session status is completed
    const updatedSession = mockDb.automation_sessions.find((s) => s.id === session.id);
    console.log(`- Terminal Session Status: ${updatedSession.status}, current block: ${updatedSession.current_block_id}`);
    if (updatedSession.status !== "completed") {
      throw new Error("Session status should be completed after flow exhaustion");
    }
    console.log("✅ Button click resumption and condition routing test passed.");

    // -----------------------------------------------------------
    // TEST CASE 3: Post Comments webhook + Private reply routing
    // -----------------------------------------------------------
    console.log("\n[Test 3] Post comment matching & private replies");
    resetMockDb();
    capturedWebhookPayloads = [];

    // Load account
    mockDb.instagram_accounts.push(mockAccount);

    // Setup a comments flow
    const commentFlow = {
      start_block_id: "comment_reply_block",
      blocks: [
        {
          id: "comment_reply_block",
          type: "message",
          data: {
            text: "Thanks for commenting! Here is your link: https://chatplace.io",
          },
        },
      ],
    };

    mockDb.automations.push({
      ...mockAutomation,
      id: "auto_comments",
      name: "Comments automation",
      flow_data: commentFlow,
    });

    // Create trigger for post_comment
    mockDb.automation_triggers.push({
      id: "trig_comment",
      automation_id: "auto_comments",
      trigger_type: "post_comment",
      sensitivity: "contains",
      keywords: ["link", "send"],
      post_id: "media_post_abc123",
    });

    const commentWebhook = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          time: Date.now(),
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_777777",
                text: "Please send the link!",
                media: { id: "media_post_abc123" },
                from: { id: "cust_commenter_888", username: "some_ig_user" },
              },
            },
          ],
        },
      ],
    };

    const commentPayloadStr = JSON.stringify(commentWebhook);
    const commentSig = generateSignatureHeader(commentPayloadStr);

    console.log("- Dispatching post comment webhook payload...");
    const res3 = await makeRequest(
      "POST",
      "/webhook/instagram",
      { "X-Hub-Signature-256": commentSig },
      commentPayloadStr
    );

    if (res3.status !== 200 || !res3.data.success) {
      throw new Error("Webhook comment trigger failed");
    }

    await new Promise((r) => setTimeout(r, 100));

    // Verify contact created
    const commentContact = mockDb.contacts.find((c) => c.instagram_user_id === "cust_commenter_888");
    if (!commentContact) {
      throw new Error("Contact not created for commenter");
    }

    // Verify outbound private reply contains correct comment_id
    // Wait, let's verify if the mock Meta API captured this payload.
    // In Meta mock mode, we output the payload inconsole. Let's see if the message was logged in messages.
    const commentOutboundLog = mockDb.messages.find(
      (m) => m.contact_id === commentContact.id && m.direction === "outbound"
    );
    if (!commentOutboundLog) {
      throw new Error("Private comment reply message not logged");
    }
    console.log(`- Private comment reply logged: "${commentOutboundLog.content}"`);
    console.log("✅ Post comment matching & private replies test passed.");

    // -----------------------------------------------------------
    // TEST CASE 4: Frequency Limits / Restart Window Validation
    // -----------------------------------------------------------
    console.log("\n[Test 4] Frequency limits / Restart windows");
    resetMockDb();

    mockDb.instagram_accounts.push(mockAccount);
    
    // Set no_restart_seconds to 10 seconds
    const rateLimitedAutomation = {
      ...mockAutomation,
      id: "auto_ratelimit",
      no_restart_seconds: 10,
    };
    mockDb.automations.push(rateLimitedAutomation);

    mockDb.automation_triggers.push({
      id: "trig_ratelimit",
      automation_id: "auto_ratelimit",
      trigger_type: "direct_message",
      sensitivity: "any_message",
    });

    const triggerPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_ratelimit_777" },
              recipient: { id: "page_insta_1" },
              message: { mid: "m_ratelimit_1", text: "hello limit" },
            },
          ],
        },
      ],
    };

    const triggerStr = JSON.stringify(triggerPayload);
    const triggerSig = generateSignatureHeader(triggerStr);

    console.log("- Triggering first time (should run)...");
    await makeRequest("POST", "/webhook/instagram", { "X-Hub-Signature-256": triggerSig }, triggerStr);
    await new Promise((r) => setTimeout(r, 100));

    const sessions1 = mockDb.automation_sessions.filter((s) => s.automation_id === "auto_ratelimit");
    if (sessions1.length !== 1) {
      throw new Error(`Expected exactly 1 session, got ${sessions1.length}`);
    }
    console.log(`- First session created correctly: ${sessions1[0].id}`);

    console.log("- Triggering second time within 10s restart window (should be ignored)...");
    await makeRequest("POST", "/webhook/instagram", { "X-Hub-Signature-256": triggerSig }, triggerStr);
    await new Promise((r) => setTimeout(r, 100));

    const sessions2 = mockDb.automation_sessions.filter((s) => s.automation_id === "auto_ratelimit");
    if (sessions2.length !== 1) {
      throw new Error(`Expected session count to remain 1 due to frequency limit, but got ${sessions2.length}`);
    }
    console.log(`- Verified: Second trigger within the restart window was correctly ignored.`);
    console.log("✅ Frequency limits test passed.");

    // -----------------------------------------------------------
    // TEST CASE 5: Interruption Settings / Conflicts Resolution
    // -----------------------------------------------------------
    console.log("\n[Test 5] Interruption Settings (Session Conflict Resolution)");
    resetMockDb();

    mockDb.instagram_accounts.push(mockAccount);
    
    // Automation A (work_without_interruption = false)
    mockDb.automations.push({
      ...mockAutomation,
      id: "auto_a",
      name: "Automation A",
      work_without_interruption: false,
    });
    mockDb.automation_triggers.push({
      id: "trig_a",
      automation_id: "auto_a",
      trigger_type: "direct_message",
      sensitivity: "exact_match",
      keywords: ["start-a"],
    });

    // Automation B (work_without_interruption = false)
    mockDb.automations.push({
      ...mockAutomation,
      id: "auto_b",
      name: "Automation B",
      work_without_interruption: false,
    });
    mockDb.automation_triggers.push({
      id: "trig_b",
      automation_id: "auto_b",
      trigger_type: "direct_message",
      sensitivity: "exact_match",
      keywords: ["start-b"],
    });

    const triggerAPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_interrupt_777" },
              recipient: { id: "page_insta_1" },
              message: { mid: "m_a", text: "start-a" },
            },
          ],
        },
      ],
    };

    const triggerAPayloadStr = JSON.stringify(triggerAPayload);
    const triggerASig = generateSignatureHeader(triggerAPayloadStr);

    console.log("- Triggering Automation A...");
    await makeRequest("POST", "/webhook/instagram", { "X-Hub-Signature-256": triggerASig }, triggerAPayloadStr);
    await new Promise((r) => setTimeout(r, 100));

    const sessionA = mockDb.automation_sessions.find((s) => s.automation_id === "auto_a");
    if (!sessionA || sessionA.status !== "running") {
      throw new Error("Session A failed to start");
    }
    console.log(`- Session A started with status: ${sessionA.status}`);

    const triggerBPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "cust_interrupt_777" },
              recipient: { id: "page_insta_1" },
              message: { mid: "m_b", text: "start-b" },
            },
          ],
        },
      ],
    };

    const triggerBPayloadStr = JSON.stringify(triggerBPayload);
    const triggerBSig = generateSignatureHeader(triggerBPayloadStr);

    console.log("- Triggering Automation B (should interrupt Session A)...");
    await makeRequest("POST", "/webhook/instagram", { "X-Hub-Signature-256": triggerBSig }, triggerBPayloadStr);
    await new Promise((r) => setTimeout(r, 100));

    // Verify Session A was terminated/stopped
    const updatedSessionA = mockDb.automation_sessions.find((s) => s.id === sessionA.id);
    const sessionB = mockDb.automation_sessions.find((s) => s.automation_id === "auto_b");

    console.log(`- Session A final status: ${updatedSessionA.status}`);
    console.log(`- Session B current status: ${sessionB ? sessionB.status : "not started"}`);

    if (updatedSessionA.status !== "stopped") {
      throw new Error(`Expected Session A status to be 'stopped', but got '${updatedSessionA.status}'`);
    }
    if (!sessionB || sessionB.status !== "running") {
      throw new Error("Session B did not start");
    }
    console.log("✅ Interruption settings test passed.");

    console.log("\n=================================================");
    console.log("🎉 All Phase 3 Core Engine Tests Passed Successfully!");
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
