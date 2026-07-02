import * as pgdb from "@/lib/pgdb";
import modelConfig from "@/config/models.json";

export interface DeductionRates {
  operation_type: string;
  credits: number;
  unit: string;
}

export interface CreditPackage {
  name: string;
  credits: number;
  price_uzs: number;
  active: boolean;
}

/**
 * Seeds deduction_rates and credit_packages if they are empty.
 */
export async function seedBillingConfigs(): Promise<void> {
  const pool = pgdb.getPool();

  // 1. Seed deduction_rates (ON CONFLICT DO UPDATE)
  const rates = [
    { op: "chat_reply", cr: 10, unit: "flat" },
    { op: "lead_qualification", cr: 10, unit: "flat" },
    { op: "link_analysis", cr: 20, unit: "flat" },
    { op: "pdf_analysis", cr: 50, unit: "page_increment" },
    { op: "audio_transcription", cr: 50, unit: "increment_15s" },
    { op: "image_analysis", cr: 20, unit: "flat" }
  ];
  for (const r of rates) {
    await pool.query(
      `INSERT INTO deduction_rates (operation_type, credits, unit) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (operation_type) DO UPDATE 
         SET credits = EXCLUDED.credits, unit = EXCLUDED.unit, updated_at = NOW()`,
      [r.op, r.cr, r.unit]
    );
  }

  // 2. Seed credit_packages (ON CONFLICT DO UPDATE)
  const packages = [
    { name: "Starter", cr: 10000, price: 100000 },
    { name: "Standart", cr: 50000, price: 400000 },
    { name: "Biznes", cr: 150000, price: 1050000 }
  ];
  for (const p of packages) {
    await pool.query(
      `INSERT INTO credit_packages (name, credits, price_uzs, active) 
       VALUES ($1, $2, $3, TRUE) 
       ON CONFLICT (name) DO UPDATE 
         SET credits = EXCLUDED.credits, price_uzs = EXCLUDED.price_uzs, active = EXCLUDED.active`,
      [p.name, p.cr, p.price]
    );
  }
}

/**
 * Mock interface for Payme Receipts API to handle auto-recharge stub.
 */
export interface PaymentProvider {
  createReceipt(userId: string, amountUzs: number): Promise<{ success: boolean; receiptId?: string }>;
  payReceipt(receiptId: string): Promise<{ success: boolean }>;
}

export const PaymeProviderStub: PaymentProvider = {
  async createReceipt(userId: string, amountUzs: number) {
    console.info(`[Payme Stub] Created receipt for User ${userId} with amount ${amountUzs} UZS`);
    return { success: true, receiptId: `payme-rec-${Date.now()}` };
  },
  async payReceipt(receiptId: string) {
    console.info(`[Payme Stub] Payment processed successfully for receipt: ${receiptId}`);
    return { success: true };
  }
};

/**
 * Resolves current credits cost based on configuration and inputs.
 */
export async function calculateOperationCredits(
  operationType: string,
  options: { pageCount?: number; durationSeconds?: number } = {}
): Promise<number> {
  const pool = pgdb.getPool();
  const rateRes = await pool.query("SELECT * FROM deduction_rates WHERE operation_type = $1", [operationType]);
  if (rateRes.rows.length === 0) {
    throw new Error(`Deduction rate not found for operation: ${operationType}`);
  }
  const rate = rateRes.rows[0] as DeductionRates;

  if (rate.unit === "flat") {
    return rate.credits;
  } else if (rate.unit === "page_increment") {
    const pages = options.pageCount || 1;
    if (pages <= 10) return rate.credits;
    const extraPages = pages - 10;
    return rate.credits + Math.ceil(extraPages / 10) * 30;
  } else if (rate.unit === "increment_15s") {
    const seconds = options.durationSeconds || 0;
    if (seconds <= 0) return 0;
    const steps = Math.ceil(seconds / 15);
    return Math.ceil(steps * 12.5);
  }

  return rate.credits;
}

/**
 * Checks and deducts credits from active plan/purchase lots using FIFO.
 * Fully atomic, uses SELECT ... FOR UPDATE locks to prevent race conditions.
 */
