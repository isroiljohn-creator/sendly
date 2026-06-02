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
    const tokenInput = `${encodedHeader}.${encodedPayload}`;
    
    const expectedSignature = crypto.createHmac("sha256", secret)
      .update(tokenInput)
      .digest();
    const expectedEncodedSignature = base64url(expectedSignature);
    
    if (encodedSignature !== expectedEncodedSignature) {
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
