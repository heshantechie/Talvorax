// ─── Shared Scraper Utilities ────────────────────────────────────────────────
// Reusable helpers for Puppeteer-based job board scrapers.
// Follows the same patterns used in autoApplyWorker.js for browser management
// and index.js for jobs_cache schema normalization.
// ─────────────────────────────────────────────────────────────────────────────

import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Chromium Discovery ──────────────────────────────────────────────────────
// Scans common .cache/puppeteer/chrome directories for a locally-downloaded
// Chromium binary. Mirrors the logic in autoApplyWorker.js so all Puppeteer
// consumers resolve the same executable.

/**
 * Searches common cache paths for a locally-downloaded Chromium binary.
 * Returns the absolute path if found, or null.
 */
const findLocalChromium = () => {
  const dirsToSearch = [
    path.join(__dirname, '.cache', 'puppeteer', 'chrome'),
    path.join(__dirname, '..', '.cache', 'puppeteer', 'chrome'),
    path.join(process.cwd(), 'server', '.cache', 'puppeteer', 'chrome'),
    path.join(process.cwd(), '.cache', 'puppeteer', 'chrome'),
  ];

  for (const cachePath of dirsToSearch) {
    if (fs.existsSync(cachePath)) {
      try {
        const versions = fs.readdirSync(cachePath);
        for (const ver of versions) {
          const candidates = [
            path.join(cachePath, ver, 'chrome-linux', 'chrome'),
            path.join(cachePath, ver, 'chrome-win64', 'chrome.exe'),
            path.join(cachePath, ver, 'chrome-win32', 'chrome.exe'),
            path.join(cachePath, ver, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
            path.join(cachePath, ver, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          ];
          const found = candidates.find(p => fs.existsSync(p));
          if (found) return found;
        }
      } catch (_) {
        // Directory read failed — skip silently
      }
    }
  }
  return null;
};

// ─── Browser Launch ──────────────────────────────────────────────────────────

/**
 * Launches a Puppeteer headless browser with enhanced stealth settings to
 * evade common bot-detection mechanisms on job boards.
 *
 * Chromium resolution priority (same as autoApplyWorker.js):
 *   1. Local .cache/puppeteer download
 *   2. PUPPETEER_EXECUTABLE_PATH env var
 *   3. Railway environment — let Puppeteer resolve automatically
 *   4. Local dev — let Puppeteer resolve automatically
 *   5. Serverless (Vercel/Lambda) — @sparticuz/chromium
 *
 * @returns {Promise<{ browser: import('puppeteer').Browser, page: import('puppeteer').Page }>}
 */
export const launchStealthBrowser = async () => {
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_ID;
  const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !isRailway;

  // ── Resolve Chromium executable ──
  let executablePath = findLocalChromium();

  if (executablePath) {
    console.log(`[ScraperUtils] Found local Chromium: ${executablePath}`);
  } else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log(`[ScraperUtils] Using PUPPETEER_EXECUTABLE_PATH: ${executablePath}`);
  } else if (isRailway) {
    // Railway/Nix — let Puppeteer resolve the downloaded browser automatically
    executablePath = undefined;
    console.log('[ScraperUtils] Railway detected — Puppeteer will auto-resolve Chromium');
  } else if (isDev) {
    // Local dev — let Puppeteer resolve the downloaded browser automatically
    executablePath = undefined;
    console.log('[ScraperUtils] Dev mode — Puppeteer will auto-resolve Chromium');
  } else {
    // Vercel/AWS Lambda — use @sparticuz/chromium
    executablePath = await chromium.executablePath();
    console.log(`[ScraperUtils] Using @sparticuz/chromium: ${executablePath}`);
  }

  // ── Launch args — aggressive stealth for scraping job boards ──
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-software-rasterizer',
  ];

  const browser = await puppeteer.launch({
    args: launchArgs,
    executablePath,
    headless: 'new',
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  // ── Viewport ──
  await page.setViewport({ width: 1280, height: 900 });

  // ── Realistic User-Agent ──
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  // ── Stealth: spoof navigator properties to bypass bot detection ──
  await page.evaluateOnNewDocument(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Fake chrome runtime object
    window.chrome = {
      runtime: {},
    };

    // Fake plugins array (real browsers always have plugins)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Fake languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  // ── Accept-Language header ──
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });

  return { browser, page };
};

// ─── Random Delay ────────────────────────────────────────────────────────────

/**
 * Returns a promise that resolves after a random delay between min and max ms.
 * Useful for adding human-like pauses between scraping actions.
 *
 * @param {number} minMs - Minimum delay in milliseconds
 * @param {number} maxMs - Maximum delay in milliseconds
 * @returns {Promise<void>}
 */
export const randomDelay = (minMs, maxMs) => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// ─── Login Wall Detection ────────────────────────────────────────────────────

/**
 * Checks if a page requires login/authentication to proceed.
 * Inspects the DOM for password fields, sign-in text near apply areas,
 * OAuth/SSO buttons, and URL patterns that indicate an auth gate.
 *
 * @param {import('puppeteer').Page} page - The Puppeteer page to inspect
 * @returns {Promise<{ requiresLogin: boolean, reason: string }>}
 */
export const detectLoginWall = async (page) => {
  try {
    // ── Check URL for auth-related path segments ──
    const currentUrl = page.url().toLowerCase();
    const authPaths = ['/login', '/signin', '/sign-in', '/auth', '/sso', '/oauth'];

    for (const authPath of authPaths) {
      if (currentUrl.includes(authPath)) {
        return {
          requiresLogin: true,
          reason: `URL contains authentication path: "${authPath}"`,
        };
      }
    }

    // ── DOM inspection for login indicators ──
    const loginCheck = await page.evaluate(() => {
      // 1. Check for password input fields
      const passwordFields = document.querySelectorAll('input[type="password"]');
      if (passwordFields.length > 0) {
        return { detected: true, reason: 'Page contains password input field(s)' };
      }

      // 2. Check for sign-in / login text near apply-related areas
      const bodyText = document.body.innerText.toLowerCase();
      const signInPhrases = [
        'sign in to apply',
        'log in to apply',
        'login to apply',
        'sign in to continue',
        'log in to continue',
        'create an account to apply',
        'create account to continue',
        'register to apply',
        'please sign in',
        'please log in',
      ];

      for (const phrase of signInPhrases) {
        if (bodyText.includes(phrase)) {
          return { detected: true, reason: `Page contains login prompt: "${phrase}"` };
        }
      }

      // 3. Check for OAuth / SSO buttons (Google, LinkedIn, GitHub, etc.)
      const oauthSelectors = [
        'button[data-provider]',
        '[class*="google-sign"]',
        '[class*="linkedin-sign"]',
        '[class*="github-sign"]',
        'a[href*="accounts.google.com"]',
        'a[href*="linkedin.com/oauth"]',
        'a[href*="github.com/login/oauth"]',
        '[class*="social-login"]',
        '[class*="sso-button"]',
        '[class*="oauth"]',
      ];

      for (const selector of oauthSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          return { detected: true, reason: `OAuth/SSO button found: "${selector}"` };
        }
      }

      // 4. Check for login/signup forms with prominent CTA text
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], input[type="submit"]'));
      const loginButtonKeywords = ['sign in', 'log in', 'login', 'create account', 'sign up', 'register'];

      for (const btn of buttons) {
        const btnText = (btn.innerText || btn.value || '').toLowerCase().trim();
        for (const keyword of loginButtonKeywords) {
          if (btnText === keyword || btnText.startsWith(keyword)) {
            // Only flag if there's also a password field or sign-in form nearby
            const form = btn.closest('form');
            if (form) {
              const hasPassword = form.querySelector('input[type="password"]');
              const hasEmail = form.querySelector('input[type="email"], input[name*="email"], input[name*="user"]');
              if (hasPassword || hasEmail) {
                return { detected: true, reason: `Login form detected with "${keyword}" button` };
              }
            }
          }
        }
      }

      return { detected: false, reason: 'No login wall detected' };
    });

    return {
      requiresLogin: loginCheck.detected,
      reason: loginCheck.reason,
    };
  } catch (err) {
    console.error('[ScraperUtils] detectLoginWall error:', err.message);
    return {
      requiresLogin: false,
      reason: `Detection failed: ${err.message}`,
    };
  }
};

