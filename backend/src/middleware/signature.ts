import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";

export interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

/**
 * Validates Meta Graph API webhook signatures using HMAC-SHA256
 */
export function verifyWebhookSignature(req: RequestWithRawBody, res: Response, next: NextFunction) {
  const signatureHeader = req.headers["x-hub-signature-256"] as string;
  
  if (!signatureHeader) {
    return res.status(403).json({ error: "Signature header x-hub-signature-256 is missing." });
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return res.status(403).json({ error: "Invalid signature format. Expected sha256=<signature_hash>." });
  }

  const receivedHash = parts[1];
  const rawBodyPayload = req.rawBody || Buffer.from("");

  const expectedHash = crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(rawBodyPayload)
    .digest("hex");

  const receivedHashBuffer = Buffer.from(receivedHash, "utf8");
  const expectedHashBuffer = Buffer.from(expectedHash, "utf8");

  if (
    receivedHashBuffer.length !== expectedHashBuffer.length ||
    !crypto.timingSafeEqual(receivedHashBuffer, expectedHashBuffer)
  ) {
    return res.status(403).json({ error: "Signature verification failed. Payload signature mismatch." });
  }

  return next();
}
