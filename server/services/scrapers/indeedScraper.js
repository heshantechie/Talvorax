/**
 * indeedScraper.js — Puppeteer-based scraper for Indeed India
 *
 * Searches in.indeed.com for jobs matching a query and location,
 * extracts structured data from job cards (up to 2 pages / 20 jobs),
 * optionally fetches full descriptions for the first 10 results,
 * and returns an array of normalized job objects.
 *
 * @module indeedScraper
 */

import {
  launchStealthBrowser,
  randomDelay,
  normalizeJob,
  safeTextContent,
} from './scraperUtils.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum number of search-result pages to scrape */
const MAX_PAGES = 2;

/** Indeed India shows 10 results per page */
const RESULTS_PER_PAGE = 10;

/** Hard cap on total jobs returned */
const MAX_JOBS = 20;

/** How many detail pages we'll actually visit for full descriptions */
const MAX_DETAIL_VISITS = 10;

/** Navigation timeout (ms) */
const NAV_TIMEOUT = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the Indeed India search URL for a given page index (0-based).
 *
 * @param {string} query  – search keywords
 * @param {string} location – location filter (default "India")
 * @param {number} pageIndex – 0-based page number
 * @returns {string} fully-qualified URL
 */
function buildSearchUrl(query, location, pageIndex = 0) {
  const base = 'https://in.indeed.com/jobs';
  const params = new URLSearchParams({
    q: query,
    l: location,
    fromage: '3', // jobs posted in the last 3 days
  });

  // Indeed uses &start=10 for page 2, &start=20 for page 3, etc.
  if (pageIndex > 0) {
    params.set('start', String(pageIndex * RESULTS_PER_PAGE));
  }

  return `${base}?${params.toString()}`;
}

/**
 * Extract structured data from all visible job cards on the current page.
 *
 * Runs inside the browser context via page.evaluate().
 *
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Array<Object>>} raw card data
 */
async function extractJobCards(page) {
  return page.evaluate(() => {
    // Indeed wraps each result in one of these selectors
    const cardSelectors = [
      '.job_seen_beacon',
      '.resultContent',
      '[data-jk]',
    ];

    /** Try each selector until we find cards */
    let cards = [];
    for (const sel of cardSelectors) {
      cards = Array.from(document.querySelectorAll(sel));
      if (cards.length > 0) break;
    }

    return cards.map((card) => {
      // ── Title ──────────────────────────────────────────────────────────
      const titleEl =
        card.querySelector('h2.jobTitle a') ||
        card.querySelector('.jobTitle a') ||
        card.querySelector('h2.jobTitle') ||
        card.querySelector('.jobTitle');

      const title = titleEl?.textContent?.trim() || '';

      // Relative URL lives on the title anchor
      const relativeUrl = titleEl?.closest('a')?.getAttribute('href') || '';

      // ── Company ────────────────────────────────────────────────────────
      const companyEl =
        card.querySelector('[data-testid="company-name"]') ||
        card.querySelector('.companyName');

      const company = companyEl?.textContent?.trim() || '';

      // ── Location ───────────────────────────────────────────────────────
      const locationEl =
        card.querySelector('[data-testid="text-location"]') ||
        card.querySelector('.companyLocation');

      const location = locationEl?.textContent?.trim() || '';

      // ── Posted date ────────────────────────────────────────────────────
      const dateEl = card.querySelector('.date');
      const postedDate = dateEl?.textContent?.trim() || '';

      // ── Job Key (data-jk) ──────────────────────────────────────────────
      // The attribute can be on the card itself or a parent element
      const jkEl = card.closest('[data-jk]') || card.querySelector('[data-jk]');
      const jobKey = jkEl?.getAttribute('data-jk') || '';

      return { title, company, location, postedDate, jobKey, relativeUrl };
    });
  });
}

/**
 * Visit a job's detail page and pull the full description text.
 *
 * @param {import('puppeteer').Page} page
 * @param {string} url – absolute URL to the job detail page
 * @returns {Promise<string>} description text (empty string on failure)
 */
