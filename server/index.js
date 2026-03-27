import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3001;

// Increase limit to accommodate large HTML string payloads (images or large DOMs)
app.use(express.json({ limit: '50mb' }));
app.use(cors());

app.post('/generate-pdf', async (req, res) => {
  console.log('[API] /generate-pdf called');
  const { html } = req.body;

  if (!html) {
    console.error('[API] /generate-pdf error: HTML content is missing');
    return res.status(400).json({ error: 'HTML content is required' });
  }

  let browser;
  try {
    // Launch headless Chromium
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
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
          <script src="https://cdn.tailwindcss.com"></script>
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

    await browser.close();

    console.log(`[API] Successfully generated PDF (${pdfBuffer.length} bytes)`);

    // Send the generated PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length
    });
    return res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (browser) await browser.close();
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`PDF Generator Server listening at http://localhost:${PORT}`);
});
