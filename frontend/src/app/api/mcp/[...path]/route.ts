import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as pgdb from "@/lib/pgdb";

const DB_FILE = process.env.DB_FILE_PATH || path.join(process.cwd(), "db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (err) {
    console.error("Read DB failed in MCP catch-all:", err);
    return {};
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Write DB failed in MCP catch-all:", err);
    return false;
  }
}

const tools = [
  {
    name: "get_analytics",
    description: "Retrieve high-level business analytics, active channel counts, active chat thread metrics, and remaining AI credits.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "list_contacts",
    description: "Get the CRM database contacts and parsed lead profiles (emails, telephone numbers, company details).",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_chats",
    description: "Fetch active conversational chat threads (Telegram and Instagram) currently active on the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "Optional channel ID to filter conversations by."
        }
      }
    }
  },
  {
    name: "get_chat_history",
    description: "Get the message dialogue history for a specific customer chat ID within a channel.",
    inputSchema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "The ID of the active channel."
        },
        chatId: {
          type: "string",
          description: "The thread ID of the customer conversation."
        }
      },
      required: ["channelId", "chatId"]
    }
  },
  {
    name: "send_message",
    description: "Send an outbound reply message to a customer thread via Telegram or Instagram.",
    inputSchema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "The ID of the channel."
        },
        chatId: {
          type: "string",
          description: "The customer ID to deliver the message to."
        },
        text: {
          type: "string",
          description: "The text content of the message."
        }
      },
      required: ["channelId", "chatId", "text"]
    }
  }
];

// Active SSE sessions registry (stored in globalThis to avoid resets during hot-reloads)
const activeSessions = (globalThis as any).mcpSessions || new Map<string, {
  controller: ReadableStreamDefaultController;
  userId: string;
}>();
(globalThis as any).mcpSessions = activeSessions;