// ─── Job Normalization ───────────────────────────────────────────────────────

/**
 * Normalizes a raw scraped job object to match the `jobs_cache` table schema.
 * The output shape matches the structure used by fetchFromJSearch, fetchFromAdzuna,
 * and fetchFromRemotive in index.js.
 *
 * jobs_cache columns:
 *   external_id, source, title, company, location, description,
 *   url, is_remote, posted_at, fetched_at, salary_min, salary_max
 *
 * @param {object} rawJob   - Raw scraped job data (keys may vary by source)
 * @param {string} source   - Source identifier (e.g. 'LinkedIn', 'Indeed', 'Glassdoor')
 * @returns {object}        - Normalized job object ready for jobs_cache upsert
 */
export const normalizeJob = (rawJob, source) => {
  try {
    // ── Build external_id: "{source}_{raw id}" — same pattern as index.js ──
    const rawId = rawJob.id || rawJob.external_id || rawJob.job_id || rawJob.jobId || '';
    const externalId = rawId
      ? `${source.toLowerCase().replace(/\s+/g, '_')}_${rawId}`
      : `${source.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ── Resolve remote status ──
    const isRemote = Boolean(
      rawJob.is_remote ??
      rawJob.remote ??
      rawJob.isRemote ??
      (typeof rawJob.location === 'string' && /remote/i.test(rawJob.location)) ??
      false
    );

    // ── Extract and cap description at 5000 chars (matching index.js) ──
    const rawDescription = rawJob.description || rawJob.job_description || rawJob.summary || '';
    // Strip HTML tags if present (same approach as Remotive fetcher in index.js)
    const cleanDescription = rawDescription.replace(/<[^>]*>/g, ' ').substring(0, 5000);

    // ── Parse salary values ──
    const salaryMin = parseSalary(rawJob.salary_min ?? rawJob.salaryMin ?? rawJob.min_salary ?? null);
    const salaryMax = parseSalary(rawJob.salary_max ?? rawJob.salaryMax ?? rawJob.max_salary ?? null);

    // ── Parse posted date ──
    const postedAt = parseDate(rawJob.posted_at ?? rawJob.postedAt ?? rawJob.date ?? rawJob.publication_date ?? null);

    return {
      external_id: externalId,
      source: source,
      title: (rawJob.title || rawJob.job_title || '').trim().substring(0, 500),
      company: (rawJob.company || rawJob.company_name || rawJob.employer_name || '').trim().substring(0, 300),
      location: (rawJob.location || rawJob.job_location || '').trim().substring(0, 300),
      description: cleanDescription,
      url: (rawJob.url || rawJob.apply_url || rawJob.job_apply_link || rawJob.redirect_url || '').trim(),
      is_remote: isRemote,
      posted_at: postedAt,
      fetched_at: new Date().toISOString(),
      salary_min: salaryMin,
      salary_max: salaryMax,
    };
  } catch (err) {
    console.error(`[ScraperUtils] normalizeJob error for source "${source}":`, err.message);
    // Return a minimal valid record so the scraper doesn't crash on one bad entry
    return {
      external_id: `${source.toLowerCase().replace(/\s+/g, '_')}_error_${Date.now()}`,
      source: source,
      title: rawJob.title || 'Unknown',
      company: rawJob.company || '',
      location: rawJob.location || '',
      description: '',
      url: rawJob.url || '',
      is_remote: false,
      posted_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      salary_min: null,
      salary_max: null,
    };
  }
};

/**
 * Attempts to parse a salary value into a number.
 * Handles strings like "$120,000", "120k", numeric values, and null.
 *
 * @param {*} value - Raw salary value
 * @returns {number|null}
 */
const parseSalary = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;

  try {
    // Remove currency symbols, commas, spaces
    let cleaned = String(value).replace(/[£€$,\s]/g, '').trim();

    // Handle "k" suffix (e.g. "120k" → 120000)
    if (/^\d+(\.\d+)?k$/i.test(cleaned)) {
      return parseFloat(cleaned) * 1000;
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  } catch (_) {
    return null;
  }
};

/**
 * Parses various date formats into an ISO 8601 string.
 * Falls back to current timestamp if parsing fails.
 *
 * @param {*} value - Raw date value (string, Date, or null)
 * @returns {string} ISO 8601 date string
 */
const parseDate = (value) => {
  if (!value) return new Date().toISOString();

  try {
    const date = new Date(value);
    // Validate the parsed date — invalid dates return NaN for getTime()
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (_) {
    return new Date().toISOString();
  }
};

// ─── Safe Text Extraction ────────────────────────────────────────────────────

/**
 * Safely extracts the text content from a CSS selector on the page.
 * Returns an empty string if the element is not found or extraction fails.
 *
 * @param {import('puppeteer').Page} page     - The Puppeteer page to query
 * @param {string}                  selector - CSS selector to find
 * @returns {Promise<string>}                - Trimmed text content or ''
 */
export const safeTextContent = async (page, selector) => {
  try {
    const text = await page.$eval(selector, el => el.textContent?.trim() || '');
    return text;
  } catch (_) {
    // Element not found or evaluation failed — return empty string
    return '';
  }
};
