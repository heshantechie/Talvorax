import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  methods: ["GET", "POST", "OPTIONS"],
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