export async function deductCredits(
  userId: string,
  operationType: string,
  options: {
    idempotencyKey: string;
    pageCount?: number;
    durationSeconds?: number;
    tokensUsed?: number;
    computedCostUzs?: number;
    description?: string;
  }
): Promise<{ success: boolean; deducted: number; balanceAfter: number }> {
  await pgdb.initDb();
  await seedBillingConfigs();
  const pool = pgdb.getPool();

  return await pgdb.executeTransaction(async (client) => {
    // 1. Idempotency Check
    const ledgerCheck = await client.query(
      "SELECT credits_amount, balance_after FROM credit_ledger WHERE idempotency_key = $1",
      [options.idempotencyKey]
    );
    if (ledgerCheck.rows.length > 0) {
      console.info(`[Billing] Idempotent hit: credits already deducted for key ${options.idempotencyKey}`);
      return {
        success: true,
        deducted: Math.abs(ledgerCheck.rows[0].credits_amount),
        balanceAfter: ledgerCheck.rows[0].balance_after
      };
    }

    // 2. Compute credits cost
    const creditsCost = await calculateOperationCredits(operationType, {
      pageCount: options.pageCount,
      durationSeconds: options.durationSeconds
    });

    if (creditsCost <= 0) {
      const balance = await getOrInitBalance(userId, client);
      return { success: true, deducted: 0, balanceAfter: balance.plan_credits + balance.purchased_credits };
    }

    // Lock user balance row to block parallel execution
    const balance = await getOrInitBalance(userId, client, true);

    // 3. Daily spend limit verification (Tashkent Timezone)
    if (balance.daily_spend_cap !== null) {
      const dailySpendRes = await client.query(
        `SELECT COALESCE(SUM(ABS(credits_amount)), 0) as spend 
         FROM credit_ledger 
         WHERE user_id = $1 
           AND action_type = 'deduct' 
           AND created_at >= (date_trunc('day', NOW() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent')`,
        [userId]
      );
      const currentDailySpend = parseInt(dailySpendRes.rows[0].spend);
      if (currentDailySpend + creditsCost > balance.daily_spend_cap) {
        throw new Error("DAILY_LIMIT_EXCEEDED");
      }
    }

    // 4. Fetch active credit lots with FIFO ordering:
    // Sort by plan lot first, then by earliest expiry date. Lock the lots!
    const lotsRes = await client.query(
      `SELECT * FROM credit_lots 
       WHERE user_id = $1 
         AND credits_remaining > 0 
         AND expires_at > NOW() 
       ORDER BY source = 'plan' DESC, expires_at ASC 
       FOR UPDATE`,
      [userId]
    );

    const totalAvailable = lotsRes.rows.reduce((sum: number, lot: any) => sum + lot.credits_remaining, 0);
    if (totalAvailable < creditsCost) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    // 5. Allocation process
    let remainingToDeduct = creditsCost;
    let planDeducted = 0;
    let purchasedDeducted = 0;
    const allocations: Array<{ lotId: string; amount: number }> = [];

    for (const lot of lotsRes.rows) {
      if (remainingToDeduct <= 0) break;

      const take = Math.min(lot.credits_remaining, remainingToDeduct);
      const updatedRemaining = lot.credits_remaining - take;

      // Update lot in DB
      await client.query(
        "UPDATE credit_lots SET credits_remaining = $1 WHERE id = $2",
        [updatedRemaining, lot.id]
      );

      allocations.push({ lotId: lot.id, amount: take });

      if (lot.source === "plan") {
        planDeducted += take;
      } else {
        purchasedDeducted += take;
      }

      remainingToDeduct -= take;
    }

    // 6. Update Cached Balance
    const nextPlanBalance = balance.plan_credits - planDeducted;
    const nextPurchasedBalance = balance.purchased_credits - purchasedDeducted;
    const totalBalanceAfter = nextPlanBalance + nextPurchasedBalance;

    await client.query(
      `UPDATE credit_balances 
       SET plan_credits = $1, purchased_credits = $2, updated_at = NOW() 
       WHERE user_id = $3`,
      [nextPlanBalance, nextPurchasedBalance, userId]
    );

    // 7. Insert credit_ledger entry
    const ledgerInsert = await client.query(
      `INSERT INTO credit_ledger (
        user_id, action_type, operation_type, credits_amount, plan_amount, 
        purchased_amount, balance_after, description, idempotency_key, 
        tokens_used, computed_api_cost_uzs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING id`,
      [
        userId,
        "deduct",
        operationType,
        -creditsCost,
        planDeducted,
        purchasedDeducted,
        totalBalanceAfter,
        options.description || `${operationType} deduction`,
        options.idempotencyKey,
        options.tokensUsed || 0,
        options.computedCostUzs || 0.00
      ]
    );

    const ledgerId = ledgerInsert.rows[0].id;

    // 8. Insert ledger_lot_allocations entries
    for (const alloc of allocations) {
      await client.query(
        "INSERT INTO ledger_lot_allocations (ledger_id, lot_id, amount) VALUES ($1, $2, $3)",
        [ledgerId, alloc.lotId, alloc.amount]
      );
    }

    // 9. Low Balance Notification Check
    // We notify at 20% and 5% threshold of plan_credits (based on starting total of active plan lots)
    const initialPlanTotalRes = await client.query(
      "SELECT COALESCE(SUM(credits_total), 0) as total FROM credit_lots WHERE user_id = $1 AND source = 'plan' AND expires_at > NOW()",
      [userId]
    );
    const initialPlanTotal = parseInt(initialPlanTotalRes.rows[0].total);
    if (initialPlanTotal > 0) {
      const planRemainingRatio = nextPlanBalance / initialPlanTotal;
      const prevPlanRemainingRatio = balance.plan_credits / initialPlanTotal;

      let warningMessage = "";
      if (prevPlanRemainingRatio >= 0.20 && planRemainingRatio < 0.20) {
        warningMessage = `⚠️ [Kredit Ogohlantirishi] Oylik tarifingizdagi plan-kreditlar 20% dan kamroq qoldi (${nextPlanBalance} kredit).`;
      } else if (prevPlanRemainingRatio >= 0.05 && planRemainingRatio < 0.05) {
        warningMessage = `⚠️ [Kredit Ogohlantirishi] DIQQAT: Oylik tarifingizdagi plan-kreditlar 5% dan kamroq qoldi (${nextPlanBalance} kredit).`;
      }

      if (warningMessage) {
        // Send async notification using SYSTEM_BOT_TOKEN
        sendAdminAlert(warningMessage).catch(nErr => console.error("[Billing] Alert notification failed:", nErr));
      }
    }

    // 10. Auto-recharge Trigger check
    if (totalBalanceAfter < 500 && balance.auto_recharge_enabled) {
      // Trigger recharge as dynamic callback in transaction
      triggerAutoRechargeAsync(userId, balance.auto_recharge_package).catch((err) =>
        console.error(`[Billing] Auto-recharge trigger failed for ${userId}:`, err)
      );
    }

    return {
      success: true,
      deducted: creditsCost,
      balanceAfter: totalBalanceAfter
    };
  });
}

