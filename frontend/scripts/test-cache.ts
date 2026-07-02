import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { initDb, getPool } from "../src/lib/pgdb";
import { calculateKbHash, getOrBuildContextCache } from "../src/lib/ai/contextCache";

async function setupCacheTestDb() {
  await initDb();
  const pool = getPool();
  // Clean caches table
  await pool.query("TRUNCATE TABLE context_caches CASCADE");
}

async function runCacheTests() {
  console.info("⚡ Starting Sendly Context Caching Unit Tests...");
  await setupCacheTestDb();

  const apiKey = process.env.GEMINI_API_KEY || "mock-api-key";

  // 1. Mock Lessons & Modules
  const lessons = [
    { id: "les-1", moduleId: "mod-1", title: "Kirish", transcript: "Marketing kursiga xush kelibsiz." },
    { id: "les-2", moduleId: "mod-1", title: "Targeting", transcript: "Facebook targeting sozlamalari..." }
  ];
  const modules = [
    { id: "mod-1", title: "Instagram marketing", order: 1 }
  ];

  // ─── TEST 1: Hash Calculation & Content Sensitivity ─────────────────────────
  console.info("\n🧪 Test 1: Calculating KB Hash...");
  const hash1 = calculateKbHash(lessons, modules);
  const hash2 = calculateKbHash(lessons, modules);
  
  if (hash1 !== hash2) {
    throw new Error("Identical content produced different hashes!");
  }
  console.info(`✅ Hash calculated successfully: ${hash1}`);

  // Modify lesson transcript slightly
  const modifiedLessons = [
    { id: "les-1", moduleId: "mod-1", title: "Kirish", transcript: "Marketing kursiga xush kelibsiz! (Yangilandi)" },
    { id: "les-2", moduleId: "mod-1", title: "Targeting", transcript: "Facebook targeting sozlamalari..." }
  ];
  const hash3 = calculateKbHash(modifiedLessons, modules);
  if (hash1 === hash3) {
    throw new Error("Modified content produced the same hash!");
  }
  console.info(`✅ Content modification successfully generated different hash: ${hash3}`);

  // ─── TEST 2: Threshold Check (Estimated Tokens < 32k) ──────────────────────
  console.info("\n🧪 Test 2: Low-token prompt threshold check...");
  const smallContext = "Short training manual text for small database.";
  const cacheNameSmall = await getOrBuildContextCache(hash1, smallContext, apiKey);
  if (cacheNameSmall !== null) {
    throw new Error("Expected null cache name for small context, but got cacheName!");
  }
  console.info("✅ Correctly skipped caching for small context (<90,000 chars).");

  // ─── TEST 3: Caching Flow Mocking / Execution ──────────────────────────────
  console.info("\n🧪 Test 3: Simulating Caching with Large Context (>90k chars)...");
  // Build a dummy context string of 100k chars
  const largeContext = "Foydali marketing darsligi. ".repeat(4000); // ~108,000 characters
  
  // Note: Since calling Gemini API with a mock key or real key might trigger actual network call,
  // we can mock the fetch function or if using the real API key, test cache creation.
  // Let's mock global.fetch to return a valid response to test the caching logic end-to-end without spending real API tokens!
  const originalFetch = global.fetch;
  
  const tracker: any = { apiCallCount: 0 };
  global.fetch = async (url: any, options: any) => {
    if (String(url).includes("cachedContents")) {
      tracker.apiCallCount++;
      return {
        ok: true,
        json: async () => ({
          name: `cachedContents/mock-cache-id-${Date.now()}`
        })
      } as any;
    }
    return originalFetch(url, options);
  };

  try {
    const cacheName1 = await getOrBuildContextCache(hash1, largeContext, apiKey);
    console.info(`First cache call resolved name: ${cacheName1}`);
    if (!cacheName1 || !cacheName1.startsWith("cachedContents/")) {
      throw new Error(`Expected valid cache name, got: ${cacheName1}`);
    }
    if (tracker.apiCallCount !== 1) {
      throw new Error(`Expected exactly 1 API call to build cache, got ${tracker.apiCallCount}`);
    }

    // Call again with the same hash (should read from DB cache, no API call!)
    const cacheName2 = await getOrBuildContextCache(hash1, largeContext, apiKey);
    console.info(`Second cache call resolved name: ${cacheName2}`);
    if (cacheName1 !== cacheName2) {
      throw new Error(`Expected identical cache name on hit, got: ${cacheName2}`);
    }
    if (tracker.apiCallCount !== 1) {
      throw new Error(`Expected zero API calls on cache hit (should load from DB), but apiCallCount is ${tracker.apiCallCount}`);
    }
    console.info("✅ Cache successfully retrieved from local DB on hit.");

    // Call with modified hash (different content) -> should trigger new cache creation!
    const cacheName3 = await getOrBuildContextCache(hash3, largeContext, apiKey);
    console.info(`Third cache call (modified content) resolved name: ${cacheName3}`);
    if (cacheName3 === cacheName1) {
      throw new Error("Expected new cache name for different hash, but got the same one!");
    }
    if (tracker.apiCallCount !== 2) {
      throw new Error(`Expected 2 API calls in total, got ${tracker.apiCallCount}`);
    }
    console.info("✅ Cache successfully invalidated and rebuilt on content hash change.");

  } finally {
    // Restore fetch
    global.fetch = originalFetch;
  }

  console.info("\n🎉 All 3 Sendly Context Caching Unit Tests Passed Successfully!");
}

runCacheTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Cache test run failed with error:", err);
    process.exit(1);
  });
