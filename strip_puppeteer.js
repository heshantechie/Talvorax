const fs = require('fs');
let text = fs.readFileSync('server/index.js', 'utf8');

text = text.replace(/  \/\/ Run Puppeteer check[\s\S]*?global\.PUPPETEER_STARTUP_ERROR = err\.message;\r?\n  \}\);/g, '');

fs.writeFileSync('server/index.js', text);
console.log('Success Regex');