/**
 * Purchases a top-up credit package. Creates a lot and updates balance cache.
 */
export async function purchasePackage(
  userId: string,
  packageName: string
): Promise<{ success: boolean; added: number; balanceAfter: number }> {
  await pgdb.initDb();
  await seedBillingConfigs();
  const pool = pgdb.getPool();

  const pkgRes = await pool.query("SELECT * FROM credit_packages WHERE name = $1 AND active = TRUE", [packageName]);
  if (pkgRes.rows.length === 0) {
    throw new Error(`Active package not found: ${packageName}`);
  }
  const pkg = pkgRes.rows[0] as CreditPackage;

  return await pgdb.executeTransaction(async (client) => {
    const balance = await getOrInitBalance(userId, client, true);

    // Create a 6-month validity lot for the purchase
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    const lotRes = await client.query(
      `INSERT INTO credit_lots (user_id, source, credits_total, credits_remaining, expires_at, package_name) 
       VALUES ($1, 'purchase', $2, $2, $3, $4) RETURNING id`,
      [userId, pkg.credits, expiresAt, pkg.name]
    );

    const newPurchasedBalance = balance.purchased_credits + pkg.credits;
    const totalBalanceAfter = balance.plan_credits + newPurchasedBalance;

    // Reset recharge attempts to 0 on successful payment
    await client.query(
      `UPDATE credit_balances 
       SET purchased_credits = $1, recharge_attempts = 0, updated_at = NOW() 
       WHERE user_id = $2`,
      [newPurchasedBalance, userId]
    );

    // Log in ledger
    await client.query(
      `INSERT INTO credit_ledger (
        user_id, action_type, credits_amount, plan_amount, purchased_amount, 
        balance_after, description
      ) VALUES ($1, 'purchase', $2, 0, $2, $3, $4)`,
      [userId, pkg.credits, totalBalanceAfter, `Purchased ${pkg.name} package (+${pkg.credits} cr)`]
    );

    return {
      success: true,
      added: pkg.credits,
      balanceAfter: totalBalanceAfter
    };
  });
}

/**
 * Grants plan credits to user (typically on subscription renewal). Lot valid for 1 month.
 */
