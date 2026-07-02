import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import * as pgdb from "../src/lib/pgdb";
import { seedBillingConfigs, calculateOperationCredits } from "../src/lib/billing";

async function runPricingDbTests() {
  console.info("⚡ Starting Sendly Pricing Database & Rules Unit Tests...");

  await pgdb.initDb();
  const pool = pgdb.getPool();

  // Run seeding
  console.info("⚙️ Seeding billing configs...");
  await seedBillingConfigs();

  // ─── TEST 1: Verify Seeded Deduction Rates ───────────────────────────────
  console.info("\n🧪 Test 1: Verifying seeded deduction rates...");
  const ratesRes = await pool.query("SELECT * FROM deduction_rates ORDER BY operation_type");
  console.info(`Found ${ratesRes.rows.length} deduction rates.`);
  
  const rateMap = new Map(ratesRes.rows.map(r => [r.operation_type, r]));
  
  const expectedRates = [
    { op: "chat_reply", cr: 10, unit: "flat" },
    { op: "lead_qualification", cr: 10, unit: "flat" },
    { op: "link_analysis", cr: 20, unit: "flat" },
    { op: "pdf_analysis", cr: 50, unit: "page_increment" },
    { op: "audio_transcription", cr: 50, unit: "increment_15s" },
    { op: "image_analysis", cr: 20, unit: "flat" }
  ];

  for (const exp of expectedRates) {
    const act = rateMap.get(exp.op);
    if (!act) {
      throw new Error(`Missing expected deduction rate for operation: ${exp.op}`);
    }
    if (act.credits !== exp.cr || act.unit !== exp.unit) {
      throw new Error(`Deduction rate mismatch for ${exp.op}: expected ${exp.cr} cr (${exp.unit}), got ${act.credits} cr (${act.unit})`);
    }
    console.info(`✅ Rate verified: ${exp.op} -> ${exp.cr} credits (${exp.unit})`);
  }

  // ─── TEST 2: Non-Flat Rate Math Tests ────────────────────────────────────
  console.info("\n🧪 Test 2: Verifying non-flat rate calculation formulas...");

  // page_increment: 7 pages -> 50 cr; 10 pages -> 50 cr; 11 pages -> 80 cr; 25 pages -> 110 cr.
  const pdfTests = [
    { pages: 7, expected: 50 },
    { pages: 10, expected: 50 },
    { pages: 11, expected: 80 },
    { pages: 25, expected: 110 }
  ];
  for (const t of pdfTests) {
    const act = await calculateOperationCredits("pdf_analysis", { pageCount: t.pages });
    console.info(`PDF Analysis (${t.pages} pages) -> calculated: ${act} cr, expected: ${t.expected} cr`);
    if (act !== t.expected) {
      throw new Error(`PDF Page increment rate mismatch: expected ${t.expected}, got ${act}`);
    }
  }
  console.info("✅ Non-flat pdf_analysis page_increment math verified.");

  // increment_15s: 12 sec -> 13 cr; 15 sec -> 13 cr; 16 sec -> 25 cr; 60 sec -> 50 cr; 61 sec -> 63 cr.
  const audioTests = [
    { sec: 12, expected: 13 },
    { sec: 15, expected: 13 },
    { sec: 16, expected: 25 },
    { sec: 60, expected: 50 },
    { sec: 61, expected: 63 }
  ];
  for (const t of audioTests) {
    const act = await calculateOperationCredits("audio_transcription", { durationSeconds: t.sec });
    console.info(`Audio Transcribe (${t.sec} seconds) -> calculated: ${act} cr, expected: ${t.expected} cr`);
    if (act !== t.expected) {
      throw new Error(`Audio 15s increment rate mismatch: expected ${t.expected}, got ${act}`);
    }
  }
  console.info("✅ Non-flat audio_transcription increment_15s math verified.");

  // ─── TEST 3: Verify Seeded Credit Packages ──────────────────────────────
  console.info("\n🧪 Test 3: Verifying seeded credit packages...");
  const pkgRes = await pool.query("SELECT * FROM credit_packages ORDER BY name");
  console.info(`Found ${pkgRes.rows.length} packages.`);
  
  const pkgMap = new Map(pkgRes.rows.map(p => [p.name, p]));
  
  const expectedPackages = [
    { name: "Starter", cr: 10000, price: 100000 },
    { name: "Standart", cr: 50000, price: 400000 },
    { name: "Biznes", cr: 150000, price: 1050000 }
  ];

  for (const exp of expectedPackages) {
    const act = pkgMap.get(exp.name);
    if (!act) {
      throw new Error(`Missing expected package: ${exp.name}`);
    }
    if (act.credits !== exp.cr || act.price_uzs !== exp.price) {
      throw new Error(`Package mismatch for ${exp.name}: expected ${exp.cr} cr at ${exp.price} UZS, got ${act.credits} cr at ${act.price_uzs} UZS`);
    }
    // Verify price check constraint (price >= credits * 7)
    if (act.price_uzs < act.credits * 7) {
      throw new Error(`Package ${exp.name} violates 7.0 UZS/credit floor constraint!`);
    }
    console.info(`✅ Package verified: ${exp.name} -> ${exp.cr} credits for ${act.price_uzs} UZS (Rate: ${(act.price_uzs/act.credits).toFixed(2)} UZS/cr)`);
  }

  // ─── TEST 4: Negative Pricing Constraint Check (Inserting at 6.9 UZS/cr must fail) ─────────
  console.info("\n🧪 Test 4: Verifying check constraint chk_min_credit_price prevents < 7.0 UZS/credit...");
  
  try {
    // Attempt to insert package at 6.9 UZS/credit: credits=10000, price=69000
    await pool.query(
      `INSERT INTO credit_packages (name, credits, price_uzs, active) 
       VALUES ('UnderpricedPackage', 10000, 69000, TRUE)`
    );
    throw new Error("FAIL: Database allowed inserting an underpriced package at 6.9 UZS/credit!");
  } catch (err: any) {
    if (err.message.includes("chk_min_credit_price") || err.message.includes("constraint")) {
      console.info("✅ Correctly rejected underpriced package insertion with check constraint error:", err.message);
    } else {
      throw err;
    }
  }

  console.info("\n🎉 All Pricing DB and Rules Unit Tests Passed Successfully!");
}

runPricingDbTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Pricing DB unit test failed:", err);
    process.exit(1);
  });
