#!/usr/bin/env node

/**
 * Sendly Workspace MCP Server
 * Zero-dependency Model Context Protocol (MCP) server for Claude Desktop.
 */

const readline = require("readline");

// Config parameters from environment variables
const API_URL = process.env.SENDLY_API_URL || "http://localhost:3000";
const USER_ID = process.env.SENDLY_USER_ID || "";
const API_KEY = process.env.SENDLY_API_KEY || "";

if (!USER_ID && !API_KEY) {
  process.stderr.write("WARNING: Neither SENDLY_USER_ID nor SENDLY_API_KEY is configured in env.\n");
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

// Helper: Make HTTP request to Sendly API Bridge
async function callSendlyApi(toolName, args = {}) {
  try {
    const url = `${API_URL}/api/mcp/bridge`;
    const headers = {
      "Content-Type": "application/json",
      "x-user-id": USER_ID
    };
    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const payload = {
      tool: toolName,
      arguments: args,
      userId: USER_ID
    };

    // Use native Node.js fetch (available in Node.js 18+)
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (err) {
    process.stderr.write(`API Error: ${err.message}\n`);
    throw err;
  }
}

// Setup standard line reader on stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function writeResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function writeError(id, code, message) {
  writeResponse({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  });
}

// Handle incoming JSON-RPC requests
rl.on("line", async (line) => {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch (e) {
    writeError(null, -32700, "Parse error");
    return;
  }

  const { jsonrpc, id, method, params } = request;
  
  if (jsonrpc !== "2.0") {
    writeError(id, -32600, "Invalid Request");
    return;
  }

  try {
    switch (method) {
      case "initialize":
        writeResponse({
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
        });
        break;

      case "notifications/initialized":
        // No response required for notification
        break;

      case "tools/list":
        writeResponse({
          jsonrpc: "2.0",
          id,
          result: { tools }
        });
        break;

      case "tools/call": {
        const { name: toolName, arguments: args } = params || {};
        const matchedTool = tools.find(t => t.name === toolName);

        if (!matchedTool) {
          writeError(id, -32601, `Tool not found: ${toolName}`);
          break;
        }

        try {
          const apiResult = await callSendlyApi(toolName, args);
          writeResponse({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(apiResult, null, 2)
                }
              ]
            }
          });
        } catch (apiErr) {
          writeResponse({
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Failed to execute tool ${toolName}: ${apiErr.message}`
                }
              ]
            }
          });
        }
        break;
      }

      default:
        writeError(id, -32601, "Method not found");
        break;
    }
  } catch (err) {
    writeError(id, -32603, "Internal error: " + err.message);
  }
});
