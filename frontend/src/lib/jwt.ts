import crypto from "crypto";

function base64url(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str) : str;
  return buf.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export function signJwt(payload: object, secret: string): string {
  if (!secret || secret.length < 32) {
    console.warn("Warning: JWT secret is less than 32 characters long!");
  }
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const tokenInput = `${encodedHeader}.${encodedPayload}`;
  
  const signature = crypto.createHmac("sha256", secret)
    .update(tokenInput)
    .digest();
  const encodedSignature = base64url(signature);
  
  return `${tokenInput}.${encodedSignature}`;
}

export function verifyJwt(token: string, secret: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // Validate algorithm header (prevents none alg bypass)
    try {
      const headerStr = base64urlDecode(encodedHeader);
      const header = JSON.parse(headerStr);
      if (header.alg !== "HS256") {
        return null;
      }
    } catch {
      return null;
    }

    const tokenInput = `${encodedHeader}.${encodedPayload}`;
    
    const expectedSignature = crypto.createHmac("sha256", secret)
      .update(tokenInput)
      .digest();
    
    let base64Sig = encodedSignature.replace(/-/g, "+").replace(/_/g, "/");
    while (base64Sig.length % 4) {
      base64Sig += "=";
    }
    const signatureBuffer = Buffer.from(base64Sig, "base64");
    
    if (signatureBuffer.length !== expectedSignature.length) {
      return null;
    }
    
    if (!crypto.timingSafeEqual(signatureBuffer, expectedSignature)) {
      return null;
    }
    
    const payloadStr = base64urlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr);
    
    // Check expiration
    if (payload.exp && typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.exp) {
        return null; // Expired
      }
    }
    
    return payload;
  } catch (err) {
    console.error("JWT Verification error:", err);
    return null;
  }
}
