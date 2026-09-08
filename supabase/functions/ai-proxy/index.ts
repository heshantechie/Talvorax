// ─── Supabase Edge Function: ai-proxy ─────────────────────────────────────────
// Handles Groq API key rotation and model fallback when a key hits limits or models change.
// Keys are stored as Supabase secrets:
//   GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3 ... (up to 10)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-region, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Groq API Config & Active Models ──────────────────────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Active models on Groq in priority order
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
  "groq/compound-mini",
];

const MAX_TOKENS = 8000;

// ─── Load All API Keys from Supabase Secrets ──────────────────────────────────
function loadApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = Deno.env.get(`GROQ_API_KEY_${i}`);
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }
  // Fallback: legacy single-key secret
  const legacyKey = Deno.env.get("GROQ_API_KEY");
  if (legacyKey && legacyKey.trim().length > 0 && !keys.includes(legacyKey.trim())) {
    keys.push(legacyKey.trim());
  }
  return keys;
}

// ─── Rate Limit / Quota Error Detection ──────────────────────────────────────
function isRateLimitError(status: number, body: string): boolean {
  if (status === 429 || status === 503) return true;
  const lowerBody = body.toLowerCase();
  return (
    lowerBody.includes("rate_limit_exceeded") ||
    lowerBody.includes("tokens per day") ||
    lowerBody.includes("requests per day")
  );
}

function isModelNotFoundError(status: number, body: string): boolean {
  if (status === 404) return true;
  const lowerBody = body.toLowerCase();
  return (
    lowerBody.includes("model_not_found") ||
    lowerBody.includes("does not exist") ||
    lowerBody.includes("do not have access") ||
    lowerBody.includes("decommissioned")
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallGroqResult {
  success: boolean;
  content?: string;
  rateLimited?: boolean;
  modelNotFound?: boolean;
  error?: string;
}

// ─── Call Groq With a Specific Key and Model ──────────────────────────────────
async function callGroqWithKeyAndModel(
  apiKey: string,
  keyIndex: number,
  modelName: string,
  messages: GroqMessage[],
  responseFormat?: { type: string }
): Promise<CallGroqResult> {
  const requestBody: Record<string, unknown> = {
    model: modelName,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: 0.3,
  };
  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  let response: Response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    return { success: false, error: `Network error on key #${keyIndex + 1}: ${msg}` };
  }

  const rawText = await response.text();

  if (!response.ok) {
    if (isRateLimitError(response.status, rawText)) {
      console.warn(
        `[ai-proxy] Key #${keyIndex + 1} hit rate/quota limit (HTTP ${response.status}). Rotating to next key...`
      );
      return { success: false, rateLimited: true };
    }
    if (isModelNotFoundError(response.status, rawText)) {
      console.warn(
        `[ai-proxy] Model '${modelName}' not found or deprecated (HTTP ${response.status}). Trying fallback model...`
      );
      return { success: false, modelNotFound: true };
    }
    console.error(`[ai-proxy] Groq error on key #${keyIndex + 1} with model '${modelName}' (HTTP ${response.status}): ${rawText}`);
    return {
      success: false,
      error: `Groq API error on key #${keyIndex + 1} with model '${modelName}' (HTTP ${response.status}): ${rawText}`,
    };
  }

  // Parse successful response
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { success: false, error: "Failed to parse Groq response JSON" };
  }

  const choices = parsed?.choices as Array<Record<string, unknown>> | undefined;
  const content = (choices?.[0]?.message as Record<string, unknown>)?.content as string | undefined;

  if (!content) {
    return { success: false, error: "Empty content received from Groq API" };
  }

  console.log(`[ai-proxy] ✅ Key #${keyIndex + 1} succeeded with model '${modelName}'.`);
  return { success: true, content };
}

// ─── Main Edge Function Handler ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Authenticate: Verify Supabase user JWT if present ─────────────────────
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const userToken = authHeader.replace("Bearer ", "");

      if (supabaseUrl && supabaseAnonKey && userToken && userToken !== supabaseAnonKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
          });

          const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
          if (authError || !user) {
            console.warn("[ai-proxy] JWT auth verification note:", authError?.message);
          } else {
            console.log(`[ai-proxy] Authenticated user: ${user.email || user.id}`);
          }
        } catch (e) {
          console.warn("[ai-proxy] Auth check exception:", e);
        }
      }
    }

    // ── Parse Request Body ────────────────────────────────────────────────────
    let body: { messages?: GroqMessage[]; response_format?: { type: string } };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, response_format } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Load API Keys from Supabase Secrets ──────────────────────────────────
    const apiKeys = loadApiKeys();

    if (apiKeys.length === 0) {
      console.error("[ai-proxy] ❌ No Groq API keys configured in Supabase secrets.");
      return new Response(
        JSON.stringify({ error: "AI service not configured. No API keys found in secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-proxy] ${apiKeys.length} key(s) available.`);

    // ── Key Rotation & Model Fallback Loop ───────────────────────────────────
    let lastError = "";

    for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
      for (let modelIdx = 0; modelIdx < GROQ_MODELS.length; modelIdx++) {
        const currentModel = GROQ_MODELS[modelIdx];
        const result = await callGroqWithKeyAndModel(
          apiKeys[keyIdx],
          keyIdx,
          currentModel,
          messages,
          response_format
        );

        if (result.success && result.content) {
          return new Response(
            JSON.stringify({ content: result.content }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (result.modelNotFound) {
          // Model not found on this key/account, try next model
          continue;
        }

        if (result.rateLimited) {
          // Key hit rate limit, break model loop and rotate to next key
          break;
        }

        // Non-rate-limit, non-model-not-found error (e.g. format issue on specific model)
        lastError = result.error || "Unknown Groq API error";
        console.warn(`[ai-proxy] Error on key #${keyIdx + 1} with model '${currentModel}': ${lastError}`);
        continue;
      }
    }

    // ── If all keys/models failed ─────────────────────────────────────────────
    const msg = lastError || `All ${apiKeys.length} Groq API key(s) have hit rate/daily limits or encountered errors.`;
    console.error(`[ai-proxy] ❌ ${msg}`);
    return new Response(
      JSON.stringify({ error: msg, details: lastError, allKeysExhausted: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ai-proxy] Unhandled exception:", errorMsg);
    return new Response(
      JSON.stringify({ error: "Internal server error in AI proxy", details: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