// Helper: Unified Tool Execution Dispatcher
async function executeTool(tool: string, args: any, userId: string): Promise<any> {
  const useRailway = pgdb.isConfigured();
  
  if (useRailway) {
    const context = await pgdb.getValue("global_settings_" + userId) || {};

    switch (tool) {
      case "get_analytics": {
        const credits = context.replai_ai_credits_data ? (typeof context.replai_ai_credits_data === "string" ? JSON.parse(context.replai_ai_credits_data) : context.replai_ai_credits_data) : { balance: 0 };
        const userChannels = context.replai_channels ? (typeof context.replai_channels === "string" ? JSON.parse(context.replai_channels) : context.replai_channels) : [];
        
        let totalChatsCount = 0;
        for (const ch of userChannels) {
          const list = context[`replai_chats_${ch.id}`];
          const parsed = list ? (typeof list === "string" ? JSON.parse(list) : list) : [];
          totalChatsCount += parsed.length;
        }

        return {
          creditsBalance: credits.balance,
          channelsCount: userChannels.length,
          activeChatsCount: totalChatsCount,
          platform: "Railway production mode"
        };
      }

      case "list_contacts": {
        const rawContacts = context.replai_contacts;
        const contacts = rawContacts ? (typeof rawContacts === "string" ? JSON.parse(rawContacts) : rawContacts) : [];
        return { contacts };
      }

      case "get_chats": {
        const channelId = args?.channelId;
        const userChannels = context.replai_channels ? (typeof context.replai_channels === "string" ? JSON.parse(context.replai_channels) : context.replai_channels) : [];
        
        const chats: Record<string, any> = {};
        for (const ch of userChannels) {
          if (channelId && ch.id !== channelId) continue;
          const chatKey = `replai_chats_${ch.id}`;
          chats[ch.id] = context[chatKey] ? (typeof context[chatKey] === "string" ? JSON.parse(context[chatKey]) : context[chatKey]) : [];
        }
        return { chats };
      }

      case "get_chat_history": {
        const { channelId, chatId } = args || {};
        if (!channelId || !chatId) {
          throw new Error("Missing parameters channelId or chatId");
        }
        const chatKey = `replai_chats_${channelId}`;
        const rawChats = context[chatKey];
        const chatsList = rawChats ? (typeof rawChats === "string" ? JSON.parse(rawChats) : rawChats) : [];
        const thread = chatsList.find((c: any) => c.id === String(chatId));
        return { thread: thread || null };
      }

      case "send_message": {
        const { channelId, chatId, text } = args || {};
        if (!channelId || !chatId || !text) {
          throw new Error("Missing parameters channelId, chatId, or text");
        }

        const userChannels = context.replai_channels ? (typeof context.replai_channels === "string" ? JSON.parse(context.replai_channels) : context.replai_channels) : [];
        const targetChannel = userChannels.find((c: any) => c.id === channelId);
        if (!targetChannel) throw new Error("Channel not found");

        const token = targetChannel.token;
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text })
        });

        if (!tgRes.ok) throw new Error("Telegram API failed to dispatch message");

        const chatKey = `replai_chats_${channelId}`;
        const rawChats = context[chatKey];
        const chatsList = rawChats ? (typeof rawChats === "string" ? JSON.parse(rawChats) : rawChats) : [];
        let thread = chatsList.find((c: any) => c.id === String(chatId));
        if (thread) {
          thread.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: "agent",
            text,
            timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
          });
          thread.lastMessage = text;
          thread.unread = false;

          context[chatKey] = chatsList;
          await pgdb.setValue("global_settings_" + userId, context);
        }

        return { success: true };
      }

      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  } else {
    // Local File DB Mode
    const dbData = readDb();
    if (!dbData.userData) dbData.userData = {};
    const context = dbData.userData[userId] || {};

    switch (tool) {
      case "get_analytics": {
        const credits = context.replai_ai_credits_data ? JSON.parse(context.replai_ai_credits_data) : { balance: 0 };
        const userChannels = context.replai_channels ? JSON.parse(context.replai_channels) : [];
        
        let totalChatsCount = 0;
        for (const ch of userChannels) {
          const list = context[`replai_chats_${ch.id}`];
          const parsed = list ? JSON.parse(list) : [];
          totalChatsCount += parsed.length;
        }

        return {
          creditsBalance: credits.balance,
          channelsCount: userChannels.length,
          activeChatsCount: totalChatsCount,
          platform: "Local file database mode"
        };
      }

      case "list_contacts": {
        const rawContacts = context.replai_contacts;
        const contacts = rawContacts ? JSON.parse(rawContacts) : [];
        return { contacts };
      }

      case "get_chats": {
        const channelId = args?.channelId;
        const userChannels = context.replai_channels ? JSON.parse(context.replai_channels) : [];
        
        const chats: Record<string, any> = {};
        for (const ch of userChannels) {
          if (channelId && ch.id !== channelId) continue;
          const chatKey = `replai_chats_${ch.id}`;
          chats[ch.id] = context[chatKey] ? JSON.parse(context[chatKey]) : [];
        }
        return { chats };
      }

      case "get_chat_history": {
        const { channelId, chatId } = args || {};
        if (!channelId || !chatId) {
          throw new Error("Missing parameters channelId or chatId");
        }
        const chatKey = `replai_chats_${channelId}`;
        const rawChats = context[chatKey];
        const chatsList = rawChats ? JSON.parse(rawChats) : [];
        const thread = chatsList.find((c: any) => c.id === String(chatId));
        return { thread: thread || null };
      }

      case "send_message": {
        const { channelId, chatId, text } = args || {};
        if (!channelId || !chatId || !text) {
          throw new Error("Missing parameters channelId, chatId, or text");
        }

        const userChannels = context.replai_channels ? JSON.parse(context.replai_channels) : [];
        const targetChannel = userChannels.find((c: any) => c.id === channelId);
        if (!targetChannel) throw new Error("Channel not found");

        const token = targetChannel.token;
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text })
        });

        if (!tgRes.ok) throw new Error("Telegram API failed to dispatch message");

        const chatKey = `replai_chats_${channelId}`;
        const rawChats = context[chatKey];
        const chatsList = rawChats ? JSON.parse(rawChats) : [];
        let thread = chatsList.find((c: any) => c.id === String(chatId));
        if (thread) {
          thread.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: "agent",
            text,
            timestamp: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
          });
          thread.lastMessage = text;
          thread.unread = false;

          context[chatKey] = JSON.stringify(chatsList);
          writeDb(dbData);
        }

        return { success: true };
      }

      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }
}

