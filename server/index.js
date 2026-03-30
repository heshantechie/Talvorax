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

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('[API] Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing in environment. Supabase client may not function properly.');
}
// Increase limit to accommodate large HTML string payloads (images or large DOMs)
app.use(express.json({ limit: '50mb' }));
// Normalize FRONTEND_URL to ensure no trailing slashes cause validation failures
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

// Configure CORS for production safety
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://hirereadyai-production.up.railway.app",
    "https://hire-ready-ai.vercel.app"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
};
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for ALL routes
app.options('*', cors(corsOptions));


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

const executePuppeteerTask = async (html) => {
  let browser = null;
  try {
    let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!chromePath) {
      try {
        chromePath = puppeteer.executablePath();
      } catch (e) {
        // Fallback for Windows if local project chromium was deleted/not downloaded
        chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
      }
    }

    // Launch headless Chromium
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Critical for Docker/Nixpacks to prevent memory crashes
        '--disable-gpu',
        '--no-zygote'
      ]
    });

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
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PDF Generator Server listening at http://0.0.0.0:${PORT}`);
});
