import { checkRateLimit } from "../src/lib/rateLimiter";

async function runGuardrailsTests() {
  console.info("⚡ Starting Sendly Guardrails Unit Tests...");

  // ─── TEST 1: Rate Limiter sliding window check ─────────────────────────────
  console.info("\n🧪 Test 1: Testing Rate Limiter (5 msg/min max)...");
  
  const testKey = "rate_limit:bot-abc:user-xyz";

  // Simulate 5 messages sent immediately
  for (let i = 1; i <= 5; i++) {
    const check = checkRateLimit(testKey, 5, 60000);
    console.info(`Message ${i}: allowed=${check.allowed}, remaining=${check.remaining}`);
    if (!check.allowed) {
      throw new Error(`Expected message ${i} to be allowed under rate limit!`);
    }
  }

  // 6th message should be blocked
  const checkBlocked = checkRateLimit(testKey, 5, 60000);
  console.info(`Message 6: allowed=${checkBlocked.allowed}, remaining=${checkBlocked.remaining}`);
  if (checkBlocked.allowed) {
    throw new Error("Expected message 6 to be blocked by the rate limiter!");
  }
  console.info("✅ Rate Limiter successfully blocked 6th message.");

  console.info("\n🎉 All Sendly Guardrails Unit Tests Passed Successfully!");
}

runGuardrailsTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Guardrails test run failed with error:", err);
    process.exit(1);
  });