// 1. Generate OpenAPI specification JSON
function getOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.0.0",
    info: {
      title: "Sendly Workspace API",
      description: "Model Context Protocol & OpenAPI gateway to manage Sendly chatbot, CRM contacts, chats, and business analytics.",
      version: "1.0.0"
    },
    servers: [
      {
        url: baseUrl,
        description: "Hosted Sendly API Gateway"
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Your Sendly Workspace user ID or secret API token"
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    paths: {
      "/api/mcp/analytics": {
        get: {
          summary: "Get business analytics",
          description: "Retrieve high-level business analytics, active channel counts, active chat thread metrics, and remaining AI credits.",
          responses: {
            "200": {
              description: "Successful response"
            }
          }
        }
      },
      "/api/mcp/contacts": {
        get: {
          summary: "List CRM contacts",
          description: "Get the CRM database contacts and parsed lead profiles (emails, telephone numbers, company details).",
          responses: {
            "200": {
              description: "Successful response"
            }
          }
        }
      },
      "/api/mcp/chats": {
        get: {
          summary: "Get active chat threads",
          description: "Fetch active conversational chat threads (Telegram and Instagram) currently active on the workspace.",
          parameters: [
            {
              name: "channelId",
              in: "query",
              required: false,
              schema: {
                type: "string"
              },
              description: "Optional channel ID to filter conversations by"
            }
          ],
          responses: {
            "200": {
              description: "Successful response"
            }
          }
        }
      },
      "/api/mcp/chat-history": {
        get: {
          summary: "Get message history",
          description: "Get the message dialogue history for a specific customer chat ID within a channel.",
          parameters: [
            {
              name: "channelId",
              in: "query",
              required: true,
              schema: {
                type: "string"
              }
            },
            {
              name: "chatId",
              in: "query",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "200": {
              description: "Successful response"
            }
          }
        }
      },
      "/api/mcp/send-message": {
        post: {
          summary: "Send outbound message",
          description: "Send an outbound reply message to a customer thread via Telegram or Instagram.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    channelId: {
                      type: "string"
                    },
                    chatId: {
                      type: "string"
                    },
                    text: {
                      type: "string"
                    }
                  },
                  required: ["channelId", "chatId", "text"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Successful response"
            }
          }
        }
      }
    }
  };
}

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, "GET");
}

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, "POST");
}

