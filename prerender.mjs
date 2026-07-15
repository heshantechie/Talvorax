import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEO_DATA } from './seo-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, 'dist');

// ---------------------------------------------------------------------------
// Head tag builders
// ---------------------------------------------------------------------------

function buildCanonicalTag(canonical) {
  return `  <link rel="canonical" href="${canonical}" />`;
}

function buildOgTags({ title, description, canonical, ogImage }) {
  return [
    `  <meta property="og:type" content="website" />`,
    `  <meta property="og:site_name" content="Talvorax" />`,
    `  <meta property="og:title" content="${escAttr(title)}" />`,
    `  <meta property="og:description" content="${escAttr(description)}" />`,
    `  <meta property="og:url" content="${canonical}" />`,
    `  <meta property="og:image" content="${ogImage}" />`,
    `  <meta property="og:image:width" content="1200" />`,
    `  <meta property="og:image:height" content="630" />`,
    `  <meta name="twitter:card" content="summary_large_image" />`,
    `  <meta name="twitter:title" content="${escAttr(title)}" />`,
    `  <meta name="twitter:description" content="${escAttr(description)}" />`,
    `  <meta name="twitter:image" content="${ogImage}" />`,
  ].join('\n');
}

function buildSchemaTag(schema, id) {
  return `  <script type="application/ld+json" id="${id}">${JSON.stringify(schema)}</script>`;
}

function buildSchemaTags(schemas) {
  return schemas
    .map((schema, i) => buildSchemaTag(schema, `schema-static-${i}`))
    .join('\n');
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// HTML injection helpers
// ---------------------------------------------------------------------------

/**
 * Replaces existing <title> and <meta name="description"> (already injected
 * in the original prerender step) — but now also adds canonical, OG tags,
 * and JSON-LD schemas into <head>, and inserts static body HTML into #root.
 */
function injectAll(html, routeData) {
  const { title, description, canonical, ogImage, schemas, body } = routeData;
  let out = html;

  // 1. Title
  if (out.includes('<title>')) {
    out = out.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  } else {
    out = out.replace('</head>', `  <title>${title}</title>\n</head>`);
  }

  // 2. Meta description
  const descTag = `<meta name="description" content="${escAttr(description)}" />`;
  if (out.includes('name="description"')) {
    out = out.replace(/<meta name="description"[^>]*>/i, descTag);
  } else {
    out = out.replace('</head>', `  ${descTag}\n</head>`);
  }

  // 3. Canonical — replace if exists, otherwise inject
  const canonicalTag = buildCanonicalTag(canonical);
  if (out.includes('rel="canonical"')) {
    out = out.replace(/<link rel="canonical"[^>]*>/i, canonicalTag);
  } else {
    out = out.replace('</head>', `${canonicalTag}\n</head>`);
  }

  // 4. Open Graph + Twitter tags (always inject fresh)
  const ogBlock = buildOgTags({ title, description, canonical, ogImage });
  out = out.replace('</head>', `${ogBlock}\n</head>`);

  // 5. JSON-LD schema tags — remove any runtime-injected ones, add static ones
  out = out.replace(/<script[^>]+id="schema-[^"]*"[^>]*>[\s\S]*?<\/script>/gi, '');
  const schemaBlock = buildSchemaTags(schemas);
  out = out.replace('</head>', `${schemaBlock}\n</head>`);

  // 6. Static body HTML — inject into #root div
  //    React will replace this on mount; crawlers see real content.
  if (body) {
    out = out.replace(
      /<div id="root">\s*<\/div>/,
      `<div id="root" aria-hidden="true">${body}</div>`
    );
  }

  return out;
}

// ---------------------------------------------------------------------------
// Main prerender
// ---------------------------------------------------------------------------

function prerender() {
  console.log('\nStarting full SEO prerender (body HTML + head tags)...\n');

  const indexHtmlPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('dist/index.html not found. Run `vite build` first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  for (const [route, routeData] of Object.entries(SEO_DATA)) {
    console.log(`  Rendering ${route}...`);
    const injectedHtml = injectAll(baseHtml, routeData);

    let filePath;
    if (route === '/') {
      filePath = path.join(distPath, 'index.html');
    } else {
      const dir = path.join(distPath, route);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      filePath = path.join(dir, 'index.html');
    }

    fs.writeFileSync(filePath, injectedHtml, 'utf8');
    console.log(`  ✓ Saved ${path.relative(distPath, filePath)}`);
  }

  console.log('\nPrerender complete. All 11 routes have static HTML with:\n' +
    '  • Unique <title> + <meta description>\n' +
    '  • <link rel="canonical">\n' +
    '  • Open Graph + Twitter Card tags\n' +
    '  • JSON-LD structured data schemas\n' +
    '  • Real body HTML (h1, h2s, paragraphs, internal links) in #root\n');
}

prerender();
