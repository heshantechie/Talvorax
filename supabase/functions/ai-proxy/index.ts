// ─── Supabase Edge Function: ai-proxy ─────────────────────────────────────────
// Handles Groq API key rotation when a key hits its rate/daily limit.
// Keys are stored as Supabase secrets:
//   GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3 ... (up to 10)
//
// Set secrets via Supabase CLI:
//   supabase secrets set GROQ_API_KEY_1=gsk_xxx GROQ_API_KEY_2=gsk_yyy
//
// Or via Supabase Dashboard → Project Settings → Edge Functions → Secrets
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Groq API Config ──────────────────────────────────────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 8000;

// ─── Load All API Keys from Supabase Secrets ──────────────────────────────────
// Reads GROQ_API_KEY_1 through GROQ_API_KEY_10.
// Empty/missing keys are skipped automatically.
// Also supports the legacy single-key secret name GROQ_API_KEY.
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
  if (status === 429) return true;
  if (status === 503) return true; // Groq overload
  const lowerBody = body.toLowerCase();
  return (
    lowerBody.includes("rate limit") ||
    lowerBody.includes("quota") ||
    lowerBody.includes("limit exceeded") ||
    lowerBody.includes("too many requests") ||
    lowerBody.includes("rate_limit_exceeded") ||
    lowerBody.includes("tokens per day") ||
    lowerBody.includes("requests per day")
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
  error?: string;
}

// Detects Groq's JSON-mode failure. When the model can't produce complete valid
// JSON (usually because a large generation truncates at max_tokens), Groq returns
// HTTP 400 with a json_validate_failed code instead of content. Retrying the same
// request WITHOUT response_format lets the model stream plain text that the
// frontend's tolerant parser can still extract JSON from.
function isJsonModeFailure(status: number, body: string): boolean {
  if (status !== 400) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("json_validate_failed") ||
    lower.includes("json validate") ||
    lower.includes("failed_generation") ||
    lower.includes("valid json") ||
    lower.includes("json mode")
  );
}

// ─── Call Groq With a Specific Key ───────────────────────────────────────────
async function callGroqWithKey(
  apiKey: string,
  keyIndex: number,
  messages: GroqMessage[],
  responseFormat?: { type: string },
  disableJsonMode = false
): Promise<CallGroqResult> {
  const requestBody: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: 0.3,
  };
  if (responseFormat && !disableJsonMode) {
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
    // JSON-mode rejection (e.g. truncated large rewrite) → retry once without it.
    if (responseFormat && !disableJsonMode && isJsonModeFailure(response.status, rawText)) {
      console.warn(
        `[ai-proxy] Key #${keyIndex + 1} JSON mode rejected (HTTP ${response.status}). Retrying without response_format...`
      );
      return callGroqWithKey(apiKey, keyIndex, messages, responseFormat, true);
    }
    return {
      success: false,
      error: `Groq API error on key #${keyIndex + 1} (HTTP ${response.status}): ${rawText}`,
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
    // Some truncated JSON-mode generations return the partial text under
    // failed_generation instead of message.content — recover it if present.
    const failed = (choices?.[0] as Record<string, unknown>)?.failed_generation as string | undefined;
    if (failed && failed.trim().length > 0) {
      console.warn(`[ai-proxy] Key #${keyIndex + 1} returned failed_generation; recovering partial content.`);
      return { success: true, content: failed };
    }
    return { success: false, error: "Empty content received from Groq API" };
  }

  console.log(`[ai-proxy] ✅ Key #${keyIndex + 1} succeeded.`);
  return { success: true, content };
}

// ─── Main Edge Function Handler ───────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Authenticate: Verify Supabase user JWT ─────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Auth session missing. Please log in." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userToken = authHeader.replace("Bearer ", "");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid JWT. Please log in again." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

  console.log(`[ai-proxy] ${apiKeys.length} key(s) available. Starting with key #1.`);

  // ── Key Rotation Loop ─────────────────────────────────────────────────────
  // Try each key in sequence.
  // Rate limit → rotate to next key.
  // Other error → return immediately (no rotation).
  // All keys exhausted → return 429.
  for (let i = 0; i < apiKeys.length; i++) {
    const result = await callGroqWithKey(apiKeys[i], i, messages, response_format);

    if (result.success && result.content) {
      // ✅ Return successful response to the frontend
      return new Response(
        JSON.stringify({ content: result.content }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.rateLimited) {
      // 🔄 Rate limited — try next key
      if (i < apiKeys.length - 1) {
        console.log(`[ai-proxy] 🔄 Switching to key #${i + 2}...`);
      }
      continue;
    }

    // ❌ Non-rate-limit error — fail fast, don't rotate
    console.error(`[ai-proxy] Non-retryable error: ${result.error}`);
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── All Keys Exhausted ────────────────────────────────────────────────────
  const msg = `All ${apiKeys.length} Groq API key(s) have hit their rate/daily limits. Please add more keys or try again later.`;
  console.error(`[ai-proxy] ❌ ${msg}`);
  return new Response(
    JSON.stringify({ error: msg, allKeysExhausted: true }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
