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
  tags: any[];
  gamification_scores: any[];
  referral_links: any[];
  referrals: any[];
  broadcasts: any[];
  conversions: any[];
} = {
  instagram_accounts: [],
  automations: [],
  automation_triggers: [],
  contacts: [],
  automation_sessions: [],
  messages: [],
  automation_runs: [],
  tags: [],
  gamification_scores: [],
  referral_links: [],
  referrals: [],
  broadcasts: [],
  conversions: [],
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
  mockDb.tags = [];
  mockDb.gamification_scores = [];
  mockDb.referral_links = [];
  mockDb.referrals = [];
  mockDb.broadcasts = [];
  mockDb.conversions = [];
}

// Fluent mock builder for Supabase client
const mockFrom = (table: string) => {
  const queryState: {
    filters: Array<{ type: "eq" | "in" | "gt" | "or"; col: string; val: any }>;
    sortCol?: string;
    sortAscending?: boolean;
    limitVal?: number;
  } = {
    filters: [],
  };

  const chain = {
    select: (fields?: string, options?: { count?: string; head?: boolean }) => {
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
    limit: (val: number) => {
      queryState.limitVal = val;
      return chain;
    },
    range: (from: number, to: number) => {
      queryState.limitVal = to - from + 1;
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
      resolve({
        data,
        count: data.length,
        error: null,
      });
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
            },
            then: (resolve: any) => {
              resolve({ data: inserted, error: null });
            },
          };
        },
        then: (resolve: any) => {
          resolve({ data: inserted, error: null });
        },
      };
      return insertChain as any;
    },
    upsert: (obj: any, options?: { onConflict?: string }) => {
      const records = Array.isArray(obj) ? obj : [obj];
      const upserted: any[] = [];
      const tableData = (mockDb as any)[table];
      for (const rec of records) {
        let existingIdx = -1;
        if (options?.onConflict === "contact_id,account_id") {
          existingIdx = tableData.findIndex(
            (item: any) =>
              String(item.contact_id) === String(rec.contact_id) &&
              String(item.account_id) === String(rec.account_id)
          );
        } else if (rec.id) {
          existingIdx = tableData.findIndex((item: any) => String(item.id) === String(rec.id));
        }

        if (existingIdx !== -1) {
          tableData[existingIdx] = {
            ...tableData[existingIdx],
            ...rec,
            updated_at: new Date().toISOString(),
          };
          upserted.push(tableData[existingIdx]);
        } else {
          const newRecord = {
            id: rec.id || "mock-uuid-" + Math.random().toString(36).substring(2, 11),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...rec,
          };
          tableData.push(newRecord);
          upserted.push(newRecord);
        }
      }

      const upsertChain = {
        select: (fields?: string) => {
          return {
            single: async () => {
              return { data: upserted[0], error: null };
            },
            maybeSingle: async () => {
              return { data: upserted[0], error: null };
            },
            then: (resolve: any) => {
              resolve({ data: upserted, error: null });
            },
          };
        },
        then: (resolve: any) => {
          resolve({ data: upserted, error: null });
        },
      };
      return upsertChain as any;
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
                },
              };
            },
            then: (resolve: any) => {
              runUpdate(obj);
              resolve({ error: null });
            },
          };

          return updateChain;
        },
      };
    },
    delete: () => {
      return {
        eq: (col: string, val: any) => {
          queryState.filters.push({ type: "eq", col, val });
          const deleteChain = {
            then: (resolve: any) => {
              const listToDelete = runSelect();
              const tableData = (mockDb as any)[table];
              for (const item of listToDelete) {
                const idx = tableData.findIndex((x: any) => x.id === item.id);
                if (idx !== -1) {
                  tableData.splice(idx, 1);
                }
              }
              resolve({ error: null });
            },
          };
          return deleteChain;
        },
      };
    },
  };

  // Run selection filter algorithm
  function runSelect(): any[] {
    let list = [...((mockDb as any)[table] || [])];

    // Attach dependencies manually if query has nested targets (e.g. for leaderboard contacts or automation triggers)
    if (table === "automations") {
      list = list.map((item) => {
        const triggers = mockDb.automation_triggers.filter((t) => t.automation_id === item.id);
        return { ...item, automation_triggers: triggers };
      });
    } else if (table === "gamification_scores" || table === "messages" || table === "automation_runs" || table === "conversions") {
      list = list.map((item) => {
        const contactRec = mockDb.contacts.find((c) => c.id === item.contact_id);
        return {
          ...item,
          contacts: contactRec || null,
        };
      });
    }

    for (const filter of queryState.filters) {
      if (filter.type === "eq") {
        list = list.filter((item) => {
          if (filter.col === "contacts.user_id") {
            return item.contacts && String(item.contacts.user_id) === String(filter.val);
          }
          return String(item[filter.col]) === String(filter.val);
        });
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

    if (queryState.sortCol) {
      list.sort((a, b) => {
        const valA = a[queryState.sortCol!];
        const valB = b[queryState.sortCol!];
        if (valA < valB) return queryState.sortAscending ? -1 : 1;
        if (valA > valB) return queryState.sortAscending ? 1 : -1;
        return 0;
      });
    }

    if (queryState.limitVal !== undefined) {
      list = list.slice(0, queryState.limitVal);
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
const port = 4005;
let server: http.Server;

const makeRequest = (
  method: "GET" | "POST" | "PUT" | "DELETE",
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

// Helper to delay execution in tests
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// -------------------------------------------------------------
// 3. Test Runner
// -------------------------------------------------------------
async function runTests() {
  console.log("=================================================");
  console.log("Starting Advanced Engine & REST API Integration Tests...");
  console.log("=================================================");

  server = app.listen(port);
  console.log(`Test server running on port ${port}`);

  const userId = "b328a6f2-bfd1-417d-8153-f725a397cd9a";
  const validToken = jwt.sign({ user_id: userId }, env.JWT_SECRET, { expiresIn: "1h" });
  const authHeaders = { Authorization: `Bearer ${validToken}` };

  try {
    // -----------------------------------------------------------
    // TEST CASE 1: Contacts REST API & Messages Send
    // -----------------------------------------------------------
    console.log("\n[Test 1] Contacts API & Manual Message Send");
    resetMockDb();

    const mockAccount = {
      id: "acc_111",
      user_id: userId,
      instagram_page_id: "page_insta_1",
      username: "my_business_page",
      access_token: "mock_token_key",
      is_active: true,
    };
    mockDb.instagram_accounts.push(mockAccount);

    const mockContact = {
      id: "contact111",
      user_id: userId,
      account_id: mockAccount.id,
      instagram_user_id: "user_insta_111",
      username: "customer_bob",
      full_name: "Bob Jones",
      tags: ["lead"],
      variables: { interest: "coupons" },
      dialog_window_open: true,
      dialog_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
    mockDb.contacts.push(mockContact);

    // List contacts
    const resContacts = await makeRequest("GET", "/api/contacts", authHeaders);
    if (resContacts.status !== 200 || !Array.isArray(resContacts.data.contacts)) {
      throw new Error(`Expected 200 list contacts, got ${resContacts.status}`);
    }
    console.log("✅ GET /api/contacts listing success");

    // Fetch contact
    const resContact = await makeRequest("GET", `/api/contacts/${mockContact.id}`, authHeaders);
    if (resContact.status !== 200 || resContact.data.contact.username !== "customer_bob") {
      throw new Error(`Expected contact_bob details, got: ${JSON.stringify(resContact.data)}`);
    }
    console.log("✅ GET /api/contacts/:id details retrieval success");

    // Update contact tags
    const resUpdate = await makeRequest(
      "PUT",
      `/api/contacts/${mockContact.id}`,
      authHeaders,
      JSON.stringify({ tags: ["lead", "active"], variables: { interest: "sales", age: "30" } })
    );
    if (resUpdate.status !== 200 || resUpdate.data.contact.tags.length !== 2) {
      throw new Error(`Failed to update contact. Data: ${JSON.stringify(resUpdate.data)}`);
    }
    console.log("✅ PUT /api/contacts/:id updates fields success");

    // Manual message send
    const resSend = await makeRequest(
      "POST",
      "/api/messages/send",
      authHeaders,
      JSON.stringify({ contact_id: mockContact.id, text: "Hello from support!" })
    );
    if (resSend.status !== 200 || !resSend.data.success) {
      throw new Error(`Manual send failed. Got: ${JSON.stringify(resSend.data)}`);
    }
    console.log("✅ POST /api/messages/send manual DM dispatch success");

    // Check message logs
    const resMessages = await makeRequest("GET", `/api/contacts/${mockContact.id}/messages`, authHeaders);
    if (resMessages.status !== 200 || resMessages.data.messages.length === 0) {
      throw new Error(`Expected logged messages, got: ${JSON.stringify(resMessages.data)}`);
    }
    console.log("✅ GET /api/contacts/:id/messages retrieval success");


    // -----------------------------------------------------------
    // TEST CASE 2: Tags CRUD
    // -----------------------------------------------------------
    console.log("\n[Test 2] Operator Tags CRUD");
    const resCreateTag = await makeRequest(
      "POST",
      "/api/tags",
      authHeaders,
      JSON.stringify({ name: "vip_member", color: "#FF0000" })
    );
    if (resCreateTag.status !== 201 || resCreateTag.data.tag.name !== "vip_member") {
      throw new Error(`Tag creation failed: ${JSON.stringify(resCreateTag.data)}`);
    }
    const tagId = resCreateTag.data.tag.id;
    console.log("✅ POST /api/tags creation success");

    const resListTags = await makeRequest("GET", "/api/tags", authHeaders);
    if (resListTags.status !== 200 || resListTags.data.tags.length === 0) {
      throw new Error(`Tags listing failed`);
    }
    console.log("✅ GET /api/tags listing success");

    const resUpdateTag = await makeRequest(
      "PUT",
      `/api/tags/${tagId}`,
      authHeaders,
      JSON.stringify({ color: "#00FF00" })
    );
    if (resUpdateTag.status !== 200 || resUpdateTag.data.tag.color !== "#00FF00") {
      throw new Error(`Tag update failed: ${JSON.stringify(resUpdateTag.data)}`);
    }
    console.log("✅ PUT /api/tags/:id update success");

    const resDeleteTag = await makeRequest("DELETE", `/api/tags/${tagId}`, authHeaders);
    if (resDeleteTag.status !== 200 || !resDeleteTag.data.success) {
      throw new Error(`Tag deletion failed`);
    }
    console.log("✅ DELETE /api/tags/:id deletion success");


    // -----------------------------------------------------------
    // TEST CASE 3: Gamification Score & Leaderboard
    // -----------------------------------------------------------
    console.log("\n[Test 3] Gamification Leaderboard & Score APIs");
    
    // Add dummy score
    mockDb.gamification_scores.push({
      id: "score_vip",
      contact_id: mockContact.id,
      account_id: mockAccount.id,
      points: 120,
      updated_at: new Date().toISOString(),
    });

    const resScore = await makeRequest("GET", `/api/gamification/score/${mockContact.id}`, authHeaders);
    if (resScore.status !== 200 || resScore.data.points !== 120) {
      throw new Error(`Failed to fetch score. Data: ${JSON.stringify(resScore.data)}`);
    }
    console.log("✅ GET /api/gamification/score/:contact_id retrieval success");

    const resLeaderboard = await makeRequest("GET", "/api/gamification/leaderboard", authHeaders);
    if (resLeaderboard.status !== 200 || resLeaderboard.data.leaderboard.length === 0) {
      throw new Error(`Failed to fetch leaderboard. Data: ${JSON.stringify(resLeaderboard.data)}`);
    }
    if (resLeaderboard.data.leaderboard[0].points !== 120 || resLeaderboard.data.leaderboard[0].username !== "customer_bob") {
      throw new Error(`Leaderboard payload formatted incorrectly: ${JSON.stringify(resLeaderboard.data)}`);
    }
    console.log("✅ GET /api/gamification/leaderboard populated and mapped fields successfully");


    // -----------------------------------------------------------
    // TEST CASE 4: Referrals Redirection & Webhook Tracking
    // -----------------------------------------------------------
    console.log("\n[Test 4] Referral Link Redirection & Point Awards");

    const mockAutomation = {
      id: "autoreferraltarget",
      user_id: userId,
      account_id: mockAccount.id,
      name: "Promo Referral Flow",
      is_active: true,
      launch_count: 0,
      flow_data: {
        start_block_id: "block_msg_1",
        blocks: [
          {
            id: "block_msg_1",
            type: "message",
            data: { text: "Welcome referred contact! You get 10% off." },
          },
        ],
      },
    };
    mockDb.automations.push(mockAutomation);

    // Create referral link
    const resCreateLink = await makeRequest(
      "POST",
      "/api/referral-links",
      authHeaders,
      JSON.stringify({ automation_id: mockAutomation.id })
    );
    if (resCreateLink.status !== 201 || !resCreateLink.data.link.code) {
      throw new Error(`Referral link generation failed: ${JSON.stringify(resCreateLink.data)}`);
    }
    const linkCode = resCreateLink.data.link.code;
    console.log(`✅ POST /api/referral-links link generated. Code: ${linkCode}`);

    // List links
    const resListLinks = await makeRequest("GET", "/api/referral-links", authHeaders);
    if (resListLinks.status !== 200 || resListLinks.data.links.length === 0) {
      throw new Error(`List links failed`);
    }
    console.log("✅ GET /api/referral-links listing success");

    // Click redirect route (public, no auth)
    const resRedirect = await makeRequest(
      "GET",
      `/r/${linkCode}?ref=${mockContact.id}`
    );
    // Express returns 302 for res.redirect
    if (resRedirect.status !== 302 || !resRedirect.headers.location.includes("ig.me")) {
      throw new Error(`Redirection failed. Got status ${resRedirect.status}, location: ${resRedirect.headers.location}`);
    }
    // Verify click_count incremented
    const updatedLink = mockDb.referral_links.find((l) => l.code === linkCode);
    if (!updatedLink || updatedLink.click_count !== 1) {
      throw new Error(`Referral link click count not incremented. Value: ${updatedLink?.click_count}`);
    }
    console.log("✅ GET /r/:code public redirect, click increment, and location mapping success");

    // Simulate Webhook delivery of referral payload
    const referralPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          messaging: [
            {
              sender: { id: "referred_customer_user_id" },
              recipient: { id: "page_insta_1" },
              timestamp: Date.now(),
              referral: {
                ref: `${mockContact.id}_${mockAutomation.id}`,
                source: "SHORTLINK",
                type: "OPEN_THREAD",
              },
            },
          ],
        },
      ],
    };

    const webhookBodyStr = JSON.stringify(referralPayload);
    const signature = generateSignatureHeader(webhookBodyStr);

    const resWebhook = await makeRequest(
      "POST",
      "/webhook/instagram",
      { "x-hub-signature-256": signature },
      webhookBodyStr
    );
    if (resWebhook.status !== 200) {
      throw new Error(`Referral webhook parsing failed with status: ${resWebhook.status}`);
    }

    // Yield CPU time to process the async handler in trigger.ts
    await sleep(200);

    // Verify referrer got +50 points (originally 120, now should be 170)
    const referrerScore = mockDb.gamification_scores.find((s) => s.contact_id === mockContact.id);
    if (!referrerScore || referrerScore.points !== 170) {
      throw new Error(`Expected referrer score to be 170, got: ${referrerScore?.points}`);
    }
    console.log("✅ Webhook Referral event parsed: awarded points (+50) to referrer successfully");

    // Verify referred contact is registered
    const referredContact = mockDb.contacts.find((c) => c.instagram_user_id === "referred_customer_user_id");
    if (!referredContact) {
      throw new Error(`Referred contact not registered in database.`);
    }

    // Verify referral record registered in db
    const referralRecord = mockDb.referrals.find((r) => r.referred_contact_id === referredContact.id);
    if (!referralRecord || referralRecord.referrer_contact_id !== mockContact.id) {
      throw new Error(`Referral registration invalid in referrals table`);
    }
    console.log("✅ Webhook Referral record stored correctly in database");

    // Verify target automation session launched for referred contact
    const session = mockDb.automation_sessions.find((s) => s.contact_id === referredContact.id);
    if (!session || session.automation_id !== mockAutomation.id) {
      throw new Error(`Referred contact session failed to trigger automatically`);
    }
    console.log("✅ Webhook Referral auto-launch target automation triggered and session started");


    // -----------------------------------------------------------
    // TEST CASE 5: Data Collection Flow (User Input Pause & Resumption)
    // -----------------------------------------------------------
    console.log("\n[Test 5] User Input Pause & Resumption Engine");

    const dataCollectionAutomation = {
      id: "auto_user_input_flow",
      user_id: userId,
      account_id: mockAccount.id,
      name: "Data Collection Flow",
      is_active: true,
      flow_data: {
        start_block_id: "block_collect_email",
        blocks: [
          {
            id: "block_collect_email",
            type: "user_input",
            data: {
              text: "Hi {{first_name}}! Please type your email address:",
              variable_name: "email",
              next_block_id: "block_input_success_msg",
            },
          },
          {
            id: "block_input_success_msg",
            type: "message",
            data: {
              text: "Thank you! We saved your email as: {{variables.email}}",
            },
          },
        ],
      },
    };
    mockDb.automations.push(dataCollectionAutomation);

    // Match keyword to trigger this automation
    const triggerRule = {
      id: "trig_collect_input",
      automation_id: dataCollectionAutomation.id,
      trigger_type: "direct_message",
      sensitivity: "exact_match",
      keywords: ["subscribe"],
    };
    mockDb.automation_triggers.push(triggerRule);

    // Post webhook message "subscribe"
    const inputTriggerPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          messaging: [
            {
              sender: { id: mockContact.instagram_user_id },
              recipient: { id: "page_insta_1" },
              timestamp: Date.now(),
              message: { text: "subscribe" },
            },
          ],
        },
      ],
    };

    const triggerBodyStr = JSON.stringify(inputTriggerPayload);
    const triggerSig = generateSignatureHeader(triggerBodyStr);

    await makeRequest(
      "POST",
      "/webhook/instagram",
      { "x-hub-signature-256": triggerSig },
      triggerBodyStr
    );

    await sleep(200);

    // Verify session paused at the user_input block
    const activeSession = mockDb.automation_sessions.find(
      (s) => s.contact_id === mockContact.id && s.automation_id === dataCollectionAutomation.id
    );
    if (!activeSession || activeSession.status !== "running" || activeSession.current_block_id !== "block_collect_email") {
      throw new Error(`Expected session paused at user_input block, got: ${JSON.stringify(activeSession)}`);
    }
    console.log("✅ User Input Block pauses interpreter execution and remains in running status");

    // Send reply via webhook: "bob@jones.com"
    const inputReplyPayload = {
      object: "instagram",
      entry: [
        {
          id: "page_insta_1",
          messaging: [
            {
              sender: { id: mockContact.instagram_user_id },
              recipient: { id: "page_insta_1" },
              timestamp: Date.now(),
              message: { text: "bob@jones.com" },
            },
          ],
        },
      ],
    };

    const replyBodyStr = JSON.stringify(inputReplyPayload);
    const replySig = generateSignatureHeader(replyBodyStr);

    await makeRequest(
      "POST",
      "/webhook/instagram",
      { "x-hub-signature-256": replySig },
      replyBodyStr
    );

    await sleep(200);

    // Verify variable "email" was captured
    const updatedContactBob = mockDb.contacts.find((c) => c.id === mockContact.id);
    if (!updatedContactBob || updatedContactBob.variables.email !== "bob@jones.com") {
      throw new Error(`Variable "email" was not captured correctly: ${JSON.stringify(updatedContactBob?.variables)}`);
    }
    console.log("✅ Webhook captures user input and saves it to variables table correctly");

    // Verify session completed
    const finalSession = mockDb.automation_sessions.find(
      (s) => s.id === activeSession.id
    );
    if (!finalSession || finalSession.status !== "completed") {
      throw new Error(`Session did not resume and complete: ${JSON.stringify(finalSession)}`);
    }
    console.log("✅ Session resumes successfully and completes visual builder path");


    // -----------------------------------------------------------
    // TEST CASE 6: Broadcasts Scheduling and Sequentially Sending
    // -----------------------------------------------------------
    console.log("\n[Test 6] Sequentially Rate-Limited Broadcast Engine");

    // Clean contacts, add multiple contacts for broadcast target
    mockDb.contacts = [];
    const bContacts = [
      {
        id: "bc_1",
        user_id: userId,
        account_id: mockAccount.id,
        instagram_user_id: "bc_user_1",
        username: "bc_john",
        full_name: "John Doe",
        created_at: new Date().toISOString(),
      },
      {
        id: "bc_2",
        user_id: userId,
        account_id: mockAccount.id,
        instagram_user_id: "bc_user_2",
        username: "bc_alice",
        full_name: "Alice Smith",
        created_at: new Date().toISOString(),
      },
    ];
    mockDb.contacts.push(...bContacts);

    // Create broadcast config
    const resCreateBroadcast = await makeRequest(
      "POST",
      "/api/broadcasts",
      authHeaders,
      JSON.stringify({
        account_id: mockAccount.id,
        name: "Weekly Announcement",
        message_text: "Don't miss our flash sale!",
      })
    );
    if (resCreateBroadcast.status !== 201 || resCreateBroadcast.data.broadcast.status !== "pending") {
      throw new Error(`Failed to create broadcast config: ${JSON.stringify(resCreateBroadcast.data)}`);
    }
    const broadcastId = resCreateBroadcast.data.broadcast.id;
    console.log("✅ POST /api/broadcasts configuration created in pending state");

    // Trigger broadcast send
    const resSendBroadcast = await makeRequest(
      "POST",
      `/api/broadcasts/${broadcastId}/send`,
      authHeaders
    );
    if (resSendBroadcast.status !== 200 || !resSendBroadcast.data.success) {
      throw new Error(`Failed to trigger broadcast: ${JSON.stringify(resSendBroadcast.data)}`);
    }
    console.log("✅ POST /api/broadcasts/:id/send broadcast transmission initiated");

    // Check stats (should be sending)
    await sleep(200);
    const resStats1 = await makeRequest("GET", `/api/broadcasts/${broadcastId}/stats`, authHeaders);
    if (resStats1.status !== 200 || resStats1.data.stats.status !== "sending") {
      throw new Error(`Broadcast status not updating to sending: ${JSON.stringify(resStats1.data)}`);
    }
    console.log("✅ GET /api/broadcasts/:id/stats reports 'sending' progress status");

    // Yield enough time for the sequential throttling worker (which uses 1s sleep between messages)
    // We have 2 contacts, so it requires 1 second sleep. Let's wait 1.5s
    await sleep(1500);

    const resStats2 = await makeRequest("GET", `/api/broadcasts/${broadcastId}/stats`, authHeaders);
    if (resStats2.status !== 200 || resStats2.data.stats.status !== "completed") {
      throw new Error(`Broadcast did not complete. Stats: ${JSON.stringify(resStats2.data)}`);
    }
    if (resStats2.data.stats.sent_count !== 2) {
      throw new Error(`Expected sent_count to be 2, got: ${resStats2.data.stats.sent_count}`);
    }
    console.log("✅ Sequential rate-limiter sent broadcast to all target contacts successfully");


    // -----------------------------------------------------------
    // TEST CASE 7: Analytics Summaries & Conversions
    // -----------------------------------------------------------
    console.log("\n[Test 7] Analytics Summaries & Conversion Endpoints");

    // Add conversions
    mockDb.conversions.push({
      id: "conv_1",
      contact_id: "bc_1",
      automation_id: mockAutomation.id,
      converted_at: new Date().toISOString(),
    });

    const resSummary = await makeRequest("GET", "/api/analytics/summary", authHeaders);
    if (resSummary.status !== 200 || resSummary.data.summary.contacts_count !== 2) {
      throw new Error(`Summary counts invalid: ${JSON.stringify(resSummary.data)}`);
    }
    console.log("✅ GET /api/analytics/summary returned correctly");

    const resGrowth = await makeRequest("GET", "/api/analytics/contacts", authHeaders);
    if (resGrowth.status !== 200 || resGrowth.data.contacts_growth.length === 0) {
      throw new Error(`Contacts daily growth error: ${JSON.stringify(resGrowth.data)}`);
    }
    console.log("✅ GET /api/analytics/contacts daily growth series returned correctly");

    const resPopularity = await makeRequest("GET", "/api/analytics/automations", authHeaders);
    if (resPopularity.status !== 200 || resPopularity.data.automations_stats.length === 0) {
      throw new Error(`Automation popularity analytics error: ${JSON.stringify(resPopularity.data)}`);
    }
    console.log("✅ GET /api/analytics/automations runs popularity analytics returned correctly");

    const resConversions = await makeRequest("GET", "/api/analytics/conversions", authHeaders);
    if (resConversions.status !== 200 || resConversions.data.total_conversions !== 1) {
      throw new Error(`Conversions analytics failure: ${JSON.stringify(resConversions.data)}`);
    }
    if (resConversions.data.conversions[0].contact_username !== "bc_john" || resConversions.data.conversions[0].automation_name !== "Promo Referral Flow") {
      throw new Error(`Conversions analytics enrichment failed: ${JSON.stringify(resConversions.data)}`);
    }
    console.log("✅ GET /api/analytics/conversions returned enriched conversion records correctly");


    // -----------------------------------------------------------
    // TEST CASE 8: Facebook Leadgen Webhook Qualification
    // -----------------------------------------------------------
    console.log("\n[Test 8] Facebook Leadgen Webhook Qualification");

    // Configure the mock account with Facebook Lead Handler settings
    const updatedAccount = mockDb.instagram_accounts.find((a) => a.id === mockAccount.id);
    if (updatedAccount) {
      updatedAccount.fb_agent_enabled = true;
      updatedAccount.fb_form_id = "form-1";
      updatedAccount.target_group_id = "sales";
      updatedAccount.fb_welcome_message = "Salom {{name}}! Biz tez orada siz bilan bog'lanamiz.";
      updatedAccount.fb_field_mappings = [
        { id: "map-1", metaField: "full_name", sendlyField: "name" },
        { id: "map-2", metaField: "phone_number", sendlyField: "phone" },
        { id: "map-3", metaField: "user_question", sendlyField: "message" },
      ];
      updatedAccount.fb_tags = ["Meta Lead", "AI Qualified"];
    }

    const leadgenPayload = {
      object: "page",
      entry: [
        {
          id: "page_insta_1",
          time: 1600000000,
          changes: [
            {
              field: "leadgen",
              value: {
                form_id: "form-1",
                leadgen_id: "lead_9999",
                page_id: "page_insta_1",
                created_time: 1600000000,
                field_data: [
                  { name: "full_name", values: ["Sardor Salimov"] },
                  { name: "phone_number", values: ["+998901234567"] },
                  { name: "user_question", values: ["Kurs narxi qancha? Chegirma bormi?"] },
                ],
              },
            },
          ],
        },
      ],
    };

    const leadgenBodyStr = JSON.stringify(leadgenPayload);
    const leadgenSig = generateSignatureHeader(leadgenBodyStr);

    const resLeadgenWebhook = await makeRequest(
      "POST",
      "/webhook/instagram",
      { "x-hub-signature-256": leadgenSig },
      leadgenBodyStr
    );

    if (resLeadgenWebhook.status !== 200 || !resLeadgenWebhook.data.success) {
      throw new Error(`Leadgen webhook trigger failed: status ${resLeadgenWebhook.status}`);
    }

    // Yield CPU time to process the async handler
    await sleep(200);

    // Verify contact creation and fields mapping
    const createdContact = mockDb.contacts.find((c) => c.instagram_user_id === "fb_lead_9999");
    if (!createdContact) {
      throw new Error("Facebook Lead contact not created in database");
    }

    if (createdContact.full_name !== "Sardor Salimov") {
      throw new Error(`Facebook Lead name mapping failed: expected 'Sardor Salimov', got '${createdContact.full_name}'`);
    }

    if (createdContact.variables.lead_phone !== "+998901234567") {
      throw new Error(`Facebook Lead phone mapping failed: expected '+998901234567', got '${createdContact.variables.lead_phone}'`);
    }

    // Verify tags were added (should include fb_tags and rule-based tags)
    if (!createdContact.tags.includes("Yuqori qiziqish") || !createdContact.tags.includes("Meta Lead")) {
      throw new Error(`Lead qualification tags missing: ${JSON.stringify(createdContact.tags)}`);
    }
    console.log("✅ Facebook Lead successfully ingested, mapped, and qualified in database");

    // Verify Welcome message was sent and logged
    const welcomeLog = mockDb.messages.find(
      (m) => m.contact_id === createdContact.id && m.direction === "outbound"
    );
    if (!welcomeLog || !welcomeLog.content.includes("Salom Sardor Salimov!")) {
      throw new Error(`Facebook Welcome message not logged correctly: ${JSON.stringify(welcomeLog)}`);
    }
    console.log("✅ Facebook Lead welcome message automatically sent and logged successfully");


    // -----------------------------------------------------------
    // TERMINATE AND SUCCESS REPORT
    // -----------------------------------------------------------
    console.log("\n=================================================");
    console.log("🎉 All advanced engine and REST API tests passed!");
    console.log("=================================================");

    server.close(() => {
      console.log("Test server stopped.");
      process.exit(0);
    });

  } catch (error) {
    console.error("\n❌ Test execution failed with error:", error);
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
