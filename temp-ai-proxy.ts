import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const MODEL = "llama-3.3-70b-versatile";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Fix 10: Restrict CORS to production domain + local dev
const ALLOWED_ORIGINS = [
  'https://hirereadyai.vercel.app',
  'https://www.hirereadyai.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Rate Limiting (in-memory per instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// Input Sanitization
function sanitizeMessages(messages: Array<{ role: string; content: string }>) {
  let totalLength = 0;
  return messages.map((msg) => {
    let content = msg.content || "";
    // Extremely safe string cleaning for AI inputs
    content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    if (content.length > 50_000) content = content.substring(0, 50_000);
    totalLength += content.length;
    if (totalLength > 100_000) throw new Error("Prompt too long.");
    const validRoles = ["system", "user", "assistant"];
    return { role: validRoles.includes(msg.role) ? msg.role : "user", content };
  });
}

function jsonResponse(body: Record<string, unknown>, status = 200, req?: Request) {
  const headers = req ? getCorsHeaders(req) : getCorsHeaders(new Request('https://placeholder'));
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  try {
    // --- Auth: verify JWT using service role ---
    // We handle our own auth verification since we're using verify_jwt: false at the edge deployment level
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing authorization" }, 401, req);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized: " + (authError?.message || "Invalid token") }, 401, req);
    }

    // --- Rate limit ---
    if (!checkRateLimit(user.id)) {
      return jsonResponse({ error: "Rate limit exceeded. Max 20 requests/minute." }, 429, req);
    }

    // --- Parse body ---
    const body = await req.json();
    const { messages, response_format } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400, req);
    }

    const sanitizedMessages = sanitizeMessages(messages);

    // --- Proxy to Groq ---
    const groqBody: Record<string, unknown> = { model: MODEL, messages: sanitizedMessages };
    if (response_format) groqBody.response_format = { type: "json_object" };

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groqBody),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error(`Groq error ${groqRes.status}: ${errText}`);
      return jsonResponse({ error: `AI service error (${groqRes.status})` }, 502, req);
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content || "{}";
    return jsonResponse({ content }, 200, req);
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ error: msg }, 500, req);
  }
});
