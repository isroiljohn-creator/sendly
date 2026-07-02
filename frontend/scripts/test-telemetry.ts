import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { initDb, getPool } from "../src/lib/pgdb";
import { runDailyTelemetryJob, getYesterdayCostsAndRevenue } from "../src/lib/telemetry";

async function setupTelemetryTestDb() {
  await initDb();
  const pool = getPool();
  // Clean telemetry table
  await pool.query("TRUNCATE TABLE cost_telemetry CASCADE");
}

async function runTelemetryTests() {
  console.info("⚡ Starting Sendly Cost Telemetry Unit Tests...");
  await setupTelemetryTestDb();
  const pool = getPool();

  const testUserId = "telemetry-user-123";

  // ─── TEST 1: Insert Mock Telemetry Logs ─────────────────────────────────────
  console.info("\n🧪 Test 1: Simulating Yesterday and Today Telemetry...");
  
  // Insert successful telemetry log for today (normal cost)
  // planned: 22 UZS, real: 15 UZS
  await pool.query(
    `INSERT INTO cost_telemetry (
      user_id, operation_type, model_id, input_tokens, output_tokens, thinking_tokens, 
      cached_tokens, status, latency_ms, real_cost_uzs, planned_cost_uzs, fallback_used
    ) VALUES ($1, 'chat_reply', 'gemini-3.1-flash-lite', 1000, 200, 0, 0, 'success', 450, 15.00, 22.00, FALSE)`,
    [testUserId]
  );

  // Insert another telemetry log for today that exceeds planned cost
  // planned: 22 UZS, real: 30 UZS
  await pool.query(
    `INSERT INTO cost_telemetry (
      user_id, operation_type, model_id, input_tokens, output_tokens, thinking_tokens, 
      cached_tokens, status, latency_ms, real_cost_uzs, planned_cost_uzs, fallback_used
    ) VALUES ($1, 'chat_reply', 'gemini-3.5-flash', 1500, 500, 100, 0, 'success', 980, 30.00, 22.00, TRUE)`,
    [testUserId]
  );

  // Insert a mock log for YESTERDAY to test yesterday metrics aggregation
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO cost_telemetry (
      user_id, operation_type, model_id, input_tokens, output_tokens, thinking_tokens, 
      cached_tokens, status, latency_ms, real_cost_uzs, planned_cost_uzs, fallback_used, created_at
    ) VALUES ($1, 'chat_reply', 'gemini-3.1-flash-lite', 1000, 200, 0, 0, 'success', 400, 12.00, 22.00, FALSE, $2)`,
    [testUserId, yesterday]
  );

  console.info("✅ Mock telemetry logs inserted.");

  // ─── TEST 2: Run Daily Telemetry Job & Margin Checks ────────────────────────
  console.info("\n🧪 Test 2: Running Daily Telemetry Aggregation...");
  
  // Reset deduction rate for chat_reply to 10
  await pool.query("UPDATE deduction_rates SET credits = 10 WHERE operation_type = 'chat_reply'");

  const summaryResult = await runDailyTelemetryJob();
  console.info("Telemetry summaries computed:", summaryResult.summaries);
  console.info("Alerts generated:", summaryResult.alertsSent);

  if (summaryResult.summaries.length === 0) {
    throw new Error("No telemetry summaries generated!");
  }

  const replySum = summaryResult.summaries.find(s => s.operation_type === "chat_reply");
  if (!replySum) {
    throw new Error("Summary for chat_reply is missing!");
  }

  // Avg real = (15 + 30) / 2 = 22.5 UZS.
  // Planned = 22.0 UZS.
  // Avg real (22.5) > Planned (22.0) -> should trigger planned cost warning alert!
  const hasCostWarning = summaryResult.alertsSent.some(a => a.includes("exceeds its planned cost") || a.includes("tannarxdan oshib ketdi"));
  if (!hasCostWarning) {
    throw new Error("Expected planned cost warning alert, but none was sent.");
  }
  console.info("✅ Correctly triggered planned cost warning alert.");

  // ─── TEST 3: Negative Margin Check & Auto-escalation / Fallback Trigger ─────
  console.info("\n🧪 Test 3: Simulating Negative Margin & Auto-Deduction Boost...");
  
  // Clear telemetry and insert a huge cost log (real = 80 UZS, planned = 22 UZS)
  // Revenue on Biznes = 10 credits * 7 UZS = 70 UZS.
  // Since real (80 UZS) > revenue (70 UZS), the Biznes margin will be negative!
  await pool.query("TRUNCATE TABLE cost_telemetry CASCADE");
  await pool.query(
    `INSERT INTO cost_telemetry (
      user_id, operation_type, model_id, input_tokens, output_tokens, thinking_tokens, 
      cached_tokens, status, latency_ms, real_cost_uzs, planned_cost_uzs, fallback_used
    ) VALUES ($1, 'chat_reply', 'gemini-3.5-flash', 4000, 1000, 500, 0, 'success', 1200, 80.00, 22.00, FALSE)`,
    [testUserId]
  );

  const negSummary = await runDailyTelemetryJob();
  console.info("Alerts generated on negative margin:", negSummary.alertsSent);

  const hasNegativeMarginAlert = negSummary.alertsSent.some(a => a.includes("zarar keltirdi") || a.includes("Negative Margin"));
  if (!hasNegativeMarginAlert) {
    throw new Error("Expected negative margin alert, but none was sent.");
  }

  // Verify that the credits deduction rate was automatically boosted for this operation
  const rateRes = await pool.query("SELECT credits FROM deduction_rates WHERE operation_type = 'chat_reply'");
  const updatedCredits = parseFloat(rateRes.rows[0].credits);
  console.info(`Deduction rate for chat_reply boosted to: ${updatedCredits}`);
  if (updatedCredits !== 15) {
    throw new Error(`Expected chat_reply rate to be boosted to 15, got ${updatedCredits}`);
  }
  console.info("✅ Correctly triggered negative margin alert and auto-boosted deduction rate.");

  // ─── TEST 4: Yesterday Metrics Aggregation ──────────────────────────────────
  console.info("\n🧪 Test 4: Checking Yesterday Metrics Aggregation...");
  
  // Clear and insert 1 log for yesterday (UTC date matching yesterday)
  await pool.query("TRUNCATE TABLE cost_telemetry CASCADE");
  await pool.query(
    `INSERT INTO cost_telemetry (
      user_id, operation_type, model_id, input_tokens, output_tokens, thinking_tokens, 
      cached_tokens, status, latency_ms, real_cost_uzs, planned_cost_uzs, fallback_used, created_at
    ) VALUES ($1, 'chat_reply', 'gemini-3.1-flash-lite', 1000, 200, 0, 0, 'success', 400, 12.50, 22.00, FALSE, $2)`,
    [testUserId, yesterday]
  );

  // Insert mock ledger rows for yesterday
  await pool.query("TRUNCATE TABLE credit_ledger CASCADE");
  await pool.query(
    `INSERT INTO credit_ledger (user_id, action_type, operation_type, credits_amount, plan_amount, purchased_amount, balance_after, description, created_at)
     VALUES ($1, 'deduct', 'chat_reply', -10, 10, 0, 90, 'Deduction 1', $2)`,
    [testUserId, yesterday]
  );

  const yesterdayMetrics = await getYesterdayCostsAndRevenue();
  console.info("Yesterday metrics computed:", yesterdayMetrics);
  if (yesterdayMetrics.spendUzs !== 12.50) {
    throw new Error(`Expected yesterday spend to be 12.50 UZS, got ${yesterdayMetrics.spendUzs}`);
  }
  if (yesterdayMetrics.revenueUzs !== 80.00) { // 10 plan credits * 8 UZS/credit = 80 UZS
    throw new Error(`Expected yesterday revenue to be 80 UZS, got ${yesterdayMetrics.revenueUzs}`);
  }
  console.info("✅ Test 4 Passed: Yesterday metrics aggregation is correct.");

  console.info("\n🎉 All 4 Sendly Telemetry Unit Tests Passed Successfully!");
}

runTelemetryTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Telemetry test run failed with error:", err);
    process.exit(1);
  });
