import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// The code block to remove is:
//  checkPuppeteer().catch(err => {
//    console.error('[Startup] Uncaught error during background checkPuppeteer:', err);
//    global.PUPPETEER_STARTUP_ERROR = err.message;
//  });
// };

content = content.replace(/  checkPuppeteer\(\)\.catch\(err => \{[\s\S]*?global\.PUPPETEER_STARTUP_ERROR = err\.message;[\s\S]*?\}\);\n\}\;/g, '};');

fs.writeFileSync('server/index.js', content);
console.log('Done mapping.');
