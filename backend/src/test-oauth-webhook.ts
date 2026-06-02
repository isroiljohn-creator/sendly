import jwt from "jsonwebtoken";
import http from "http";
import crypto from "crypto";
import app from "./app";
import { env } from "./config/env";
import { encrypt, decrypt } from "./utils/crypto";
import { supabase } from "./config/db";

// -------------------------------------------------------------
// 1. Database Mocking Setup
// -------------------------------------------------------------
const mockDb = {
  instagram_accounts: [] as any[],
  contacts: [] as any[],
  messages: [] as any[],
  automations: [] as any[],
  automation_triggers: [] as any[],
  automation_sessions: [] as any[],
  variables: [] as any[],
  tags: [] as any[],
  gamification_scores: [] as any[],
  referral_links: [] as any[],
  referrals: [] as any[],
  broadcasts: [] as any[],
  conversions: [] as any[],
};

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
        const list = (mockDb as any)[table];
        if (list) {
          list.push(newRecord);
        }
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
        if (tableData) {
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
              if (tableData) {
                for (const item of listToDelete) {
                  const idx = tableData.findIndex((x: any) => x.id === item.id);
                  if (idx !== -1) {
                    tableData.splice(idx, 1);
                  }
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

    // Attach dependencies manually if query has nested targets
    if (table === "automations") {
      list = list.map((item) => {
        const triggers = mockDb.automation_triggers ? mockDb.automation_triggers.filter((t: any) => t.automation_id === item.id) : [];
        return { ...item, automation_triggers: triggers };
      });
    } else if (table === "gamification_scores") {
      list = list.map((item) => {
        const contactRec = mockDb.contacts.find((c: any) => c.id === item.contact_id);
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
          if (table === "instagram_accounts" && filter.col === "is_active" && filter.val === true) {
            return item.is_active !== false;
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

supabase.from = mockFrom as any;

// Mock global fetch for Meta OAuth Graph API calls
const mockFetch = async (url: string, options?: any) => {
  // Handle Meta Graph API mock responses specifically
  if (url.includes("/oauth/access_token")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "mock_page_access_token_12345",
      }),
      text: async () => "ok",
    } as any;
  }
  if (url.includes("/me/accounts")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: "page_12345",
            name: "Mock Facebook Page",
            access_token: "mock_page_access_token_12345",
          }
        ]
      }),
      text: async () => "ok",
    } as any;
  }
  if (url.includes("/page_12345")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        instagram_business_account: {
          id: "ig_business_12345",
        },
        access_token: "mock_page_access_token_12345",
      }),
      text: async () => "ok",
    } as any;
  }
  if (url.includes("/ig_business_12345")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        username: "mock_instagram_handle",
        profile_picture_url: "https://mock.url/pic.jpg",
      }),
      text: async () => "ok",
    } as any;
  }
  if (url.includes("/subscribed_apps")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => "ok",
    } as any;
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
    text: async () => "ok",
  } as any;
};

Object.defineProperty(globalThis, "fetch", {
  value: mockFetch,
  writable: true,
  configurable: true,
});
Object.defineProperty(global, "fetch", {
  value: mockFetch,
  writable: true,
  configurable: true,
});

// -------------------------------------------------------------
// 2. HTTP Helper functions
// -------------------------------------------------------------
const port = 4002;
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

