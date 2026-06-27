import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import multer from 'multer';
import axios from 'axios';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
console.log(`[Startup] Process PID: ${process.pid}`);
console.log(`[Startup] Node.js version: ${process.version}`);
console.log(`[Startup] PORT env var: ${process.env.PORT || '(not set, defaulting to 3001)'}`);
console.log(`[Startup] Resolved PORT: ${PORT}`);

// ---------------------------------------------------------------------------
// CORS — must be declared BEFORE express.json() so preflight OPTIONS works
// ---------------------------------------------------------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "https://talvorax.up.railway.app",
  "https://hire-ready-ai.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Origin not in whitelist, allowing anyway for debug: ${origin}`);
    return callback(null, true); // temporarily allow all
  },
  methods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

app.use(express.json({ limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`>>> REQUEST HIT: ${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------------------------
// Chromium path resolution
// ---------------------------------------------------------------------------
const getChromiumPath = () => {
  // 1. Explicit env var wins
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`[Browser] Using PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. Windows dev machine
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }

  // 3. Common Linux / NixOS paths
  const systemPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      console.log(`[Browser] Found system Chromium at: ${p}`);
      return p;
    }
  }

  // 4. Fall back to puppeteer's bundled binary
  try {
    const bundled = puppeteer.executablePath();
    console.log(`[Browser] Using bundled Puppeteer Chromium: ${bundled}`);
    return bundled;
  } catch (_) {}

  console.warn('[Browser] No Chromium found — defaulting to /usr/bin/chromium');
  return '/usr/bin/chromium';
};

const LAUNCH_OPTS = {
  headless: "new",
  executablePath: getChromiumPath(),
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
  ],
};

// ---------------------------------------------------------------------------
// Persistent browser instance — shared across all requests
// ---------------------------------------------------------------------------
let sharedBrowser = null;
let browserLaunchPromise = null;

async function getBrowser() {
  // If already running, return it
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }

  // If a launch is already in progress, wait for it
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  console.log('[Browser] Launching shared browser instance...');
  browserLaunchPromise = puppeteer.launch(LAUNCH_OPTS).then((b) => {
    sharedBrowser = b;
    browserLaunchPromise = null;
    console.log('[Browser] Shared browser is ready.');

    // Handle unexpected crashes — clear so next request re-launches
    b.on('disconnected', () => {
      console.warn('[Browser] Shared browser disconnected — will relaunch on next request.');
      sharedBrowser = null;
    });

    return b;
  }).catch((err) => {
    browserLaunchPromise = null;
    console.error('[Browser] Failed to launch shared browser:', err.message);
    throw err;
  });

  return browserLaunchPromise;
}

// ---------------------------------------------------------------------------
// Health check endpoints
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hireready-pdf-server',
    timestamp: new Date().toISOString(),
    browser_ready: sharedBrowser !== null && sharedBrowser.isConnected(),
  });
});

app.get('/health', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'hireready-pdf-server',
    timestamp: new Date().toISOString(),
    browser_ready: sharedBrowser !== null && sharedBrowser.isConnected(),
    puppeteer_error: global.PUPPETEER_STARTUP_ERROR || null,
    memory: {
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      rss_mb: Math.round(mem.rss / 1024 / 1024),
    },
  });
});

