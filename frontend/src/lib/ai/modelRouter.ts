import modelConfig from "@/config/models.json";
import modelPricing from "@/config/model_pricing.json";
import * as pgdb from "@/lib/pgdb";

export interface ModelRoute {
  primary_model: string;
  fallback_model: string | null;
  max_retries: number;
  params: Record<string, any>;
}

export interface GeminiCallResult {
  text: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cachedTokens: number;
  latencyMs: number;
  status: "success" | "error" | "fallback";
  fallbackUsed: boolean;
  error?: string;
}

/**
 * Gets the configuration for a specific AI operation.
 */
export function getOperationConfig(operation: string): ModelRoute | null {
  const operations = modelConfig.operations as Record<string, any>;
  return (operations[operation] as ModelRoute) || null;
}

/**
 * Executes a Gemini API call with retries and fallback logic.
 * Enforces removal of temperature, top_p, and top_k parameters for Gemini 3.x models.
 */
export async function executeGeminiCall(params: {
  operationType: "chat_reply" | "lead_qualification" | "link_analysis" | "pdf_analysis" | "image_analysis";
  contents: any[];
  systemInstruction?: string;
  apiKey?: string;
  cachedContentName?: string; // Cache resource name for Gemini Context Caching
  idempotencyKey?: string;
  userId: string;
}): Promise<GeminiCallResult> {
  const { operationType, contents, systemInstruction, cachedContentName, idempotencyKey, userId } = params;
  const config = getOperationConfig(operationType);
  if (!config) {
    throw new Error(`AI operation config not found for: ${operationType}`);
  }

  const apiKey = params.apiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("Gemini API key is missing");
  }

  let modelToUse = config.primary_model;
  let fallbackUsed = false;
  let attemptStatus: "success" | "error" | "fallback" = "success";
  
  const startTime = Date.now();

  try {
    const response = await executeWithRetriesAndFallback({
      model: config.primary_model,
      fallbackModel: config.fallback_model,
      contents,
      systemInstruction,
      cachedContentName,
      config,
      apiKey,
      maxRetries: config.max_retries
    });

    const latencyMs = Date.now() - startTime;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extract metadata tokens
    const usageMetadata = response.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;
    const cachedTokens = usageMetadata.promptTokensDetails?.[0]?.cachedContentTokenCount || 0;
    
    // Extract thinking tokens (Gemini 2.x/3.x structure)
    let thinkingTokens = 0;
    const candidateDetails = usageMetadata.candidatesTokenDetails?.[0];
    if (candidateDetails && typeof candidateDetails === "object") {
      thinkingTokens = (candidateDetails as any).thoughtsTokenCount || (candidateDetails as any).thinking_token_count || 0;
    }

    const actualModel = response.modelUsed || modelToUse;
    if (actualModel !== config.primary_model) {
      fallbackUsed = true;
      attemptStatus = "fallback";
    }

    const result: GeminiCallResult = {
      text: responseText,
      modelUsed: actualModel,
      inputTokens,
      outputTokens,
      thinkingTokens,
      cachedTokens,
      latencyMs,
      status: attemptStatus,
      fallbackUsed
    };

    // Async log cost telemetry (don't block the caller)
    logCostTelemetryAsync({
      userId,
      modelId: actualModel,
      operationType,
      inputTokens,
      outputTokens,
      thinkingTokens,
      cachedTokens,
      latencyMs,
      status: attemptStatus,
      fallbackUsed,
      idempotencyKey
    }).catch(err => console.error("[Telemetry] Failed to log cost telemetry:", err));

    return result;

  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errMsg = err.message || String(err);
    
    // Log failed call to telemetry
    logCostTelemetryAsync({
      userId,
      modelId: modelToUse,
      operationType,
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      cachedTokens: 0,
      latencyMs,
      status: "error",
      fallbackUsed: false,
      idempotencyKey
    }).catch(tErr => console.error("[Telemetry] Failed to log error telemetry:", tErr));

    return {
      text: "",
      modelUsed: modelToUse,
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      cachedTokens: 0,
      latencyMs,
      status: "error",
      fallbackUsed: false,
      error: errMsg
    };
  }
}

/**
 * Handles the retry loop and fallbacks dynamically.
 */
