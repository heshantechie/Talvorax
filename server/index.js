import express from 'express';
import cors from 'cors';
import puppeteer from "puppeteer-core";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

console.log(`[Startup] Process PID: ${process.pid}`);
console.log(`[Startup] Node.js version: ${process.version}`);
console.log(`[Startup] PORT env var: ${process.env.PORT || '(not set, defaulting to 3001)'}`);
console.log(`[Startup] Resolved PORT: ${PORT}`);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('[API] Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing in environment. Supabase client may not function properly.');
}
// Increase limit to accommodate large HTML string payloads (images or large DOMs)
app.use(express.json({ limit: '50mb' }));
// Normalize FRONTEND_URL to ensure no trailing slashes cause validation failures
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

// Configure CORS - allow all origins in production for now to debug Railway 502
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://hirereadyai-production.up.railway.app",
  "https://hire-ready-ai.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
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
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for ALL routes
app.options('*', cors(corsOptions));

// Health check endpoint - Railway uses this to verify the server is alive
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString() });
});


const withRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
  let attempt = 1;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      console.error(`[Puppeteer Task] Attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
};

// Log the resolved Chromium path immediately at startup so Railway logs show it clearly.
const CHROMIUM_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
console.log("Using Chromium path:", CHROMIUM_EXECUTABLE_PATH);

if (!fs.existsSync(CHROMIUM_EXECUTABLE_PATH)) {
  console.error(`[Startup] FATAL: Chromium binary not found at ${CHROMIUM_EXECUTABLE_PATH}. Ensure it is installed via Nixpacks/Dockerfile.`);
  process.exit(1);
}

// Shared Puppeteer launch options — kept in one place so startup check and
// task execution always use identical settings.
const PUPPETEER_LAUNCH_OPTS = {
  headless: "new",
  executablePath: CHROMIUM_EXECUTABLE_PATH,
  timeout: 60000, // Allow up to 60 s for Chromium to start on slow containers
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',   // Critical for Docker/Nixpacks — avoids /dev/shm OOM
    '--disable-gpu',
    '--no-zygote',
    '--single-process',          // Reduces memory footprint in constrained environments
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--mute-audio',
    '--no-first-run'
  ]
};

const executePuppeteerTask = async (html) => {
  let browser = null;
  try {
    console.log(`[Puppeteer] Launching browser with executablePath: ${PUPPETEER_LAUNCH_OPTS.executablePath}`);

    // Launch headless Chromium
    browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTS);

    const page = await browser.newPage();

    // Construct the full HTML document ensuring Tailwind loads and print media behaves like screen
    let customCss = '';
    const cssPath = path.resolve(__dirname, '../index.css');
    if (fs.existsSync(cssPath)) {
      customCss = fs.readFileSync(cssPath, 'utf-8');
      // Remove @import "tailwindcss" so it doesn't cause parser issues in the browser
      customCss = customCss.replace(/@import\s+"tailwindcss"\s*;/g, '');
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resume PDF</title>

          <!-- Tailwind CSS v4 Browser Build to dynamically style classes in the outerHTML payload -->
          <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
          
          <style>
            ${customCss}
          </style>
          <style>
              /* Force printing of background colors/images */
              body {
                -webkit-print-color-adjust: exact; /* Chrome/Safari */
                print-color-adjust: exact; /* Standard */
                margin: 0;
                padding: 0;
              }
              /* Define standard fonts that should be widely supported, or the ones you use */
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
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

    // Wait until networkidle0 to ensure ALL CDN resources (Tailwind, Fonts) have fully loaded
    console.log('[API] Setting HTML content and waiting for stylesheets / Tailwind...');
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });

    // Emulate "screen" media type so Tailwind utilities designed for screen apply perfectly to the PDF
    await page.emulateMediaType('screen');

    console.log('[API] Generating PDF buffer...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Vital for rendering background colors
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      }
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close().catch(e => console.error('[Puppeteer] Error closing browser:', e.message));
    }
  }
};

app.post('/generate-pdf', async (req, res) => {
  console.log('[API] /generate-pdf called');
  const { html } = req.body;

  if (!html) {
    console.error('[API] /generate-pdf error: HTML content is missing');
    return res.status(400).json({ error: 'HTML content is required' });
  }

  try {
    const pdfBuffer = await withRetry(() => executePuppeteerTask(html), 3, 2000);

    console.log(`[API] Successfully generated PDF (${pdfBuffer.length} bytes)`);

    // Send the generated PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length
    });
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('[Express] Task completely failed after all retries:', error.message);
    return res.status(500).json({ error: 'Failed to process task after multiple attempts.' });
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
    console.error('[Startup] FATAL: Puppeteer failed to launch. The server will not start.');
    console.error('[Startup] Error name   :', err.name);
    console.error('[Startup] Error message:', err.message);
    if (err.stack) console.error('[Startup] Stack trace  :\n', err.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close().catch(e =>
        console.error('[Startup] Error closing check browser:', e.message)
      );
    }
  }
};

const startServer = async () => {
  await checkPuppeteer();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Startup] PDF Generator Server listening at http://0.0.0.0:${PORT}`);
    console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`[Startup] Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  });
};

startServer();
