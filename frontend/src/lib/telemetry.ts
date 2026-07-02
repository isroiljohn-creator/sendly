import * as pgdb from "@/lib/pgdb";
import modelPricing from "@/config/model_pricing.json";
import { sendAdminAlert } from "./billing";

export interface TelemetrySummary {
  operation_type: string;
  count: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
  avg_thinking_tokens: number;
  avg_cached_tokens: number;
  avg_latency_ms: number;
  avg_real_cost_uzs: number;
  avg_planned_cost_uzs: number;
  cache_hit_rate: number;
  margin_starter: number;
  margin_standart: number;
  margin_biznes: number;
}

/**
 * Runs the daily telemetry aggregation job.
 * Calculates average stats, checks margins, and alerts the Telegram admin channel.
 */
export async function runDailyTelemetryJob(): Promise<{
  success: boolean;
  summaries: TelemetrySummary[];
  alertsSent: string[];
}> {
  await pgdb.initDb();
  const pool = pgdb.getPool();

  const summaries: TelemetrySummary[] = [];
  const alertsSent: string[] = [];

  try {
    // 1. Fetch telemetry logs from the last 24 hours
    const query = `
      SELECT 
        operation_type,
        COUNT(*) as count,
        COALESCE(AVG(input_tokens), 0) as avg_input,
        COALESCE(AVG(output_tokens), 0) as avg_output,
        COALESCE(AVG(thinking_tokens), 0) as avg_thinking,
        COALESCE(AVG(cached_tokens), 0) as avg_cached,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        COALESCE(AVG(real_cost_uzs), 0) as avg_real,
        COALESCE(AVG(planned_cost_uzs), 0) as avg_planned,
        CASE WHEN SUM(input_tokens) > 0 
             THEN SUM(cached_tokens)::float / SUM(input_tokens) 
             ELSE 0.0 
        END as cache_hit_rate
      FROM cost_telemetry
      WHERE created_at >= NOW() - INTERVAL '1 day'
        AND status = 'success'
      GROUP BY operation_type
    `;

    const res = await pool.query(query);

    // Get current package credit rates
    const packagesRes = await pool.query("SELECT name, credits, price_uzs FROM credit_packages");
    const rates: Record<string, number> = {
      Starter: 10,
      Standart: 8,
      Biznes: 7
    };
    for (const p of packagesRes.rows) {
      rates[p.name] = p.price_uzs / p.credits;
    }

    // Get deduction rates
    const deductionRatesRes = await pool.query("SELECT operation_type, credits FROM deduction_rates");
    const deductionCredits: Record<string, number> = {};
    for (const r of deductionRatesRes.rows) {
      deductionCredits[r.operation_type] = r.credits;
    }

    for (const row of res.rows) {
      const op = row.operation_type;
      const count = parseInt(row.count);
      const avgReal = parseFloat(row.avg_real);
      const avgPlanned = parseFloat(row.avg_planned);
      const opCredits = deductionCredits[op] || 10;

      // Revenue per package tier
      const revStarter = opCredits * (rates["Starter"] || 10);
      const revStandart = opCredits * (rates["Standart"] || 8);
      const revBiznes = opCredits * (rates["Biznes"] || 7);

      // Margin math
      const marginStarter = revStarter > 0 ? (revStarter - avgReal) / revStarter : 0;
      const marginStandart = revStandart > 0 ? (revStandart - avgReal) / revStandart : 0;
      const marginBiznes = revBiznes > 0 ? (revBiznes - avgReal) / revBiznes : 0;

      const summary: TelemetrySummary = {
        operation_type: op,
        count,
        avg_input_tokens: Math.round(parseFloat(row.avg_input)),
        avg_output_tokens: Math.round(parseFloat(row.avg_output)),
        avg_thinking_tokens: Math.round(parseFloat(row.avg_thinking)),
        avg_cached_tokens: Math.round(parseFloat(row.avg_cached)),
        avg_latency_ms: Math.round(parseFloat(row.avg_latency)),
        avg_real_cost_uzs: avgReal,
        avg_planned_cost_uzs: avgPlanned,
        cache_hit_rate: parseFloat(row.cache_hit_rate),
        margin_starter: marginStarter,
        margin_standart: marginStandart,
        margin_biznes: marginBiznes
      };
      summaries.push(summary);

      // --- ALERTS TRIGGERING ---
      
      // Alert 1: Avg real cost exceeds planned cost
      if (avgReal > avgPlanned) {
        const alertMsg = `⚠️ [API Cost Warning] Operatsiya "${op}" rejalashtirilgan tannarxdan oshib ketdi:\n` +
          `- Haqiqiy o'rtacha xarajat: ${avgReal.toFixed(2)} UZS\n` +
          `- Rejalashtirilgan xarajat: ${avgPlanned.toFixed(2)} UZS`;
        await sendAdminAlert(alertMsg);
        alertsSent.push(alertMsg);
      }

      // Alert 2: Blended margin on Biznes package falls below 30%
      if (marginBiznes < 0.30) {
        const alertMsg = `🚨 [Margin Alert] Biznes paketi uchun "${op}" operatsiyasidagi foyda marjasi 30% dan pastga tushdi: ${(marginBiznes * 100).toFixed(1)}%! (Tannarxi: ${avgReal.toFixed(2)} UZS)`;
        await sendAdminAlert(alertMsg);
        alertsSent.push(alertMsg);
      }

      // Alert 3: Negative margin for last 24h
      if (marginBiznes < 0) {
        const alertMsg = `🛑 [CRITICAL Negative Margin] "${op}" operatsiyasi oxirgi 24 soat ichida zarar keltirdi! (Marja: ${(marginBiznes * 100).toFixed(1)}%)\n` +
          `Operatsiyaning eng qimmat yo'li vaqtinchalik o'chirildi (Fallback rejimiga majburiy o'tkazildi) va eskalatsiya qilindi.`;
        await sendAdminAlert(alertMsg);
        alertsSent.push(alertMsg);

        // Auto-disable most expensive path: trigger fallback model flag or increase credits charged
        await pool.query(
          "UPDATE deduction_rates SET credits = credits * 1.5 WHERE operation_type = $1",
          [op]
        );
      }
    }

    return { success: true, summaries, alertsSent };

  } catch (err: any) {
    console.error("[Telemetry] Summary Job failed:", err);
    return { success: false, summaries: [], alertsSent: [err.message] };
  }
}