// -------------------------------------------------------------
// 3. Test Runner
// -------------------------------------------------------------
async function runTests() {
  console.log("=================================================");
  console.log("Starting Phase 2 Integration Tests...");
  console.log("=================================================");

  // 1. Encryption Utility Tests
  console.log("\n[Test 1] Crypto Token Encryption & Decryption");
  const originalToken = "eaab_instagram_page_token_abc_123_xyz";
  const encrypted = encrypt(originalToken);
  console.log(`- Encrypted: ${encrypted}`);
  if (!encrypted || !encrypted.includes(":")) {
    throw new Error("Encryption failed: encrypted string does not contain separator.");
  }

  const decrypted = decrypt(encrypted);
  console.log(`- Decrypted: ${decrypted}`);
  if (decrypted !== originalToken) {
    throw new Error("Decryption failed: decrypted token does not match original.");
  }
  
  // Test invalid input format
  try {
    decrypt("invalid_string_no_colon");
    throw new Error("Encryption test failed: should have thrown on invalid format.");
  } catch (err: any) {
    console.log(`- Correctly rejected invalid ciphertext format: "${err.message}"`);
  }
  console.log("✅ Crypto test passed.");

  // Start the server to test routes
  server = app.listen(port);
  console.log(`\nTest server running on port ${port}`);

  try {
    // 2. OAuth Start Route Test
    console.log("\n[Test 2] OAuth Start Route");
    
    // Test 2.1: Without auth token
    const o1 = await makeRequest("GET", "/oauth/instagram/start");
    if (o1.status !== 401) {
      throw new Error(`OAuth start without token should return 401, got ${o1.status}`);
    }
    console.log("- Correctly rejected unauthenticated request to /start with 401.");

    // Test 2.2: With auth token in authorization header
    const mockUserId = "c430a6f2-bfd1-417d-8153-f725a397cd9a";
    const userJwt = jwt.sign({ user_id: mockUserId }, env.JWT_SECRET, { expiresIn: "1h" });
    const o2 = await makeRequest("GET", "/oauth/instagram/start", {
      Authorization: `Bearer ${userJwt}`,
    });

    if (o2.status !== 302) {
      throw new Error(`OAuth start should redirect with 302, got ${o2.status}`);
    }

    const redirectLocation = o2.headers.location;
    console.log(`- Redirect location: ${redirectLocation}`);
    if (!redirectLocation || !redirectLocation.includes("facebook.com")) {
      throw new Error("Should redirect to Facebook dialog page.");
    }

    // Extract state parameter from redirect URL
    const stateParam = new URL(redirectLocation).searchParams.get("state");
    if (!stateParam) {
      throw new Error("OAuth redirect is missing state parameter.");
    }
    console.log(`- Extracted state JWT: ${stateParam}`);

    // Decode state parameter to verify CSRF validation
    const stateDecoded = jwt.verify(stateParam, env.JWT_SECRET) as any;
    if (stateDecoded.user_id !== mockUserId) {
      throw new Error(`State JWT does not contain correct user ID: expected ${mockUserId}, got ${stateDecoded.user_id}`);
    }
    console.log("✅ OAuth start test passed.");

    // 3. OAuth Callback Route Test
    console.log("\n[Test 3] OAuth Callback Route (Mock Mode)");

    // Test 3.1: Without state and code parameters
    const c1 = await makeRequest("GET", "/oauth/instagram/callback");
    if (c1.status !== 400) {
      throw new Error(`OAuth callback missing params should return 400, got ${c1.status}`);
    }
    console.log("- Correctly rejected missing state/code with 400.");

    const invalidState = "invalid_state_token";
    const c2 = await makeRequest("GET", `/oauth/instagram/callback?code=mock_code&state=${invalidState}`);
    const c2Body = typeof c2.data === "string" ? c2.data : JSON.stringify(c2.data || "");
    if (c2.status !== 400 || !c2Body.includes("Xavfsizlik")) {
      throw new Error(`OAuth callback with invalid state should return 400, got ${c2.status} (${JSON.stringify(c2.data)})`);
    }
    console.log("- Correctly rejected invalid state JWT with 400.");

    // Test 3.3: Successful OAuth Callback (Mock Mode triggered by META_APP_ID = "123456789")
    const c3 = await makeRequest("GET", `/oauth/instagram/callback?code=mock_code&state=${stateParam}`);
    const c3Body = typeof c3.data === "string" ? c3.data : JSON.stringify(c3.data || "");
    if (c3.status !== 200 || !c3Body.includes("Muvaffaqiyatli")) {
      throw new Error(`OAuth callback mock run failed: status ${c3.status}, data ${JSON.stringify(c3.data)}`);
    }
    console.log("- Successful mock exchange callback received 200 OK.");
    console.log("- Response accounts:", JSON.stringify(c3.data.accounts));

    // Verify DB insertion
    const savedAccount = mockDb.instagram_accounts.find((a: any) => a.instagram_page_id === "page_12345");
    if (!savedAccount) {
      throw new Error("OAuth callback did not insert page_12345 into mock DB.");
    }
    console.log(`- Account saved in database: ID ${savedAccount.id}, Username: ${savedAccount.username}`);

    // Verify token was stored ENCRYPTED in DB
    const decryptedStoredToken = decrypt(savedAccount.access_token);
    if (decryptedStoredToken !== "mock_page_access_token_12345") {
      throw new Error("Stored access token does not decrypt to the original mock page access token.");
    }
    console.log("- Verified that the page access token is encrypted in DB and decrypts correctly.");
    console.log("✅ OAuth callback test passed.");

    // 4. Webhook Verification GET Test
    console.log("\n[Test 4] Webhook verification (GET /webhook/instagram)");

    // Test 4.1: Correct token
    const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN;
    const challenge = "challenge_text_123";
    const w1 = await makeRequest("GET", `/webhook/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`);
    if (w1.status !== 200 || w1.data !== challenge) {
      throw new Error(`GET Webhook verify failed: status ${w1.status}, data: ${w1.data}`);
    }
    console.log("- GET Webhook verify returned 200 and matches challenge.");

    // Test 4.2: Incorrect token
    const w2 = await makeRequest("GET", `/webhook/instagram?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=${challenge}`);
    if (w2.status !== 403) {
      throw new Error(`GET Webhook verify with incorrect token should return 403, got ${w2.status}`);
    }
    console.log("- GET Webhook verify with wrong token rejected with 403.");
    console.log("✅ Webhook GET verification test passed.");

    // 5. Webhook Event Processing POST Tests
    console.log("\n[Test 5] Webhook event processing (POST /webhook/instagram)");

    // Test 5.1: Missing signature header
    const p1 = await makeRequest("POST", "/webhook/instagram", {}, JSON.stringify({}));
    if (p1.status !== 403) {
      throw new Error(`POST Webhook without signature header should return 403, got ${p1.status}`);
    }
    console.log("- Webhook POST without signature rejected with 403.");

    // Test 5.2: Invalid signature hash
    const p2 = await makeRequest("POST", "/webhook/instagram", {
      "X-Hub-Signature-256": "sha256=invalid_hash_value"
    }, JSON.stringify({}));
    if (p2.status !== 403) {
      throw new Error(`POST Webhook with invalid signature should return 403, got ${p2.status}`);
    }
    console.log("- Webhook POST with invalid signature rejected with 403.");

    // Test 5.3: Valid signature and message processing
    const generateSignatureHeader = (bodyStr: string) => {
      const hash = crypto
        .createHmac("sha256", env.META_APP_SECRET)
        .update(bodyStr)
        .digest("hex");
      return `sha256=${hash}`;
    };

    // Construct mock webhook message body
    const mockMessageBody = {
      object: "instagram",
      entry: [
        {
          id: "page_12345", // Matches the page.id from OAuth Mock
          time: 1600000000,
          messaging: [
            {
              sender: { id: "sender_user_999" },
              recipient: { id: "page_12345" },
              timestamp: 1600000000000,
              message: {
                mid: "m_123456",
                text: "hello bot! How are you?"
              }
            }
          ]
        }
      ]
    };
    
    const bodyStr = JSON.stringify(mockMessageBody);
    const signatureHeader = generateSignatureHeader(bodyStr);

    const p3 = await makeRequest("POST", "/webhook/instagram", {
      "X-Hub-Signature-256": signatureHeader
    }, bodyStr);

    if (p3.status !== 200 || !p3.data.success) {
      throw new Error(`POST Webhook message failed: status ${p3.status}, data: ${JSON.stringify(p3.data)}`);
    }
    console.log("- Webhook POST with correct signature accepted with 200 OK.");

    // Test 5.4: Test Comment Event Webhook
    const mockCommentBody = {
      object: "instagram",
      entry: [
        {
          id: "page_12345",
          time: 1600000000,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_id_777",
                text: "Awesome post!",
                media: { id: "media_id_888" },
                from: { id: "user_commenter_222", username: "insta_fan" }
              }
            }
          ]
        }
      ]
    };

    const commentBodyStr = JSON.stringify(mockCommentBody);
    const commentSignatureHeader = generateSignatureHeader(commentBodyStr);

    const p4 = await makeRequest("POST", "/webhook/instagram", {
      "X-Hub-Signature-256": commentSignatureHeader
    }, commentBodyStr);

    if (p4.status !== 200 || !p4.data.success) {
      throw new Error(`POST Webhook comment failed: status ${p4.status}, data: ${JSON.stringify(p4.data)}`);
    }
    console.log("- Webhook POST comment accepted with 200 OK.");

    // Test 5.5: Test Story Reply Webhook
    const mockStoryReplyBody = {
      object: "instagram",
      entry: [
        {
          id: "page_12345",
          time: 1600000000,
          messaging: [
            {
              sender: { id: "sender_user_999" },
              recipient: { id: "page_12345" },
              timestamp: 1600000000000,
              message: {
                mid: "m_story_reply",
                text: "Love this story! 🔥",
                reply_to: {
                  story: {
                    id: "story_999_id",
                    url: "https://instagram.com/story/..."
                  }
                }
              }
            }
          ]
        }
      ]
    };

    const storyReplyBodyStr = JSON.stringify(mockStoryReplyBody);
    const storyReplySignatureHeader = generateSignatureHeader(storyReplyBodyStr);

    const p5 = await makeRequest("POST", "/webhook/instagram", {
      "X-Hub-Signature-256": storyReplySignatureHeader
    }, storyReplyBodyStr);

    if (p5.status !== 200 || !p5.data.success) {
      throw new Error(`POST Webhook story reply failed: status ${p5.status}, data: ${JSON.stringify(p5.data)}`);
    }
    console.log("- Webhook POST story reply accepted with 200 OK.");

    console.log("\n=================================================");
    console.log("🎉 All Phase 2 Integration Tests Passed Successfully!");
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