export async function grantPlanCredits(
  userId: string,
  creditsCount: number
): Promise<{ success: boolean; balanceAfter: number }> {
  await pgdb.initDb();
  const pool = pgdb.getPool();

  return await pgdb.executeTransaction(async (client) => {
    const balance = await getOrInitBalance(userId, client, true);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await client.query(
      `INSERT INTO credit_lots (user_id, source, credits_total, credits_remaining, expires_at) 
       VALUES ($1, 'plan', $2, $2, $3)`,
      [userId, creditsCount, expiresAt]
    );

    const newPlanBalance = balance.plan_credits + creditsCount;
    const totalBalanceAfter = newPlanBalance + balance.purchased_credits;

    await client.query(
      `UPDATE credit_balances 
       SET plan_credits = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [newPlanBalance, userId]
    );

    await client.query(
      `INSERT INTO credit_ledger (
        user_id, action_type, credits_amount, plan_amount, purchased_amount, 
        balance_after, description
      ) VALUES ($1, 'grant_plan', $2, $2, 0, $3, $4)`,
      [userId, creditsCount, totalBalanceAfter, `Granted oylik plan credits (+${creditsCount} cr)`]
    );

    return { success: true, balanceAfter: totalBalanceAfter };
  });
}

/**
 * Expiry Job: Runs hourly/daily. For all expired lots, drops remaining balance to 0, 
 * updates balance cache, and logs 'expiry' in ledger. All inside atomic transaction.
 */
export async function runExpiryJob(): Promise<void> {
  await pgdb.initDb();
  const pool = pgdb.getPool();

  // Find all expired lots that still have remaining credits
  const expiredLots = await pool.query(
    "SELECT DISTINCT user_id FROM credit_lots WHERE expires_at <= NOW() AND credits_remaining > 0"
  );

  for (const row of expiredLots.rows) {
    const userId = row.user_id;

    await pgdb.executeTransaction(async (client) => {
      // Lock user balance
      const balance = await getOrInitBalance(userId, client, true);

      // Lock and fetch expired lots for this user
      const lotsRes = await client.query(
        "SELECT * FROM credit_lots WHERE user_id = $1 AND expires_at <= NOW() AND credits_remaining > 0 FOR UPDATE",
        [userId]
      );

      let totalExpiredPlan = 0;
      let totalExpiredPurchased = 0;

      for (const lot of lotsRes.rows) {
        const remaining = lot.credits_remaining;
        await client.query("UPDATE credit_lots SET credits_remaining = 0 WHERE id = $1", [lot.id]);
        
        if (lot.source === "plan") {
          totalExpiredPlan += remaining;
        } else {
          totalExpiredPurchased += remaining;
        }
      }

      if (totalExpiredPlan > 0 || totalExpiredPurchased > 0) {
        const nextPlanBalance = Math.max(0, balance.plan_credits - totalExpiredPlan);
        const nextPurchasedBalance = Math.max(0, balance.purchased_credits - totalExpiredPurchased);
        const totalBalanceAfter = nextPlanBalance + nextPurchasedBalance;

        // Update Cached Balance
        await client.query(
          "UPDATE credit_balances SET plan_credits = $1, purchased_credits = $2, updated_at = NOW() WHERE user_id = $3",
          [nextPlanBalance, nextPurchasedBalance, userId]
        );

        // Log expiry in ledger
        const expiredTotal = totalExpiredPlan + totalExpiredPurchased;
        await client.query(
          `INSERT INTO credit_ledger (
            user_id, action_type, credits_amount, plan_amount, purchased_amount, 
            balance_after, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            "expiry",
            -expiredTotal,
            totalExpiredPlan,
            totalExpiredPurchased,
            totalBalanceAfter,
            `Kredit lotlari muddati tugadi: -${expiredTotal} cr (${totalExpiredPlan} plan, ${totalExpiredPurchased} purchase)`
          ]
        );

        console.info(`[Expiry Job] Processed expiry for User ${userId}: -${expiredTotal} credits`);
      }
    });
  }
}

/**
 * Reconciliation Job: compares SUM(credit_lots.credits_remaining) vs credit_balances cache.
 * Sends Telegram alerts if drift is found.
 */
export async function runReconciliationJob(): Promise<void> {
  await pgdb.initDb();
  const pool = pgdb.getPool();

  const balancesRes = await pool.query("SELECT * FROM credit_balances");

  for (const bal of balancesRes.rows) {
    const userId = bal.user_id;

    const lotsSumRes = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN source = 'plan' THEN credits_remaining ELSE 0 END), 0) as plan_sum,
         COALESCE(SUM(CASE WHEN source = 'purchase' THEN credits_remaining ELSE 0 END), 0) as purchased_sum
       FROM credit_lots 
       WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );

    const actualPlanSum = parseInt(lotsSumRes.rows[0].plan_sum);
    const actualPurchasedSum = parseInt(lotsSumRes.rows[0].purchased_sum);

    const driftPlan = actualPlanSum !== bal.plan_credits;
    const driftPurchased = actualPurchasedSum !== bal.purchased_credits;

    if (driftPlan || driftPurchased) {
      const alertMsg = `🚨 [Billing Reconciliation Drift] Drift detected for user ${userId}:\n` +
        `- Cache Plan: ${bal.plan_credits} vs Lots Plan Sum: ${actualPlanSum}\n` +
        `- Cache Purchased: ${bal.purchased_credits} vs Lots Purchased Sum: ${actualPurchasedSum}\n` +
        `Re-adjusting cache to match lots ground truth...`;

      console.error(alertMsg);
      await sendAdminAlert(alertMsg);

      // Auto-correct cache balance
      await pool.query(
        "UPDATE credit_balances SET plan_credits = $1, purchased_credits = $2, updated_at = NOW() WHERE user_id = $3",
        [actualPlanSum, actualPurchasedSum, userId]
      );
    }
  }
}