async function handleRequest(request: Request, params: { path: string[] }, method: "GET" | "POST") {
  const urlObj = new URL(request.url);
  const routePath = params.path.join("/");

  // 1. OpenAPI schema route (Public, does not require authentication)
  if (routePath === "openapi.json") {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return NextResponse.json(getOpenApiSpec(baseUrl));
  }

  // 2. Server-Sent Events (SSE) Transport Handler
  if (routePath === "sse") {
    const sessionId = Math.random().toString(36).substring(2, 15);
    
    const apiKey = request.headers.get("x-api-key") || 
                   urlObj.searchParams.get("apiKey") ||
                   urlObj.searchParams.get("x-api-key") ||
                   request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
                   "00000000-0000-0000-0000-000000000000";

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        // Register this SSE controller
        activeSessions.set(sessionId, { controller, userId: apiKey });
        
        // Push endpoint address
        const endpointUrl = `/api/mcp/message?sessionId=${sessionId}&apiKey=${apiKey}`;
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));
        
        // 15 seconds Keep-Alive to maintain open client streams
        const keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`:\n\n`));
          } catch (e) {
            clearInterval(keepAliveInterval);
          }
        }, 15000);
        
        (controller as any)._keepAliveInterval = keepAliveInterval;
      },
      cancel() {
        const session = activeSessions.get(sessionId);
        if (session) {
          if ((session.controller as any)._keepAliveInterval) {
            clearInterval((session.controller as any)._keepAliveInterval);
          }
          activeSessions.delete(sessionId);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  }

  // 3. SSE Client Message Inbox (POST gateway for remote sessions)
  if (routePath === "message") {
    if (method !== "POST") {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }
    const sessionId = urlObj.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    
    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
    }

    try {
      const body = await request.json();
      const { jsonrpc, id, method: reqMethod, params } = body;

      if (jsonrpc !== "2.0") {
        const errPayload = { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } };
        const encoder = new TextEncoder();
        session.controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(errPayload)}\n\n`));
        return new Response("Accepted", { status: 202 });
      }

      if (reqMethod === "initialize") {
        const responsePayload = {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            serverInfo: {
              name: "sendly-workspace-mcp",
              version: "1.0.0"
            }
          }
        };
        const encoder = new TextEncoder();
        session.controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`));
        return new Response("Accepted", { status: 202 });
      }

      if (reqMethod === "notifications/initialized") {
        return new Response("Accepted", { status: 202 });
      }

      if (reqMethod === "tools/list") {
        const responsePayload = {
          jsonrpc: "2.0",
          id,
          result: { tools }
        };
        const encoder = new TextEncoder();
        session.controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`));
        return new Response("Accepted", { status: 202 });
      }

      if (reqMethod === "tools/call") {
        const { name: toolName, arguments: args } = params || {};
        const matchedTool = tools.find(t => t.name === toolName);

        if (!matchedTool) {
          const responsePayload = {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Tool not found: ${toolName}` }
          };
          const encoder = new TextEncoder();
          session.controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`));
          return new Response("Accepted", { status: 202 });
        }

        try {
          const result = await executeTool(toolName, args, session.userId);
          const responsePayload = {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };
          const encoder = new TextEncoder();
          session.controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`));
        } catch (err: any) {
          const responsePayload = {
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Failed to execute tool ${toolName}: ${err.message}`
                }
              ]
            }
          };
          const encoder = new TextEncoder();
          session.controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`));
        }
        return new Response("Accepted", { status: 202 });
      }

      // Default error for unhandled method
      const errPayload = {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" }
      };
      const encoder = new TextEncoder();
      session.controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(errPayload)}\n\n`));
    } catch (e: any) {
      console.error("[SSE Message processing exception]:", e);
    }
    return new Response("Accepted", { status: 202 });
  }

  // 4. REST Endpoints Authentication: Validate x-api-key, Authorization header, or query parameters
  const apiKey = request.headers.get("x-api-key") || 
                 request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
                 urlObj.searchParams.get("apiKey") ||
                 "00000000-0000-0000-0000-000000000000";

  const userId = apiKey;

  // 5. REST Route Handlers
  try {
    switch (routePath) {
      case "analytics": {
        const result = await executeTool("get_analytics", {}, userId);
        return NextResponse.json(result);
      }
      case "contacts": {
        const result = await executeTool("list_contacts", {}, userId);
        return NextResponse.json(result);
      }
      case "chats": {
        const channelId = urlObj.searchParams.get("channelId");
        const result = await executeTool("get_chats", { channelId }, userId);
        return NextResponse.json(result);
      }
      case "chat-history": {
        const channelId = urlObj.searchParams.get("channelId");
        const chatId = urlObj.searchParams.get("chatId");
        const result = await executeTool("get_chat_history", { channelId, chatId }, userId);
        return NextResponse.json(result);
      }
      case "send-message": {
        if (method !== "POST") return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
        const body = await request.json();
        const { channelId, chatId, text } = body || {};
        const result = await executeTool("send_message", { channelId, chatId, text }, userId);
        return NextResponse.json(result);
      }
      case "bridge": {
        if (method !== "POST") return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
        const body = await request.json();
        const { tool, arguments: args } = body;
        const result = await executeTool(tool, args, userId);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