async function executeWithRetriesAndFallback(args: {
  model: string;
  fallbackModel: string | null;
  contents: any[];
  systemInstruction?: string;
  cachedContentName?: string;
  config: ModelRoute;
  apiKey: string;
  maxRetries: number;
}): Promise<any> {
  const { model, fallbackModel, contents, systemInstruction, cachedContentName, config, apiKey, maxRetries } = args;

  let lastError: any = null;
  let delay = 1000;

  // 1. Try Primary Model
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await makeRawGeminiApiCall({
        model,
        contents,
        systemInstruction,
        cachedContentName,
        config,
        apiKey
      });
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err.status === 429;
      const isServerError = err.status >= 500 && err.status < 600;
      const isModelNotFound = err.status === 404 || (err.message && err.message.includes("not found"));

      console.warn(`[ModelRouter] Primary model attempt ${attempt + 1}/${maxRetries} failed: Status ${err.status}. Error: ${err.message}`);

      // Model deprecation / not found trigger direct fallback immediately
      if (isModelNotFound) {
        break;
      }

      if (isRateLimit || isServerError) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
      } else {
        // Non-transient client error (e.g. invalid request body) - don't retry, just fail or try fallback
        break;
      }
    }
  }

  // 2. Try Fallback Model if primary failed and fallback model is configured
  if (fallbackModel) {
    console.warn(`[ModelRouter] Primary model failed permanently. Initiating fallback to: ${fallbackModel}`);
    delay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await makeRawGeminiApiCall({
          model: fallbackModel,
          contents,
          systemInstruction,
          cachedContentName,
          config,
          apiKey
        });
        // Attach the actual model used to the response
        response.modelUsed = fallbackModel;
        return response;
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err.status === 429;
        const isServerError = err.status >= 500 && err.status < 600;

        console.error(`[ModelRouter] Fallback model attempt ${attempt + 1}/${maxRetries} failed: Status ${err.status}. Error: ${err.message}`);

        if (isRateLimit || isServerError) {
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("AI call execution failed");
}

/**
 * Makes the raw HTTP request to Google's Gemini API v1beta endpoint.
 * Strips temperature, top_p, top_k parameters for 3.x models.
 */
async function makeRawGeminiApiCall(args: {
  model: string;
  contents: any[];
  systemInstruction?: string;
  cachedContentName?: string;
  config: ModelRoute;
  apiKey: string;
}): Promise<any> {
  const { model, contents, systemInstruction, cachedContentName, config, apiKey } = args;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: Record<string, any> = {
    contents
  };

  if (systemInstruction) {
    requestBody.system_instruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  // If caching is requested and name is valid (Task 2)
  if (cachedContentName) {
    requestBody.cachedContent = cachedContentName;
  }

  // Build generationConfig using the operation params (e.g. response_mime_type)
  const generationConfig: Record<string, any> = {};
  if (config.params) {
    if (config.params.response_mime_type) {
      generationConfig.responseMimeType = config.params.response_mime_type;
    }
    // Set thinking budget if model is a thinking model or configured
    if (config.params.thinking_config) {
      generationConfig.thinkingConfig = config.params.thinking_config;
    }
  }

  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedError: any = {};
    try {
      parsedError = JSON.parse(errorText);
    } catch {
      // ignore
    }
    const apiErrorMessage = parsedError?.error?.message || errorText || "Unknown Gemini API Error";
    
    const errorObj: any = new Error(apiErrorMessage);
    errorObj.status = response.status;
    throw errorObj;
  }

  return await response.json();
}

/**
 * Asynchronously logs telemetry to PostgreSQL database without blocking client execution.
 */
async function logCostTelemetryAsync(data: {
  userId: string;
  modelId: string;
  operationType: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cachedTokens: number;
  latencyMs: number;
  status: "success" | "error" | "fallback";
  fallbackUsed: boolean;
  idempotencyKey?: string;
}): Promise<void> {
  if (!pgdb.isConfigured()) return;

  const exchangeRate = modelPricing.exchange_rate_uzs_per_usd || 12000;
  
  let realCostUzs = 0;
  if (data.modelId === "aisha-stt") {
    const minutes = data.inputTokens || 1;
    realCostUzs = minutes * (modelPricing.external?.aisha_stt?.uzs_per_minute || 120);
  } else {
    // Look up model pricing from config
    const prices = (modelPricing.models as Record<string, any>)[data.modelId] || modelPricing.models["gemini-3.1-flash-lite"];
    const inputCostUsd = (data.inputTokens - data.cachedTokens) * (prices.input_usd_per_m / 1000000);
    const cachedCostUsd = data.cachedTokens * (prices.cached_input_usd_per_m / 1000000);
    const outputCostUsd = data.outputTokens * (prices.output_usd_per_m / 1000000);
    
    const totalCostUsd = inputCostUsd + cachedCostUsd + outputCostUsd;
    realCostUzs = totalCostUsd * exchangeRate;
  }

  // Planned Cost lookup from config
  const plannedCostUzs = (modelPricing.planned_costs as Record<string, number>)[data.operationType] || 0.00;

  try {
    const pool = (pgdb as any).getPool();
    await pool.query(
      `INSERT INTO cost_telemetry (
        user_id, model_id, operation_type, input_tokens, output_tokens, 
        thinking_tokens, cached_tokens, latency_ms, real_cost_uzs, 
        planned_cost_uzs, status, fallback_used, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        data.userId,
        data.modelId,
        data.operationType,
        data.inputTokens,
        data.outputTokens,
        data.thinkingTokens,
        data.cachedTokens,
        data.latencyMs,
        realCostUzs,
        plannedCostUzs,
        data.status,
        data.fallbackUsed,
        data.idempotencyKey || null
      ]
    );
  } catch (err) {
    console.error("[Telemetry] Database insertion failed:", err);
  }
}
