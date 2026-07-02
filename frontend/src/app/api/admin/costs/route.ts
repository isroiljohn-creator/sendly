import { NextResponse } from "next/server";
import { runDailyTelemetryJob, getYesterdayCostsAndRevenue } from "@/lib/telemetry";
import { runReconciliationJob, runExpiryJob } from "@/lib/billing";

export async function GET(req: Request) {
  try {
    // 1. Run reconciliation and expiry jobs to ensure latest data is synced
    await runExpiryJob();
    await runReconciliationJob();

    // 2. Aggregate telemetry data for summary
    const telemetryResult = await runDailyTelemetryJob();
    
    // 3. Get yesterday's cost and revenue metrics
    const metrics = await getYesterdayCostsAndRevenue();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      yesterday_metrics: {
        total_operations: metrics.count,
        real_api_spend_uzs: metrics.spendUzs,
        real_api_spend_usd: metrics.spendUsd,
        revenue_credited_uzs: metrics.revenueUzs,
        gross_margin_uzs: metrics.revenueUzs - metrics.spendUzs,
        gross_margin_percentage: metrics.revenueUzs > 0 
          ? ((metrics.revenueUzs - metrics.spendUzs) / metrics.revenueUzs) * 100 
          : 0.0
      },
      operation_breakdown: telemetryResult.summaries,
      alerts_triggered: telemetryResult.alertsSent
    });

  } catch (err: any) {
    console.error("[Admin Cost API Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
