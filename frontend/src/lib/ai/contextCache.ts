import crypto from "crypto";
import * as pgdb from "@/lib/pgdb";

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  transcript: string;
  pdfMaterials?: string[];
}

export interface Module {
  id: string;
  title: string;
  order: number;
}

/**
 * Computes a deterministic SHA256 hash over the actual text content of lessons and modules.
 */
export function calculateKbHash(lessons: Lesson[], modules: Module[]): string {
  const sortedLessons = [...lessons].sort((a, b) => a.id.localeCompare(b.id));
  const sortedModules = [...modules].sort((a, b) => a.id.localeCompare(b.id));
  
  const payload = JSON.stringify({
    lessons: sortedLessons.map(l => ({ id: l.id, t: l.title, c: l.transcript })),
    modules: sortedModules.map(m => ({ id: m.id, t: m.title, o: m.order }))
  });
  
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Resolves an active context cache for the given kb_hash, or builds a new one using the Gemini API.
 * Skips caching if estimated tokens is below Gemini's 32,768 tokens threshold.
 */
export async function getOrBuildContextCache(
  kbHash: string,
  contextText: string,
  apiKey: string
): Promise<string | null> {
  // 1. Estimation check: 32,768 tokens roughly corresponds to 90,000-100,000 characters.
  // If it's too small, don't waste API calls, return null (non-cached execution).
  if (contextText.length < 90000) {
    return null;
  }

  const pool = pgdb.getPool();

  try {
    // 2. Check database for existing, unexpired cache
    const cacheRes = await pool.query(
      "SELECT cache_name FROM context_caches WHERE kb_hash = $1 AND expires_at > NOW()",
      [kbHash]
    );

    if (cacheRes.rows.length > 0) {
      return cacheRes.rows[0].cache_name;
    }

    // 3. Call Google Gemini API to create a new cached content
    // API endpoint: POST https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}
    console.info(`[ContextCache] Creating new Gemini Context Cache for kb_hash: ${kbHash}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-2.5-flash",
        displayName: `kb_cache_${kbHash.substring(0, 10)}`,
        ttl: "3600s", // 1 hour TTL
        contents: [
          {
            role: "user",
            parts: [{ text: contextText }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[ContextCache] Failed to create Gemini context cache. Status: ${response.status}. Response: ${errText}`);
      return null;
    }

    const data = await response.json();
    const cacheName = data.name; // Format: cachedContents/abcdef123456
    
    // 4. Save to database context_caches table
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    await pool.query(
      `INSERT INTO context_caches (kb_hash, cache_name, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (kb_hash) 
       DO UPDATE SET cache_name = EXCLUDED.cache_name, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [kbHash, cacheName, expiresAt]
    );

    return cacheName;

  } catch (err) {
    console.error("[ContextCache] Unexpected error resolving context cache:", err);
    return null;
  }
}
