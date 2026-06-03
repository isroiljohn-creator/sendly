import crypto from "crypto";
import { env } from "../config/env";

// Generate a stable 32-byte encryption key by hashing the ENCRYPTION_SECRET or JWT_SECRET as fallback
const rawSecret = process.env.ENCRYPTION_SECRET || env.JWT_SECRET;
const ENCRYPTION_KEY = crypto.createHash("sha256").update(rawSecret).digest();
const IV_LENGTH_GCM = 12; // GCM recommended IV size is 12 bytes
const IV_LENGTH_CBC = 16; // AES block size for CBC is 16 bytes

/**
 * Encrypts a string using AES-256-GCM.
 * Returns a colon-separated string prefixed with 'gcm'.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  
  const iv = crypto.randomBytes(IV_LENGTH_GCM);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag();
  
  return `gcm:${iv.toString("hex")}:${encrypted}:${tag.toString("hex")}`;
}

/**
 * Decrypts an encrypted string supporting both AES-256-GCM and legacy AES-256-CBC.
 */
export function decrypt(text: string): string {
  if (!text) return "";

  const parts = text.split(":");
  
  // Check if GCM formatted
  if (parts[0] === "gcm") {
    if (parts.length !== 4) {
      throw new Error("Invalid GCM encrypted text format.");
    }
    const iv = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");
    const tag = Buffer.from(parts[3], "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  }

  // Fallback to legacy AES-256-CBC
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format. Must be iv:ciphertext or gcm:iv:ciphertext:tag.");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");
  
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString("utf8");
}
