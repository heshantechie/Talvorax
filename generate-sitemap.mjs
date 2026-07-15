import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, 'public');

const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const routes = [
  { url: '/', priority: '1.0' },
  { url: '/resume-analyzer', priority: '0.9' },
  { url: '/interview-coach', priority: '0.9' },
  { url: '/minute-talk', priority: '0.9' },
  { url: '/job-alerts', priority: '0.8' },
  { url: '/pricing', priority: '0.8' },
  { url: '/about', priority: '0.7' },
  { url: '/contact', priority: '0.7' },
  { url: '/auto-apply', priority: '0.8' },
  { url: '/communication-skills', priority: '0.8' },
  { url: '/upskill', priority: '0.8' }
];

const domain = 'https://www.talvorax.com';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${domain}${route.url}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(publicPath, 'sitemap.xml'), xml);
console.log(`Generated sitemap.xml with lastmod=${TODAY} for ${routes.length} routes.`);
