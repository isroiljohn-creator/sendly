import crypto from "crypto";
import { env } from "../config/env";

// Generate a stable 32-byte encryption key by hashing the ENCRYPTION_SECRET or JWT_SECRET as fallback
const rawSecret = process.env.ENCRYPTION_SECRET || env.JWT_SECRET;
const ENCRYPTION_KEY = crypto.createHash("sha256").update(rawSecret).digest();
const IV_LENGTH = 16; // AES block size is 16 bytes

/**
 * Encrypts a string using AES-256-CBC.
 * Returns the IV and encrypted text joined by a colon.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-CBC encrypted string.
 * Expects format: "iv_hex:encrypted_hex"
 */
export function decrypt(text: string): string {
  if (!text) return "";

  const parts = text.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format. Must be iv:ciphertext.");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");
  
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString("utf8");
}