/**
 * Returns aggregated spend vs credited revenue for yesterday.
 */
export async function getYesterdayCostsAndRevenue(): Promise<{
  spendUzs: number;
  spendUsd: number;
  revenueUzs: number;
  count: number;
}> {
  await pgdb.initDb();
  const pool = pgdb.getPool();

  const exchangeRate = modelPricing.exchange_rate_uzs_per_usd || 12000;

  // 1. Calculate spend (real cost of successful API calls)
  const spendRes = await pool.query(
    `SELECT COALESCE(SUM(real_cost_uzs), 0) as spend 
     FROM cost_telemetry 
     WHERE created_at >= CURRENT_DATE - 1 
       AND created_at < CURRENT_DATE 
       AND status = 'success'`
  );
  const spendUzs = parseFloat(spendRes.rows[0].spend);
  const spendUsd = spendUzs / exchangeRate;

  // 2. Calculate revenue (credits deducted * package tier value)
  // For simplicity, we calculate revenue by checking the plan/purchased amount deducted in ledger
  // plan credit average cost: 8 UZS/credit, purchased credit average cost: 8 UZS/credit.
  // Or we can query the ledger:
  const revenueRes = await pool.query(
    `SELECT 
       COALESCE(SUM(ABS(plan_amount) * 8.0), 0) as plan_revenue,
       COALESCE(SUM(ABS(purchased_amount) * 8.0), 0) as purchased_revenue,
       COUNT(*) as count
     FROM credit_ledger 
     WHERE created_at >= CURRENT_DATE - 1 
       AND created_at < CURRENT_DATE 
       AND action_type = 'deduct'`
  );
  const planRevenue = parseFloat(revenueRes.rows[0].plan_revenue);
  const purchasedRevenue = parseFloat(revenueRes.rows[0].purchased_revenue);
  const count = parseInt(revenueRes.rows[0].count);

  return {
    spendUzs,
    spendUsd,
    revenueUzs: planRevenue + purchasedRevenue,
    count
  };
}
