import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { initDb, getPool } from "../src/lib/pgdb";
import { deductCredits, grantPlanCredits, purchasePackage, runExpiryJob, runReconciliationJob } from "../src/lib/billing";

// Ensure process.env has needed variables
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

async function setupTestDb() {
  await initDb();
  const pool = getPool();
  // Clear tables before running tests to prevent collision
  await pool.query("TRUNCATE TABLE credit_ledger CASCADE");
  await pool.query("TRUNCATE TABLE credit_lots CASCADE");
  await pool.query("TRUNCATE TABLE credit_balances CASCADE");
  await pool.query("TRUNCATE TABLE ledger_lot_allocations CASCADE");
}

async function runTests() {
  console.info("⚡ Starting Sendly Billing Engine Unit Tests...");
  await setupTestDb();
  const pool = getPool();

  const testUserId = "test-user-123";

  // ─── TEST 1: Plan Credits Grant & Caching ───────────────────────────────────
  console.info("\n🧪 Test 1: Granting Plan Credits...");
  await grantPlanCredits(testUserId, 100);
  const bal1 = await pool.query("SELECT * FROM credit_balances WHERE user_id = $1", [testUserId]);
  if (bal1.rows[0].plan_credits !== 100) {
    throw new Error(`Expected plan_credits to be 100, got ${bal1.rows[0].plan_credits}`);
  }
  console.info("✅ Test 1 Passed: Plan credits granted and balance cached correctly.");

  // ─── TEST 2: Basic FIFO Deduction (Plan lot used first) ────────────────────
  console.info("\n🧪 Test 2: FIFO Deductions...");
  // Purchase stand-up package of 50,000 credits (seeds credit_packages automatically)
  await purchasePackage(testUserId, "Starter"); // Starter has 10,000 credits
  
  const balBeforeDeduct = await pool.query("SELECT * FROM credit_balances WHERE user_id = $1", [testUserId]);
  // plan: 100, purchased: 10,000
  
  // Deduct 30 credits (should go fully into plan lot)
  const idempKey1 = `idemp-key-${Date.now()}-1`;
  const deductResult = await deductCredits(testUserId, "chat_reply", {
    idempotencyKey: idempKey1,
    description: "Reply 1"
  });

  const balAfterDeduct = await pool.query("SELECT * FROM credit_balances WHERE user_id = $1", [testUserId]);
  // expected: plan: 90 (deducted 10, wait, chat_reply defaults to 10 credits in seeded configs!)
  // deductCredits returns deducted amount
  console.info(`Deducted: ${deductResult.deducted} credits. Balance after: ${deductResult.balanceAfter}`);
  if (deductResult.deducted !== 10) {
    throw new Error(`Expected 10 credits to be deducted for chat_reply, got ${deductResult.deducted}`);
  }
  if (balAfterDeduct.rows[0].plan_credits !== 90) {
    throw new Error(`Expected cached plan_credits to be 90, got ${balAfterDeduct.rows[0].plan_credits}`);
  }
  console.info("✅ Test 2 Passed: Deducted from plan lot first and cached correctly.");

  // ─── TEST 3: Idempotency Check (Double Submit) ──────────────────────────────
  console.info("\n🧪 Test 3: Idempotency Double-Submit protection...");
  const ledgerCountBefore = await pool.query("SELECT COUNT(*) FROM credit_ledger");
  
  // Submit again with same key
  const duplicateDeduct = await deductCredits(testUserId, "chat_reply", {
    idempotencyKey: idempKey1,
    description: "Reply 1 Duplicate"
  });
  
  const ledgerCountAfter = await pool.query("SELECT COUNT(*) FROM credit_ledger");
  if (parseInt(ledgerCountBefore.rows[0].count) !== parseInt(ledgerCountAfter.rows[0].count)) {
    throw new Error("Ledger row written on duplicate submit! Double charge occurred!");
  }
  console.info("✅ Test 3 Passed: Double submit prevented, zero double-charges.");

  // ─── TEST 4: Boundary Timezone Test (23:50 vs 00:10 Tashkent Time) ─────────
  console.info("\n🧪 Test 4: Daily Spend Cap & Timezone Boundaries (23:50 vs 00:10 Tashkent Time)...");
  
  // Update user's daily spend cap to 15 credits
  await pool.query("UPDATE credit_balances SET daily_spend_cap = 15 WHERE user_id = $1", [testUserId]);
  
  // Calculate raw dates in Tashkent timezone context
  // Let's mock a daily spend cap limit check
  // Clean ledger to test boundary conditions
  await pool.query("DELETE FROM credit_ledger WHERE user_id = $1", [testUserId]);

  // Query the database to get start of today in Tashkent timezone
  const startRes = await pool.query(
    "SELECT (date_trunc('day', NOW() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent') as start"
  );
  const dbTodayStart = new Date(startRes.rows[0].start);
  
  const yesterday2350 = new Date(dbTodayStart.getTime() - 10 * 60 * 1000); // 10 minutes before 00:00 (yesterday 23:50)
  const today0010 = new Date(dbTodayStart.getTime() + 10 * 60 * 1000); // 10 minutes after 00:00 (today 00:10)

  // Insert mock deduct row at 23:50 (yesterday) - 10 credits
  await pool.query(
    `INSERT INTO credit_ledger (user_id, action_type, operation_type, credits_amount, plan_amount, purchased_amount, balance_after, description, idempotency_key, created_at)
     VALUES ($1, 'deduct', 'chat_reply', -10, 10, 0, 90, 'Yesterday 23:50 test', 'idemp-t1', $2)`,
    [testUserId, yesterday2350]
  );

  // Insert mock deduct row at 00:10 (today) - 10 credits
  await pool.query(
    `INSERT INTO credit_ledger (user_id, action_type, operation_type, credits_amount, plan_amount, purchased_amount, balance_after, description, idempotency_key, created_at)
     VALUES ($1, 'deduct', 'chat_reply', -10, 10, 0, 80, 'Today 00:10 test', 'idemp-t2', $2)`,
    [testUserId, today0010]
  );

  // Now, try to deduct another 10 credits today (Total today will be 10 + 10 = 20, exceeding cap 15)
  // But the 23:50 from yesterday should be ignored!
  try {
    await deductCredits(testUserId, "chat_reply", {
      idempotencyKey: `idemp-cap-test-${Date.now()}`,
      description: "Should exceed cap if 00:10 is included"
    });
    throw new Error("Allowed deduction exceeding daily cap!");
  } catch (err: any) {
    if (err.message !== "DAILY_LIMIT_EXCEEDED") {
      throw err;
    }
    console.info("✅ Cap properly blocked deduction today (00:10 + current = 20 > 15 limit).");
  }

  // Remove the 00:10 transaction to verify that yesterday's 23:50 transaction doesn't block today's deduction
  await pool.query("DELETE FROM credit_ledger WHERE idempotency_key = 'idemp-t2'");
  
  // Now deduction should succeed because only yesterday's 23:50 transaction remains (ignored for today's cap)
  const boundaryDeductRes = await deductCredits(testUserId, "chat_reply", {
    idempotencyKey: `idemp-cap-success-${Date.now()}`,
    description: "Should succeed because 23:50 is yesterday"
  });
  console.info(`Boundary deduct succeeded with balance: ${boundaryDeductRes.balanceAfter}`);
  console.info("✅ Test 4 Passed: 23:50 and 00:10 fall into different days correctly.");

  // ─── TEST 5: Parallel Race-Condition / Locking Test ────────────────────────
  console.info("\n🧪 Test 5: Parallel Deduction Race-Condition (Poyga Holati)...");
  
  // Clear daily cap
  await pool.query("UPDATE credit_balances SET daily_spend_cap = NULL WHERE user_id = $1", [testUserId]);
  
  // Grant exactly 15 plan credits to user (15 remaining)
  // Let's clear lots and grant 15 plan credits
  await pool.query("DELETE FROM ledger_lot_allocations WHERE lot_id IN (SELECT id FROM credit_lots WHERE user_id = $1)", [testUserId]);
  await pool.query("DELETE FROM credit_lots WHERE user_id = $1", [testUserId]);
  await pool.query("UPDATE credit_balances SET plan_credits = 0, purchased_credits = 0 WHERE user_id = $1", [testUserId]);
  await grantPlanCredits(testUserId, 15);

  // Fire 2 concurrent deductions of 10 credits (chat_reply = 10)
  // Total available = 15. Since 10 + 10 = 20, one MUST fail and one MUST succeed!
  const results = await Promise.allSettled([
    deductCredits(testUserId, "chat_reply", {
      idempotencyKey: `idemp-p1`,
      description: "Parallel 1"
    }),
    deductCredits(testUserId, "chat_reply", {
      idempotencyKey: `idemp-p2`,
      description: "Parallel 2"
    })
  ]);

  const succeeded = results.filter(r => r.status === "fulfilled" && (r.value as any).success);
  const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !(r.value as any).success));

  console.info(`Succeeded count: ${succeeded.length}, Failed count: ${failed.length}`);
  if (succeeded.length !== 1) {
    throw new Error(`Expected exactly 1 call to succeed, but got ${succeeded.length}`);
  }
  
  const finalBal = await pool.query("SELECT plan_credits FROM credit_balances WHERE user_id = $1", [testUserId]);
  if (finalBal.rows[0].plan_credits !== 5) {
    throw new Error(`Expected final balance to be 5, got ${finalBal.rows[0].plan_credits}`);
  }
  console.info("✅ Test 5 Passed: Concurrent deductions locked successfully, preventing negative balance.");

  // ─── TEST 6: Lot Expiry Job ────────────────────────────────────────────────
  console.info("\n🧪 Test 6: Expiry Job...");
  // Add an expired lot (credits_remaining = 30, expires_at = yesterday)
  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO credit_lots (user_id, source, credits_total, credits_remaining, expires_at)
     VALUES ($1, 'plan', 30, 30, $2)`,
    [testUserId, expiredDate]
  );
  
  // Set balance cache to include the 30 credits
  await pool.query("UPDATE credit_balances SET plan_credits = plan_credits + 30 WHERE user_id = $1", [testUserId]);
  
  const balBeforeExpiry = await pool.query("SELECT plan_credits FROM credit_balances WHERE user_id = $1", [testUserId]);
  
  // Run Expiry Job
  await runExpiryJob();
  
  const balAfterExpiry = await pool.query("SELECT plan_credits FROM credit_balances WHERE user_id = $1", [testUserId]);
  console.info(`Balance before expiry: ${balBeforeExpiry.rows[0].plan_credits}, after: ${balAfterExpiry.rows[0].plan_credits}`);
  if (balBeforeExpiry.rows[0].plan_credits - balAfterExpiry.rows[0].plan_credits !== 30) {
    throw new Error("Expired lot was not deducted from balance!");
  }
  console.info("✅ Test 6 Passed: Expiry Job successfully reset expired lot and updated cache.");

  // ─── TEST 7: Reconciliation Job ────────────────────────────────────────────
  console.info("\n🧪 Test 7: Reconciliation Job...");
  // Simulate drift by adding 50 credits to cached balance manually
  await pool.query("UPDATE credit_balances SET plan_credits = plan_credits + 50 WHERE user_id = $1", [testUserId]);
  
  // Run Reconciliation
  await runReconciliationJob();
  
  const balAfterRecon = await pool.query("SELECT plan_credits FROM credit_balances WHERE user_id = $1", [testUserId]);
  if (balAfterRecon.rows[0].plan_credits === balAfterExpiry.rows[0].plan_credits + 50) {
    throw new Error("Reconciliation did not fix the drift!");
  }
  console.info("✅ Test 7 Passed: Reconciliation job correctly caught and adjusted drift.");

  console.info("\n🎉 All 7 Sendly Billing Engine Unit Tests Passed Successfully!");
}

runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Test run failed with error:", err);
    process.exit(1);
  });
