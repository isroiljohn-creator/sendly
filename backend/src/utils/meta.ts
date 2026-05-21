import { env } from "../config/env";
import { decrypt } from "./crypto";

export interface SendMessageOptions {
  recipientId: string;
  text?: string;
  buttons?: Array<{
    type: "action" | "link";
    text: string;
    url?: string;
    next_block_id?: string;
  }>;
  attachments?: Array<{
    type: "image" | "video" | "audio" | "document";
    url: string;
  }>;
  commentId?: string; // If present, send as private reply to this comment ID
}

/**
 * Sends a message via the Meta Graph API to an Instagram user.
 * Supports Mock Mode if env.META_APP_ID = "123456789"
 * Decrypts the page token automatically if it starts with an encrypted prefix (contains ":").
 */
export async function sendInstagramMessage(
  pageAccessToken: string,
  options: SendMessageOptions
): Promise<{ messageId: string; success: boolean }> {
  // 1. Decrypt token if encrypted
  let token = pageAccessToken;
  if (pageAccessToken && pageAccessToken.includes(":")) {
    try {
      token = decrypt(pageAccessToken);
    } catch (err) {
      console.error("[Meta API] Failed to decrypt access token, using original string:", err);
    }
  }

  const { recipientId, text, buttons, attachments, commentId } = options;

  // Determine recipient target
  const recipientPayload = commentId
    ? { comment_id: commentId }
    : { id: recipientId };

  // Helper to compile Meta message payloads
  const payloads: any[] = [];

  // If there are attachments, prepare separate attachment payloads
  if (attachments && attachments.length > 0) {
    for (const attach of attachments) {
      // Map document type to file in Meta Graph API
      const metaType = attach.type === "document" ? "file" : attach.type;
      payloads.push({
        recipient: recipientPayload,
        message: {
          attachment: {
            type: metaType,
            payload: {
              url: attach.url,
              is_reusable: true,
            },
          },
        },
      });
    }
  }

  // Handle message body (text and buttons)
  if (text) {
    if (buttons && buttons.length > 0) {
      // If we have buttons, we can represent them as Quick Replies or Generic Template
      // Quick Replies are cleaner for simple button taps; Generic templates support link buttons.
      // If any button is a 'link', we MUST use the Generic Template since quick replies don't support external URLs in Meta.
      const hasLinkButton = buttons.some((btn) => btn.type === "link");

      if (hasLinkButton) {
        // Generic Template
        const metaButtons = buttons.map((btn) => {
          if (btn.type === "link") {
            return {
              type: "web_url",
              url: btn.url || "",
              title: btn.text,
            };
          } else {
            return {
              type: "postback",
              title: btn.text,
              payload: btn.next_block_id || "btn_action",
            };
          }
        });

        payloads.push({
          recipient: recipientPayload,
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: [
                  {
                    title: text.substring(0, 80), // Meta limit is 80 chars for generic template title
                    subtitle: "Instagram Automation",
                    buttons: metaButtons.slice(0, 3), // Meta generic template supports up to 3 buttons
                  },
                ],
              },
            },
          },
        });
      } else {
        // Quick Replies (ideal for action/flow navigation buttons)
        const quickReplies = buttons.map((btn) => ({
          content_type: "text",
          title: btn.text.substring(0, 20), // Meta quick reply title limit is 20 chars
          payload: btn.next_block_id || "btn_action",
        }));

        payloads.push({
          recipient: recipientPayload,
          message: {
            text,
            quick_replies: quickReplies.slice(0, 13), // Meta supports up to 13 quick replies
          },
        });
      }
    } else {
      // Plain text message
      payloads.push({
        recipient: recipientPayload,
        message: {
          text,
        },
      });
    }
  }

  // Ensure we have at least one payload to send
  if (payloads.length === 0) {
    console.warn("[Meta API] Warning: Send message request had no content.");
    return { messageId: "empty_payload", success: false };
  }

  let finalMessageId = "mock_mid_" + Math.floor(Math.random() * 1000000);
  let overallSuccess = true;

  // Dispatch payloads
  for (const payload of payloads) {
    if (env.META_APP_ID === "123456789") {
      console.log(`[Meta API Mock] Outbound message to ${recipientId}:`, JSON.stringify(payload, null, 2));
    } else {
      const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${encodeURIComponent(token)}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Meta API] Send message failed. HTTP ${response.status}: ${errText}`);
          overallSuccess = false;
          continue;
        }

        const data = await response.json();
        if (data.message_id) {
          finalMessageId = data.message_id;
        }
      } catch (err) {
        console.error("[Meta API] Network error when sending message:", err);
        overallSuccess = false;
      }
    }
  }

  return {
    messageId: finalMessageId,
    success: overallSuccess,
  };
}
