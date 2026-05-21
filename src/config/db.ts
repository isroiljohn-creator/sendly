import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Polyfill WebSocket for environments where Node.js < 22 lacks built-in WebSocket support
if (typeof (global as any).WebSocket === "undefined") {
  (global as any).WebSocket = class {};
}

// Initialize Supabase Client with service role key for backend access bypass row-level-security
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
