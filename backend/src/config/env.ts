import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface Env {
  META_APP_ID: string;
  META_APP_SECRET: string;
  META_WEBHOOK_VERIFY_TOKEN: string;
  DATABASE_URL: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  REDIS_URL: string;
  GEMINI_API_KEY: string;
  TELEGRAM_BOT_TOKEN?: string;
  JWT_SECRET: string;
  PORT: number;
}

const requiredEnvVars = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "GEMINI_API_KEY",
];

const missing = requiredEnvVars.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

export const env: Env = {
  META_APP_ID: process.env.META_APP_ID!,
  META_APP_SECRET: process.env.META_APP_SECRET!,
  META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN!,
  DATABASE_URL: process.env.DATABASE_URL!,
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  REDIS_URL: process.env.REDIS_URL!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  JWT_SECRET: process.env.JWT_SECRET!,
  PORT: parseInt(process.env.PORT || "4000", 10),
};
