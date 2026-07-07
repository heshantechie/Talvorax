import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, 'dist');
const port = 3050;

const routes = [
  '/',
  '/resume-analyzer',
  '/interview-coach',
  '/minute-talk',
  '/job-alerts',
  '/pricing',
  '/about',
  '/contact',
  '/auto-apply',
  '/communication-skills',
  '/upskill'
];

async function prerender() {
  console.log('Starting prerender server...');
  const app = express();
  
  // Serve static files from dist, but if not found, send index.html (SPA fallback)
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });

  const server = app.listen(port, async () => {
    console.log(`Server listening on port ${port}`);
    
    console.log('Launching puppeteer...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    for (const route of routes) {
      console.log(`Prerendering ${route}...`);
      await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle0' });
      
      // Get the full HTML
      const html = await page.evaluate(() => {
        return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      });

      // Determine file path
      let filePath = path.join(distPath, route);
      if (route === '/') {
        filePath = path.join(distPath, 'index.html');
      } else {
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath, { recursive: true });
        }
        filePath = path.join(filePath, 'index.html');
      }

      fs.writeFileSync(filePath, html);
      console.log(`Saved ${filePath}`);
    }

    await browser.close();
    server.close();
    console.log('Prerendering complete.');
    process.exit(0);
  });
}

prerender().catch(err => {
  console.error('Prerender error:', err);
  process.exit(1);
});