/**
 * Triggers the Payme auto-recharge receipt flow. If it fails 3 times, pauses the bot.
 */
async function triggerAutoRechargeAsync(userId: string, packageName: string): Promise<void> {
  const pool = pgdb.getPool();
  const pkgRes = await pool.query("SELECT * FROM credit_packages WHERE name = $1 AND active = TRUE", [packageName]);
  if (pkgRes.rows.length === 0) return;
  const pkg = pkgRes.rows[0] as CreditPackage;

  // Perform recharge attempt
  try {
    const receipt = await PaymeProviderStub.createReceipt(userId, pkg.price_uzs);
    if (receipt.success && receipt.receiptId) {
      const payResult = await PaymeProviderStub.payReceipt(receipt.receiptId);
      if (payResult.success) {
        // Complete the purchase!
        await purchasePackage(userId, packageName);
        console.info(`[Billing] Auto-recharge completed successfully for User ${userId}`);
        return;
      }
    }
    throw new Error("Payme receipt payment failed");
  } catch (err: any) {
    console.error(`[Billing] Auto-recharge attempt failed for User ${userId}:`, err.message);

    await pgdb.executeTransaction(async (client) => {
      const balance = await getOrInitBalance(userId, client, true);
      const attempts = balance.recharge_attempts + 1;

      if (attempts >= 3) {
        // Pause bot and notify admin
        await client.query(
          "UPDATE credit_balances SET recharge_attempts = $1, auto_recharge_enabled = FALSE WHERE user_id = $2",
          [attempts, userId]
        );

        // Update bot settings to pause AI
        const settingsKey = `global_settings_${userId}`;
        const userSettings = await client.query("SELECT value FROM kv_store WHERE key = $1", [settingsKey]);
        if (userSettings.rows.length > 0) {
          const settings = userSettings.rows[0].value;
          // Set bot connections to active=false or connected=false or pause AI agent settings
          settings.aiAgentPaused = true;
          await client.query("UPDATE kv_store SET value = $1 WHERE key = $2", [JSON.stringify(settings), settingsKey]);
        }

        const alertMsg = `⚠️ [Auto-Recharge Blocked] User ${userId} auto-recharge has failed 3 consecutive times.\n` +
          `The AI Agent has been paused. Please contact user to resolve payment issues.`;
        await sendAdminAlert(alertMsg);
      } else {
        await client.query(
          "UPDATE credit_balances SET recharge_attempts = $1 WHERE user_id = $2",
          [attempts, userId]
        );
      }
    });
  }
}

/**
 * Resolves or initializes the balance row for a user.
 */
async function getOrInitBalance(userId: string, client: any, forUpdate = false): Promise<any> {
  const querySuffix = forUpdate ? " FOR UPDATE" : "";
  const res = await client.query(`SELECT * FROM credit_balances WHERE user_id = $1${querySuffix}`, [userId]);
  if (res.rows.length > 0) {
    return res.rows[0];
  }
  // Initialize balance row
  const insertRes = await client.query(
    `INSERT INTO credit_balances (user_id, plan_credits, purchased_credits) 
     VALUES ($1, 0, 0) 
     RETURNING *`,
    [userId]
  );
  return insertRes.rows[0];
}

/**
 * Sends telegram messages to admin alerts chat using SYSTEM_BOT_TOKEN and ADMIN_ALERT_CHAT_ID.
 */
export async function sendAdminAlert(text: string): Promise<void> {
  const token = process.env.SYSTEM_BOT_TOKEN;
  const chatId = process.env.ADMIN_ALERT_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[Alert] Telemetry alert warning missing env variables SYSTEM_BOT_TOKEN or ADMIN_ALERT_CHAT_ID");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (err) {
    console.error("[Alert] Failed to send Telegram admin warning:", err);
  }
}
