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
