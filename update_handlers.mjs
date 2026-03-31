import fs from 'fs';

let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(
  "app.get('/health', (req, res) => {\r\n  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString() });\r\n});",
  `app.get('/health', (req, res) => {\r\n  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString(), puppeteer_error: global.PUPPETEER_STARTUP_ERROR || null });\r\n});`
);

c = c.replace(
  "app.get('/health', (req, res) => {\n  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString() });\n});",
  `app.get('/health', (req, res) => {\n  res.json({ status: 'ok', service: 'hireready-pdf-server', timestamp: new Date().toISOString(), puppeteer_error: global.PUPPETEER_STARTUP_ERROR || null });\n});`
);

c = c.replace(
  "console.error('[Startup] FATAL: Puppeteer failed to launch. The server will not start.');",
  "console.error('[Startup] WARNING: Puppeteer failed to launch. PDF endpoints will fail.');"
);

c = c.replace(
  "process.exit(1);\r\n  } finally {",
  "global.PUPPETEER_STARTUP_ERROR = err.message;\r\n  } finally {"
);

c = c.replace(
  "process.exit(1);\n  } finally {",
  "global.PUPPETEER_STARTUP_ERROR = err.message;\n  } finally {"
);

c = c.replace(
  "checkPuppeteer().catch(err => {\r\n    console.error('[Startup] Uncaught error during background checkPuppeteer:', err);\r\n    process.exit(1);\r\n  });",
  "checkPuppeteer().catch(err => {\r\n    console.error('[Startup] Uncaught error during background checkPuppeteer:', err);\r\n    global.PUPPETEER_STARTUP_ERROR = err.message;\r\n  });"
);

c = c.replace(
  "checkPuppeteer().catch(err => {\n    console.error('[Startup] Uncaught error during background checkPuppeteer:', err);\n    process.exit(1);\n  });",
  "checkPuppeteer().catch(err => {\n    console.error('[Startup] Uncaught error during background checkPuppeteer:', err);\n    global.PUPPETEER_STARTUP_ERROR = err.message;\n  });"
);

fs.writeFileSync('server/index.js', c);
console.log('Done mapping global error handlers.');
