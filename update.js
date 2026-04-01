const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(/    '--disable-gpu',[\r\n]+    '--no-zygote'/g, "    '--disable-gpu'");

c = c.replace(/    process\.exit\(1\);[\r\n]+  \} finally \{/g, "    global.PUPPETEER_STARTUP_ERROR = err.message;\n  } finally {");

c = c.replace(/app\.get\('\/health', \(req, res\) => \{[\r\n\s]+res\.json\(\{ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date\(\)\.toISOString\(\) \}\);[\r\n\s]+\}\);/g, "app.get('/health', (req, res) => {\n  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString(), puppeteer_error: global.PUPPETEER_STARTUP_ERROR || null });\n});");

c = c.replace(/  checkPuppeteer\(\)\.catch\(err => \{[\r\n\s]+console\.error\('\[Startup\] Uncaught error during background checkPuppeteer:', err\);[\r\n\s]+process\.exit\(1\);[\r\n\s]+\}\);/g, "  checkPuppeteer().catch(err => {\n    console.error('[Startup] Uncaught error during background checkPuppeteer:', err);\n    global.PUPPETEER_STARTUP_ERROR = err.message;\n  });\n");

fs.writeFileSync('server/index.js', c);
console.log('Success');
