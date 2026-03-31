import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import 'dotenv/config';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  console.log(">>> REQUEST HIT:", req.method, req.url);
  next();
});

console.log(`[Startup] Process PID: ${process.pid}`);
console.log(`[Startup] Node.js version: ${process.version}`);
console.log(`[Startup] PORT env var: ${process.env.PORT || '(not set, defaulting to 3001)'}`);
console.log(`[Startup] Resolved PORT: ${PORT}`);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('[API] Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing in environment. Supabase client may not function properly.');
}
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "https://hirereadyai-production.up.railway.app",
  "https://hire-ready-ai.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, true); // Temporarily allow all to debug
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Configure CORS and handle OPTIONS preflight BEFORE express.json()
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Increase limit to accommodate large HTML string payloads
app.use(express.json({ limit: '50mb' }));

// Normalize FRONTEND_URL to ensure no trailing slashes cause validation failures
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

// Health check endpoint - Railway uses this to verify the server is alive
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString(), puppeteer_error: global.PUPPETEER_STARTUP_ERROR || null });
});


const getChromiumPath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }

  // Probe specific system paths directly for Linux/Railway
  const systemPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
       return p;
    }
  }

  // Try which command as a last resort fallback for nix paths
  try {
    const path = execSync('which chromium').toString().trim();
    if (path) return path;
  } catch (err) {}

  try {
    const path = execSync('which google-chrome-stable').toString().trim();
    if (path) return path;
  } catch (err) {}

  // DO NOT use puppeteer.executablePath() - the generic downloaded Chrome always hangs on Railway 
  // without specialized OS linking.

  return '/usr/bin/chromium';
};

const PUPPETEER_LAUNCH_OPTS = {
  headless: "new",
  executablePath: getChromiumPath(),
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
};

app.post('/generate-pdf', async (req, res) => {
  console.log("STEP 1: /generate-pdf endpoint hit");

  const { html } = req.body;

  if (!html) {
    console.log("STEP ERROR: No HTML provided");
    return res.status(400).json({ error: 'HTML content is required' });
  }

  let browser = null;
  try {
    console.log("STEP 2: Starting Puppeteer launch");

    browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTS);

    console.log("STEP 3: Browser launched");

    const page = await browser.newPage();
    console.log("STEP 4: New page created");

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['font', 'image', 'stylesheet'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    let customCss = '';
    const cssPath = path.resolve(__dirname, '../index.css');
    if (fs.existsSync(cssPath)) {
      customCss = fs.readFileSync(cssPath, 'utf-8');
      customCss = customCss.replace(/@import\s+"tailwindcss"\s*;/g, '');
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resume PDF</title>
          
          <style>
            ${customCss}
          </style>
          <style>
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
                padding: 0;
                font-family: Arial, Helvetica, sans-serif;
              }
              @media print {
                  body { margin: 0; padding: 0; }
                  @page { margin: 0; size: A4; }
              }
          </style>
      </head>
      <body>
          ${html}
      </body>
      </html>
    `;

    await page.setContent(fullHtml, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log("STEP 5: Content set");

    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      }
    });

    console.log("STEP 6: PDF generated");

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length
    });

    console.log("STEP 8: Sending response");

    return res.send(pdfBuffer);

  } catch (err) {
    console.error("STEP ERROR:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'PDF generation failed', details: err.message });
    }
  } finally {
    if (browser) {
      console.log("STEP 7: Browser closing in finally block");
      await browser.close().catch(e => console.error("Error closing browser:", e));
    }
  }
});

app.use((err, req, res, next) => {
  console.error('[Express Global Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ---------------------------------------------------------------------------
// Startup: verify Puppeteer can launch before the server begins accepting
// traffic. A failure here produces a clear log message and a non-zero exit
// code so Railway surfaces the real error rather than a silent SIGTERM.
// ---------------------------------------------------------------------------
const checkPuppeteer = async () => {
  console.log('[Startup] Running Puppeteer launch check...');
  console.log(`[Startup] PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH || '(not set)'}`);
  console.log(`[Startup] Resolved executablePath: ${PUPPETEER_LAUNCH_OPTS.executablePath}`);

  let browser = null;
  try {
    browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTS);
    const version = await browser.version();
    console.log(`[Startup] Puppeteer check passed — browser version: ${version}`);
  } catch (err) {
    console.error('[Startup] WARNING: Puppeteer failed to launch. PDF endpoints will fail.');
    console.error('[Startup] Error name   :', err.name);
    console.error('[Startup] Error message:', err.message);
    if (err.stack) console.error('[Startup] Stack trace  :\n', err.stack);
    global.PUPPETEER_STARTUP_ERROR = err.message;
  } finally {
    if (browser) {
      await browser.close().catch(e =>
        console.error('[Startup] Error closing check browser:', e.message)
      );
    }
  }
};

const startServer = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Startup] PDF Generator Server listening at http://0.0.0.0:${PORT}`);
    console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`[Startup] Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  });

  // Run Puppeteer check in the background after the server is listening
  // If it fails, we terminate the process so Railway can restart it.
  checkPuppeteer().catch(err => {
    console.error('[Startup] Uncaught error during background checkPuppeteer:', err);
    global.PUPPETEER_STARTUP_ERROR = err.message;
  });
};

startServer();
