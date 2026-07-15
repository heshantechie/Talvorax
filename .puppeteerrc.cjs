const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to be local inside the project folder
  cacheDirectory: join(__dirname, 'server', '.cache', 'puppeteer'),
};
