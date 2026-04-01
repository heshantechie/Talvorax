import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Global request logger
app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  console.log("Health endpoint hit");
  res.status(200).send("OK");
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

    // Block fonts/images/stylesheets to speed up rendering
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const type = request.resourceType();
      if (['font', 'image', 'stylesheet'].includes(type)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Inline CSS (strip @import "tailwindcss" which is compile-time only)
    let customCss = '';
    const cssPath = path.resolve(__dirname, '../index.css');
    if (fs.existsSync(cssPath)) {
      customCss = fs.readFileSync(cssPath, 'utf-8');
      customCss = customCss.replace(/@import\s+"tailwindcss"\s*;/g, '');
    }

    const fullHtml = `<!DOCTYPE html>
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
</html>`;

    console.log('[PDF] Setting page content...');
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.emulateMediaType('screen');

    console.log('[PDF] Generating PDF buffer...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    console.log(`[PDF] Done — buffer size: ${pdfBuffer.length} bytes`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
    });

    return res.send(pdfBuffer);

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