async function fetchJobDescription(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });

    // Indeed renders the description in #jobDescriptionText
    const description = await page.evaluate(() => {
      const el =
        document.querySelector('#jobDescriptionText') ||
        document.querySelector('.jobsearch-jobDescriptionText') ||
        document.querySelector('[id*="jobDescription"]');
      return el?.innerText?.trim() || '';
    });

    return description;
  } catch (err) {
    console.log('[IndeedScraper] Failed to fetch description from', url, err.message);
    return '';
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Scrape Indeed India for jobs matching the given query.
 *
 * @param {string} query    – search keywords (e.g. "Node.js developer")
 * @param {string} [location='India'] – location filter
 * @returns {Promise<Array<Object>>} array of normalised job objects
 */
export async function scrapeIndeed(query, location = 'India') {
  console.log(`[IndeedScraper] Starting scrape — query="${query}", location="${location}"`);

  let browser = null;

  try {
    // 1. Launch a stealth-configured browser instance
    browser = await launchStealthBrowser();
    const page = await browser.newPage();

    // Collect raw card data across pages
    const allCards = [];

    // 2. Iterate over search-result pages (up to MAX_PAGES)
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
      // Stop early if we already have enough jobs
      if (allCards.length >= MAX_JOBS) break;

      const searchUrl = buildSearchUrl(query, location, pageIndex);
      console.log(`[IndeedScraper] Navigating to page ${pageIndex + 1}: ${searchUrl}`);

      // 3. Navigate to Indeed search results
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT,
      });

      // Small delay to let any lazy-loaded cards settle
      await randomDelay(1000, 2000);

      // 4. Extract job cards from the current page
      const cards = await extractJobCards(page);
      console.log(`[IndeedScraper] Page ${pageIndex + 1}: found ${cards.length} job card(s)`);

      if (cards.length === 0) {
        console.log('[IndeedScraper] No cards found — stopping pagination');
        break;
      }

      allCards.push(...cards);
    }

    // Enforce the hard cap
    const trimmedCards = allCards.slice(0, MAX_JOBS);
    console.log(`[IndeedScraper] Total cards collected: ${trimmedCards.length}`);

    // 5. Build preliminary job objects with full URLs
    const jobs = trimmedCards.map((card) => {
      const fullUrl = card.jobKey
        ? `https://in.indeed.com/viewjob?jk=${card.jobKey}`
        : card.relativeUrl
          ? `https://in.indeed.com${card.relativeUrl}`
          : '';

      return {
        title: card.title,
        company: card.company,
        location: card.location,
        url: fullUrl,
        postedDate: card.postedDate,
        jobKey: card.jobKey,
        description: '', // will be populated below if possible
      };
    });

    // 6. Optionally visit detail pages for the first N jobs to grab full descriptions
    const detailCount = Math.min(jobs.length, MAX_DETAIL_VISITS);
    console.log(`[IndeedScraper] Fetching descriptions for first ${detailCount} job(s)…`);

    for (let i = 0; i < detailCount; i++) {
      const job = jobs[i];

      if (!job.url) {
        console.log(`[IndeedScraper] Skipping detail fetch — no URL for "${job.title}"`);
        continue;
      }

      console.log(`[IndeedScraper] (${i + 1}/${detailCount}) Fetching: ${job.url}`);
      job.description = await fetchJobDescription(page, job.url);

      // Random 3-5 s delay between detail page visits to avoid throttling
      if (i < detailCount - 1) {
        await randomDelay(3000, 5000);
      }
    }

    // 7. Normalize all jobs to the project-standard shape
    const normalizedJobs = jobs.map((job) =>
      normalizeJob({
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        postedDate: job.postedDate,
        jobKey: job.jobKey,
      }, 'Indeed')
    );

    console.log(`[IndeedScraper] Scrape complete — returning ${normalizedJobs.length} job(s)`);
    return normalizedJobs;
  } catch (err) {
    console.log('[IndeedScraper] Scrape failed:', err.message);
    return [];
  } finally {
    // 8. Always close the browser, even if something threw
    if (browser) {
      try {
        await browser.close();
        console.log('[IndeedScraper] Browser closed');
      } catch (closeErr) {
        console.log('[IndeedScraper] Error closing browser:', closeErr.message);
      }
    }
  }
}
