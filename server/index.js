import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Increase limit to accommodate large HTML string payloads (images or large DOMs)
app.use(express.json({ limit: '50mb' }));
// Normalize FRONTEND_URL to ensure no trailing slashes cause validation failures
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

// Configure CORS for production safety
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === FRONTEND_URL || /^https:\/\/.*\.vercel\.app$/.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+/.test(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked unauthorized origin: ${origin}`);
      callback(new Error(`CORS Error: Origin ${origin || 'Unknown'} is not allowed.`));
    }
  },
  credentials: true, // Required for cookies, authorization headers (JWT)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow preflight
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));

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
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resume PDF</title>
          <style>
            ${fs.existsSync(path.resolve(__dirname, '../index.css')) ? fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8') : ''}
          </style>
          <style>
              /* Force printing of background colors/images */
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
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

    // Wait until networkidle2 to ensure CDN resources (Tailwind, Fonts) have fully loaded
    console.log('[API] Setting HTML content and waiting for stylesheets...');
    await page.setContent(fullHtml, { waitUntil: 'networkidle2', timeout: 25000 });

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
