// In-memory OTP store for production containers (Railway)
interface OtpEntry {
  otp: string;
  expires: number;
}

// Global object definition to survive hot-reloads in Next.js development
const globalForOtp = global as unknown as {
  otpStore?: Map<string, OtpEntry>;
};

export const otpStore = globalForOtp.otpStore ?? new Map<string, OtpEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForOtp.otpStore = otpStore;
}

export function generateAndSaveOtp(email: string): string {
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiration
  otpStore.set(email.toLowerCase(), { otp, expires });
  return otp;
}

export function verifyOtpCode(email: string, code: string): boolean {
  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return false;
  
  const { otp, expires } = entry;
  if (Date.now() > expires) {
    otpStore.delete(email.toLowerCase());
    return false; // Expired
  }
  
  if (otp === code) {
    otpStore.delete(email.toLowerCase()); // Burn after use
    return true;
  }
  
  return false;
}

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, windowMs: number, max: number): { allowed: boolean; retryAfter: number } {
  const key = identifier.toLowerCase();
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  
  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}
