const fs = require('fs');
let content = fs.readFileSync('server/index.js', 'utf8');

// Replace getChromiumPath
const targetRegex = /const getChromiumPath = \(\) => \{[\s\S]*?return '\/usr\/bin\/chromium';\r?\n\};/;
const replacement = `const getChromiumPath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === 'win32') {
    return 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
  }
  
  // Try POSIX shell builtin first (doesn't require 'which' package)
  const { execSync } = require('child_process');
  try {
    const path = execSync('command -v chromium').toString().trim();
    if (path) return path;
  } catch (err) {}

  try {
    const path = execSync('which chromium-browser').toString().trim();
    if (path) return path;
  } catch (err) {}

  // Use Puppeteer's bundled Chromium which is guaranteed to exist.
  // We removed --no-zygote so it shouldn't hang anymore, provided nixpacks libraries exist.
  try {
    const puppeteer = require('puppeteer');
    return puppeteer.executablePath();
  } catch (err) {
    return '/usr/bin/chromium';
  }
};`;

content = content.replace(targetRegex, replacement);
fs.writeFileSync('server/index.js', content);
console.log('Success regex replacement');