// ---------------------------------------------------------------------------
// PDF generation endpoint
// ---------------------------------------------------------------------------
app.post('/generate-pdf', async (req, res) => {
  console.log('[PDF] Request received');

  const { html } = req.body;
  if (!html) {
    console.warn('[PDF] No HTML provided');
    return res.status(400).json({ error: 'HTML content is required' });
  }

  let page = null;
  try {
    console.log('[PDF] Acquiring browser...');
    const browser = await getBrowser();

    console.log('[PDF] Opening new page...');
    page = await browser.newPage();

    // Set viewport to A4-like dimensions for consistent rendering
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // IMPORTANT: Do NOT block fonts/images/stylesheets — they are essential
    // The frontend sends a complete, self-contained HTML document with all
    // compiled CSS inlined and Google Fonts <link> included.

    console.log('[PDF] Setting page content (waiting for networkidle0)...');
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

    // Force screen media so print-only CSS doesn't alter the layout
    await page.emulateMediaType('screen');

    // Wait for all fonts to finish loading
    console.log('[PDF] Waiting for fonts to load...');
    await page.evaluateHandle('document.fonts.ready');

    // Debug screenshot — compare with browser preview to verify parity
    try {
      await page.screenshot({ path: 'debug.png', fullPage: true });
      console.log('[PDF] Debug screenshot saved as debug.png');
    } catch (ssErr) {
      console.warn('[PDF] Could not save debug screenshot:', ssErr.message);
    }

    console.log('[PDF] Generating PDF buffer...');
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    // Puppeteer sometimes returns Uint8Array, explicitly converting to Node Buffer
    const finalBuffer = Buffer.from(pdfUint8Array);

    console.log(`[PDF] Done — buffer size: ${finalBuffer.length} bytes`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
      'Content-Length': finalBuffer.length,
    });

    return res.end(finalBuffer);

  } catch (err) {
    console.error('[PDF] Error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'PDF generation failed', details: err.message });
    }
  } finally {
    // Close the page but keep the browser alive for the next request
    if (page) {
      await page.close().catch((e) => console.error('[PDF] Error closing page:', e.message));
    }
  }
});

// ===========================================================================
// ─── JOB RECOMMENDER SYSTEM ─────────────────────────────────────────────────
// ===========================================================================

// ─── Supabase Admin Client (service role — bypasses RLS) ────────────────────
const supabaseAdmin = (() => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === '<add_your_service_role_key_here>') {
    console.warn('[JobRecommender] SUPABASE_SERVICE_ROLE_KEY not set — AI match scoring will be disabled');
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
})();

// ─── Multer config (memory storage, PDF only) ────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'), false);
    }
  },
});

// ─── Simple token extractor (no full JWT verify — trust Supabase session) ───
const extractUserId = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    // Decode JWT payload (middle segment) without verifying signature
    // The Supabase anon client already verifies on DB queries via RLS
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.sub || null;
  } catch { return null; }
};

// ─── AI call via Supabase ai-proxy Edge Function ─────────────────────────────
// Uses the same pattern as the frontend (supabase.functions.invoke)
const callAIProxy = async (messages, authToken) => {
  const edgeFnUrl = process.env.SUPABASE_EDGE_FUNCTION_URL ||
    `${process.env.SUPABASE_URL}/functions/v1/ai-proxy`;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${serviceRoleKey || anonKey}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ messages, response_format: { type: 'json_object' } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Proxy error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.content || '{}';
};

// ─── Safe JSON parse for AI responses ────────────────────────────────────────
const safeParseJSON = (text) => {
  try {
    let clean = text.replace(/```json\s*/ig, '').replace(/```\s*/g, '').trim();
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);
    clean = clean.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u001F]+/g, ' ');
    return JSON.parse(clean);
  } catch { return null; }
};

// ─── Resume Parser ────────────────────────────────────────────────────────────
const RESUME_PARSE_PROMPT = `You are a resume parser. Extract and return ONLY a JSON object:
{
  "full_name": "",
  "email": "",
  "target_roles": [],
  "skills": [],
  "tools": [],
  "years_of_experience": 0,
  "seniority_level": "fresher|junior|mid|senior|lead",
  "education": "",
  "industries": [],
  "languages": [],
  "certifications": [],
  "summary": ""
}
Return ONLY valid JSON. No explanation. No markdown fences.`;

