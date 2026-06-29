import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { supabase } from "../config/db";

export interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

/**
 * Validates Meta Graph API webhook signatures using HMAC-SHA256
 */
export async function verifyWebhookSignature(req: RequestWithRawBody, res: Response, next: NextFunction) {
  try {
    const signatureHeader = req.headers["x-hub-signature-256"] as string;
    
    if (!signatureHeader) {
      console.warn("[verifyWebhookSignature] Signature header x-hub-signature-256 is missing.");
      return res.status(403).json({ error: "Signature header x-hub-signature-256 is missing." });
    }

    const parts = signatureHeader.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") {
      console.warn("[verifyWebhookSignature] Invalid signature format:", signatureHeader);
      return res.status(403).json({ error: "Invalid signature format. Expected sha256=<signature_hash>." });
    }

    const receivedHash = parts[1];
    const rawBodyPayload = req.rawBody || Buffer.from("");

    // Try default App Secret first
    const defaultExpectedHash = crypto
      .createHmac("sha256", env.META_APP_SECRET)
      .update(rawBodyPayload)
      .digest("hex");

    const receivedHashBuffer = Buffer.from(receivedHash, "utf8");
    const defaultExpectedHashBuffer = Buffer.from(defaultExpectedHash, "utf8");

    if (
      receivedHashBuffer.length === defaultExpectedHashBuffer.length &&
      crypto.timingSafeEqual(receivedHashBuffer, defaultExpectedHashBuffer)
    ) {
      console.log("[verifyWebhookSignature] Signature verified successfully using default App Secret.");
      return next();
    }

    // If default fails, fetch all active custom Meta app secrets and try them
    try {
      const { data: customAccounts } = await supabase
        .from("instagram_accounts")
        .select("username, custom_meta_app_secret")
        .eq("is_custom_meta", true)
        .eq("is_active", true);

      if (customAccounts && customAccounts.length > 0) {
        for (const acct of customAccounts) {
          if (acct.custom_meta_app_secret) {
            const customExpectedHash = crypto
              .createHmac("sha256", acct.custom_meta_app_secret)
              .update(rawBodyPayload)
              .digest("hex");

            const customExpectedHashBuffer = Buffer.from(customExpectedHash, "utf8");

            if (
              receivedHashBuffer.length === customExpectedHashBuffer.length &&
              crypto.timingSafeEqual(receivedHashBuffer, customExpectedHashBuffer)
            ) {
              console.log(`[verifyWebhookSignature] Signature verified successfully using custom App Secret for ${acct.username}.`);
              return next();
            }
          }
        }
      }
    } catch (dbErr: any) {
      console.error("[verifyWebhookSignature] DB lookup for custom secrets failed:", dbErr.message);
    }

    console.warn(`[verifyWebhookSignature] Signature verification failed. Received hash: ${receivedHash}`);
    return res.status(403).json({ error: "Signature verification failed. Payload signature mismatch." });
  } catch (err) {
    return next(err);
  }
}