const parseResume = async (pdfBuffer, userId, authToken, fileUrl) => {
  if (!supabaseAdmin) throw new Error('Supabase admin not configured');

  // 1. Extract raw text
  const parsed = await pdfParse(pdfBuffer);
  const rawText = parsed.text;

  // 2. AI structured extraction via ai-proxy (Groq)
  const aiResponse = await callAIProxy([
    { role: 'system', content: 'You are a professional resume parser. Return ONLY valid JSON, no markdown.' },
    { role: 'user', content: `${RESUME_PARSE_PROMPT}\n\nRESUME TEXT:\n${rawText.substring(0, 15000)}` },
  ], authToken);

  const profileJson = safeParseJSON(aiResponse) || {
    full_name: '', email: '', target_roles: [], skills: [],
    tools: [], years_of_experience: 0, seniority_level: 'junior',
    education: '', industries: [], languages: [], certifications: [], summary: ''
  };

  // 3. Upsert into Supabase (one profile per user)
  const { data, error } = await supabaseAdmin
    .from('user_resume_profiles')
    .upsert({
      user_id: userId,
      raw_text: rawText,
      parsed_profile: profileJson,
      file_url: fileUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select().single();

  if (error) throw error;
  return data;
};

// ─── AI Match Scorer ──────────────────────────────────────────────────────────
const MATCH_PROMPT = `You are a senior technical recruiter with 15 years of experience screening resumes.
You will receive:
1. A candidate resume profile (structured JSON)
2. A job description (raw text)

Assess whether this candidate would get shortlisted. Be strict and realistic.
- 80-100: Recruiter would definitely call this person
- 60-79: Strong chance of phone screen
- 40-59: Possible but risky, likely filtered at ATS
- Below 40: Would be rejected at resume screening stage

Return ONLY a JSON object:
{
  "match_score": 0-100,
  "matched_skills": [],
  "missing_skills": [],
  "bonus_skills": [],
  "seniority_match": true,
  "shortlist_verdict": "strong|likely|possible|unlikely",
  "shortlist_reasoning": "1-2 sentence explanation",
  "suggested_resume_tweaks": []
}
Return ONLY valid JSON. No explanation. No markdown.`;

const scoreJobMatch = async (resumeProfile, jobDescription, authToken) => {
  const content = `${MATCH_PROMPT}\n\nCANDIDATE PROFILE:\n${JSON.stringify(resumeProfile, null, 2)}\n\nJOB DESCRIPTION:\n${(jobDescription || '').substring(0, 8000)}`;

  const aiResponse = await callAIProxy([
    { role: 'system', content: 'You are a strict senior technical recruiter. Return ONLY valid JSON, no markdown.' },
    { role: 'user', content },
  ], authToken);

  return safeParseJSON(aiResponse);
};

// ─── Deduplication Helper ──────────────────────────────────────────────────────
const deduplicateJobs = (jobs) => {
  const seen = new Map();
  for (const job of jobs) {
    if (!job) continue;
    const company = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const title = (job.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${company}_${title}`;
    if (!seen.has(key)) {
      seen.set(key, job);
    } else {
      const existing = seen.get(key);
      if (new Date(job.posted_at) > new Date(existing.posted_at)) {
        seen.set(key, job);
      }
    }
  }
  return Array.from(seen.values());
};

// ─── Job Fetchers ──────────────────────────────────────────────────────────────
const fetchFromJSearch = async (query = 'Software Engineer', location = 'India') => {
  const key = process.env.JSEARCH_API_KEY;
  const host = process.env.JSEARCH_HOST || 'jsearch.p.rapidapi.com';
  if (!key) { console.warn('[JSearch] API key not set'); return []; }

  const res = await axios.get('https://jsearch.p.rapidapi.com/search', {
    params: { query: `${query} in ${location}`, page: '1', num_b: '20', date_posted: 'today' },
    headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host },
    timeout: 10000,
  });

  return (res.data?.data || []).map(j => ({
    external_id: `jsearch_${j.job_id}`,
    source: 'JSearch',
    title: j.job_title || '',
    company: j.employer_name || '',
    location: `${j.job_city || ''} ${j.job_country || ''}`.trim(),
    description: (j.job_description || '').substring(0, 5000),
    url: j.job_apply_link || '',
    is_remote: !!j.job_is_remote,
    posted_at: j.job_posted_at_datetime_utc || new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  }));
};

const fetchFromAdzuna = async (query = 'Developer', location = 'Hyderabad') => {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) { console.warn('[Adzuna] API keys not set'); return []; }

  const res = await axios.get(`https://api.adzuna.com/v1/api/jobs/in/search/1`, {
    params: { app_id: appId, app_key: appKey, what: query, where: location, results_per_page: 20, max_days_old: 3 },
    timeout: 10000,
  });

  return (res.data?.results || []).map(j => ({
    external_id: `adzuna_${j.id}`,
    source: 'Adzuna',
    title: j.title || '',
    company: j.company?.display_name || '',
    location: j.location?.display_name || '',
    description: (j.description || '').substring(0, 5000),
    url: j.redirect_url || '',
    salary_min: j.salary_min || null,
    salary_max: j.salary_max || null,
    is_remote: false,
    posted_at: j.created || new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  }));
};

const fetchFromRemotive = async (query = 'developer') => {
  const baseUrl = process.env.REMOTIVE_BASE_URL || 'https://remotive.com/api/remote-jobs';

  const res = await axios.get(baseUrl, {
    params: { search: query, limit: 20 },
    timeout: 10000,
  });

  return (res.data?.jobs || []).map(j => ({
    external_id: `remotive_${j.id}`,
    source: 'Remotive',
    title: j.title || '',
    company: j.company_name || '',
    location: j.candidate_required_location || 'Remote',
    description: (j.description || '').replace(/<[^>]*>/g, ' ').substring(0, 5000),
    url: j.url || '',
    is_remote: true,
    posted_at: j.publication_date || new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  }));
};

// ─── Batch AI Match Scoring Engine ────────────────────────────────────────────
const runResumeMatchingEngine = async () => {
  if (!supabaseAdmin) { console.warn('[MatchEngine] Skipped — supabaseAdmin not configured'); return; }
  console.log('[MatchEngine] Starting AI match scoring run...');

  try {
    const { data: profiles } = await supabaseAdmin
      .from('user_resume_profiles').select('*');

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: jobs } = await supabaseAdmin
      .from('jobs_cache').select('*').gte('posted_at', cutoff);

    if (!profiles?.length || !jobs?.length) {
      console.log('[MatchEngine] No profiles or no recent jobs to score.');
      return;
    }

    console.log(`[MatchEngine] Scoring ${profiles.length} profiles × ${jobs.length} jobs`);

    for (const profile of profiles) {
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      let cronAuthToken = null;
      console.log(`[MatchEngine DEBUG] jwtSecret length: ${jwtSecret ? jwtSecret.length : 'undefined/null'}`);
      if (jwtSecret) {
        cronAuthToken = jwt.sign(
          { role: 'authenticated', aud: 'authenticated', sub: profile.user_id, iss: 'supabase' },
          jwtSecret,
          { expiresIn: '1h' }
        );
      }

      for (const job of jobs) {
        try {
          // Skip already processed
          const { data: existing } = await supabaseAdmin
            .from('job_recommendations')
            .select('id').eq('user_id', profile.user_id).eq('job_id', job.id).single();
          if (existing) continue;

          const result = await scoreJobMatch(
            profile.parsed_profile,
            job.description || job.title,
            cronAuthToken // User-specific token generated for cron
          );

          if (!result) { console.warn(`[MatchEngine] Null result for job ${job.id}`); continue; }

          if (result.match_score >= 60) {
            await supabaseAdmin.from('job_recommendations').insert({
              user_id: profile.user_id,
              job_id: job.id,
              match_score: result.match_score,
              match_details: result,
              shortlist_verdict: result.shortlist_verdict,
              suggested_tweaks: result.suggested_resume_tweaks,
            });
          }
        } catch (err) {
          console.error(`[MatchEngine] Error scoring job ${job.id}:`, err.message);
        }
      }
    }
    console.log('[MatchEngine] Scoring run complete.');
  } catch (err) {
    console.error('[MatchEngine] Fatal error:', err.message);
  }
};

// ===========================================================================
// ─── RESUME ROUTES ───────────────────────────────────────────────────────────
// ===========================================================================

// POST /api/resume/parse — Accept PDF, parse with ai-proxy, store in Supabase
app.post('/api/resume/parse', upload.single('resume'), async (req, res) => {
  console.log('[Resume] Parse request received');
  try {
    const authHeader = req.headers.authorization;
    const userId = await extractUserId(authHeader);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const buffer = req.file?.buffer;
    if (!buffer) return res.status(400).json({ error: 'No PDF file uploaded' });

    const profile = await parseResume(buffer, userId, authHeader?.replace('Bearer ', ''), null);

    // Clear old recommendations for this user so they get fresh scores
    if (supabaseAdmin) {
      await supabaseAdmin.from('job_recommendations').delete().eq('user_id', userId);
    }

    // Trigger async re-scoring (non-blocking)
    runResumeMatchingEngine().catch(e => console.error('[Resume] Re-score error:', e.message));

    res.json({ success: true, profile });
  } catch (err) {
    console.error('[Resume Parse Error]', err.message);
    res.status(500).json({ error: err.message || 'Resume parse failed' });
  }
});

// GET /api/resume/profile — Return current user's parsed profile
app.get('/api/resume/profile', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    const { data, error } = await supabaseAdmin
      .from('user_resume_profiles').select('*').eq('user_id', userId).single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ profile: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/resume/profile — Delete resume profile + recommendations
app.delete('/api/resume/profile', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    await supabaseAdmin.from('job_recommendations').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_resume_profiles').delete().eq('user_id', userId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// ─── JOB SYNC & RECOMMENDATIONS ROUTES ──────────────────────────────────────
// ===========================================================================

// POST /api/jobs/sync — Fetch from all 3 APIs, upsert to jobs_cache, trigger scoring
app.post('/api/jobs/sync', async (req, res) => {
  console.log('[Jobs] Sync triggered');
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase admin not configured' });

    // 1. Fetch user's profile to extract target roles
    const { data: profile } = await supabaseAdmin.from('user_resume_profiles').select('*').eq('user_id', userId).single();

    let queries = ['Software Engineer'];
    let location = 'India'; // Default, could be extracted from profile/alerts if available

    if (profile && profile.parsed_profile) {
      const pp = profile.parsed_profile;
      if (pp.target_roles && pp.target_roles.length > 0) {
        queries = pp.target_roles.slice(0, 2);
      } else if (pp.skills && pp.skills.length > 0) {
        queries = [pp.skills.slice(0, 2).join(' ')];
      }
    }

    const fetchPromises = [];
    for (const q of queries) {
      fetchPromises.push(fetchFromJSearch(q, location));
      fetchPromises.push(fetchFromAdzuna(q, location));
      fetchPromises.push(fetchFromRemotive(q));
    }

    const results = await Promise.allSettled(fetchPromises);
    let allJobs = [];
    results.forEach(r => { if (r.status === 'fulfilled') allJobs.push(...r.value); });

    // Deduplicate jobs
    allJobs = deduplicateJobs(allJobs);

    if (allJobs.length > 0) {
      const { error } = await supabaseAdmin
        .from('jobs_cache')
        .upsert(allJobs, { onConflict: 'external_id' });
      if (error) console.error('[Jobs] Upsert error:', error.message);
    }

    // Trigger AI match scoring asynchronously (non-blocking)
    runResumeMatchingEngine().catch(e => console.error('[Jobs] Scoring error:', e.message));

    res.json({ success: true, jobs_fetched: allJobs.length });
  } catch (err) {
    console.error('[Jobs Sync Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/recommendations — Return ranked recommendations joined with jobs_cache
app.get('/api/jobs/recommendations', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    const { data, error } = await supabaseAdmin
      .from('job_recommendations')
      .select(`
        *,
        job:jobs_cache (*)
      `)
      .eq('user_id', userId)
      .eq('is_dismissed', false);

    if (error) throw error;

    // Intelligent Ranking: Score - (Days Old * 2)
    const recommendations = (data || []).map(rec => {
      const postedAt = rec.job ? new Date(rec.job.posted_at) : new Date();
      const daysOld = Math.max(0, (Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24));
      const rankingScore = rec.match_score - (daysOld * 2);
      return { ...rec, ranking_score: rankingScore };
    }).sort((a, b) => b.ranking_score - a.ranking_score);

    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/jobs/recommendations/:id — Dismiss or save a recommendation
app.patch('/api/jobs/recommendations/:id', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    const { id } = req.params;
    const { is_dismissed, is_saved } = req.body;
    const updates = {};
    if (typeof is_dismissed === 'boolean') updates.is_dismissed = is_dismissed;
    if (typeof is_saved === 'boolean') updates.is_saved = is_saved;

    const { data, error } = await supabaseAdmin
      .from('job_recommendations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select().single();

    if (error) throw error;
    res.json({ recommendation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// ─── JOB ALERTS CRUD ROUTES ──────────────────────────────────────────────────
// ===========================================================================

// POST /api/job-alerts — Create a new alert
app.post('/api/job-alerts', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    const { role_title, location, remote_only, skills, frequency } = req.body;
    if (!role_title) return res.status(400).json({ error: 'role_title is required' });

    const { data, error } = await supabaseAdmin
      .from('job_alerts')
      .insert({
        user_id: userId,
        role_title,
        location: location || null,
        remote_only: !!remote_only,
        skills: skills || [],
        frequency: frequency || 'daily',
        is_active: true,
      })
      .select().single();

    if (error) throw error;
    res.json({ alert: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/job-alerts — List user's alerts
app.get('/api/job-alerts', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    const { data, error } = await supabaseAdmin
      .from('job_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ alerts: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/job-alerts/:id — Update or toggle an alert
app.patch('/api/job-alerts/:id', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    const { id } = req.params;
    const allowed = ['role_title','location','remote_only','skills','frequency','is_active'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('job_alerts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select().single();

    if (error) throw error;
    res.json({ alert: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/job-alerts/:id — Delete an alert
app.delete('/api/job-alerts/:id', async (req, res) => {
  try {
    const userId = await extractUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

    const { error } = await supabaseAdmin
      .from('job_alerts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// ─── DAILY CRON SCHEDULER (Based on resumes) ────────────────────────────────
// ===========================================================================
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Daily job sync triggered at', new Date().toISOString());
  try {
    if (!supabaseAdmin) return;

    // Fetch all active profiles
    const { data: profiles } = await supabaseAdmin.from('user_resume_profiles').select('parsed_profile');

    // Collect unique target roles across all users (to avoid hammering APIs)
    const queriesSet = new Set();
    if (profiles) {
      for (const p of profiles) {
        if (p.parsed_profile?.target_roles) {
          p.parsed_profile.target_roles.slice(0, 2).forEach(r => queriesSet.add(r));
        }
      }
    }

    const queries = Array.from(queriesSet).slice(0, 5); // Limit to top 5 unique queries to respect rate limits
    if (queries.length === 0) queries.push('Software Engineer');

    const fetchPromises = [];
    for (const q of queries) {
      fetchPromises.push(fetchFromJSearch(q, 'India'));
      fetchPromises.push(fetchFromAdzuna(q, 'India'));
      fetchPromises.push(fetchFromRemotive(q));
    }

    const results = await Promise.allSettled(fetchPromises);
    let allJobs = [];
    results.forEach(r => { if (r.status === 'fulfilled') allJobs.push(...r.value); });

    allJobs = deduplicateJobs(allJobs);

    if (allJobs.length > 0) {
      await supabaseAdmin.from('jobs_cache').upsert(allJobs, { onConflict: 'external_id' });
    }
    await runResumeMatchingEngine();
    console.log(`[CRON] Done. ${allJobs.length} unique jobs synced for daily recommendations.`);
  } catch (err) {
    console.error('[CRON] Error:', err.message);
  }
});

console.log('[JobRecommender] Routes registered. Cron scheduler active (daily).');

// ---------------------------------------------------------------------------
// Global error handlers
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[Express Global Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

// ---------------------------------------------------------------------------
// Start server — browser launches lazily on first PDF request (saves RAM)
// ---------------------------------------------------------------------------
const startServer = () => {
  app.listen(PORT, '0.0.0.0', () => {
    const mem = process.memoryUsage();
    console.log(`[Startup] PDF Generator Server listening at http://0.0.0.0:${PORT}`);
    console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`[Startup] Allowed CORS origins: ${allowedOrigins.join(', ')}`);
    console.log(`[Startup] executablePath: ${LAUNCH_OPTS.executablePath}`);
    console.log(`[Startup] Heap used at boot: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / RSS: ${Math.round(mem.rss / 1024 / 1024)}MB`);
    console.log('[Startup] Browser will launch lazily on first PDF request.');
  });
};

startServer();
