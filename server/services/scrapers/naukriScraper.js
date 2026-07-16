/**
 * naukriScraper.js — Puppeteer-based scraper for Naukri.com
 *
 * Scrapes job listings from Naukri.com search results using stealth
 * browser techniques. Supports pagination (up to 2 pages), extracts
 * structured job data from multiple CSS selector patterns, and
 * optionally fetches full job descriptions from detail pages.
 *
 * @module naukriScraper
 */

import {
  launchStealthBrowser,
  randomDelay,
  normalizeJob,
  safeTextContent,
} from './scraperUtils.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of jobs to return */
const MAX_JOBS = 20;

/** Maximum number of search-result pages to scrape */
const MAX_PAGES = 2;

/** Maximum detail pages to visit for full descriptions */
const MAX_DETAIL_VISITS = 10;

/** Navigation timeout in milliseconds */
const NAV_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Selector sets – Naukri periodically changes its markup so we keep several
// fallback selectors for every field.
// ---------------------------------------------------------------------------

/** Possible selectors for individual job-card containers */
const CARD_SELECTORS = ['.srp-jobtuple-wrapper', 'article.jobTuple'];

/** Title / link selectors (relative to a job card) */
const TITLE_SELECTORS = [
  '.cust-job-tuple .row1 a.title',
  'a.title',
  '.title',
];

/** Company name selectors */
const COMPANY_SELECTORS = ['.subTitle .comp-name', '.comp-name'];

/** Location selectors */
const LOCATION_SELECTORS = ['.subTitle .loc', '.locWdth', '.loc'];

/** Salary selectors */
const SALARY_SELECTORS = ['.subTitle .salary', '.sal'];

/** Experience selectors */
const EXPERIENCE_SELECTORS = ['.exp'];

/** Description / snippet selectors */
const DESCRIPTION_SELECTORS = ['.job-description', '.job-desc'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the Naukri search URL for a given query, location, and page number.
 *
 * Page 1: https://www.naukri.com/<query>-jobs-in-<location>
 * Page N: https://www.naukri.com/<query>-jobs-in-<location>-<N>
 *
 * @param {string} query   – Search keyword(s)
 * @param {string} location – Target city / region
 * @param {number} page    – 1-indexed page number
 * @returns {string} Fully-qualified URL
 */
function buildSearchUrl(query, location, page = 1) {
  const slug = (str) => str.replace(/\s+/g, '-').toLowerCase();
  const base = `https://www.naukri.com/${slug(query)}-jobs-in-${slug(location)}`;
  return page <= 1 ? base : `${base}-${page}`;
}

/**
 * Try multiple selectors in order and return the text content of the first
 * match found inside `parentEl`.  Returns an empty string when nothing matches.
 *
 * @param {import('puppeteer').ElementHandle} parentEl
 * @param {string[]} selectors
 * @returns {Promise<string>}
 */
async function textFromSelectors(parentEl, selectors) {
  for (const sel of selectors) {
    try {
      const el = await parentEl.$(sel);
      if (el) {
        const text = await safeTextContent(el);
        if (text) return text;
      }
    } catch {
      // Selector didn't match — try next one
    }
  }
  return '';
}

/**
 * Attempt to extract an href from the first matching selector inside a parent.
 *
 * @param {import('puppeteer').ElementHandle} parentEl
 * @param {string[]} selectors
 * @returns {Promise<string>}
 */
async function hrefFromSelectors(parentEl, selectors) {
  for (const sel of selectors) {
    try {
      const el = await parentEl.$(sel);
      if (el) {
        const href = await el.evaluate((node) => node.href || node.getAttribute('href') || '');
        if (href) return href;
      }
    } catch {
      // continue
    }
  }
  return '';
}

/**
 * Parse a salary string like "₹ 5-10 Lacs P.A." into { min, max } numbers.
 * Returns `{ min: null, max: null }` when parsing fails.
 *
 * @param {string} salaryStr
 * @returns {{ min: number|null, max: number|null }}
 */
function parseSalary(salaryStr) {
  if (!salaryStr) return { min: null, max: null };

  // Try to capture numeric ranges such as "5-10", "5,00,000 - 10,00,000", etc.
  const rangeMatch = salaryStr.match(
    /([\d,]+(?:\.\d+)?)\s*[-–to]+\s*([\d,]+(?:\.\d+)?)/i,
  );

  if (rangeMatch) {
    const parseNum = (s) => parseFloat(s.replace(/,/g, ''));
    return { min: parseNum(rangeMatch[1]), max: parseNum(rangeMatch[2]) };
  }

  // Single number fallback
  const singleMatch = salaryStr.match(/([\d,]+(?:\.\d+)?)/);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1].replace(/,/g, ''));
    return { min: val, max: val };
  }

  return { min: null, max: null };
}

// ---------------------------------------------------------------------------
// Core extraction
// ---------------------------------------------------------------------------

/**
 * Extract job data from all cards on the currently loaded search-results page.
 *
 * @param {import('puppeteer').Page} page – Puppeteer page handle
 * @returns {Promise<object[]>} Raw job objects (not yet normalised)
 */
async function extractJobsFromPage(page) {
  // Determine which card selector is present on this page
  let cardSelector = null;
  for (const sel of CARD_SELECTORS) {
    const count = await page.$$eval(sel, (els) => els.length).catch(() => 0);
    if (count > 0) {
      cardSelector = sel;
      console.log(`[NaukriScraper] Using card selector: ${sel} (${count} cards)`);
      break;
    }
  }

  if (!cardSelector) {
    console.log('[NaukriScraper] No job cards found on page');
    return [];
  }

  const cards = await page.$$(cardSelector);
  const jobs = [];

  for (const card of cards) {
    try {
      // Title & URL
      const title = await textFromSelectors(card, TITLE_SELECTORS);
      const url = await hrefFromSelectors(card, TITLE_SELECTORS);

      // Company
      const company = await textFromSelectors(card, COMPANY_SELECTORS);

      // Location
      const location = await textFromSelectors(card, LOCATION_SELECTORS);

      // Salary (raw text + parsed min/max)
      const salaryText = await textFromSelectors(card, SALARY_SELECTORS);
      const { min: salaryMin, max: salaryMax } = parseSalary(salaryText);

      // Experience
      const experience = await textFromSelectors(card, EXPERIENCE_SELECTORS);

      // Description snippet
      const description = await textFromSelectors(card, DESCRIPTION_SELECTORS);

      // Only keep the card if we at least have a title
      if (title) {
        jobs.push({
          title,
          company,
          location,
          salaryMin,
          salaryMax,
          salaryText,
          experience,
          description,
          url,
        });
      }
    } catch (err) {
      console.log('[NaukriScraper] Error extracting card:', err.message);
    }
  }

  console.log(`[NaukriScraper] Extracted ${jobs.length} jobs from current page`);
  return jobs;
}

/**
 * Visit individual job-detail pages and enrich the job objects with the full
 * description text.  Only the first `MAX_DETAIL_VISITS` jobs are visited
 * to keep scraping time manageable.
 *
 * @param {import('puppeteer').Page} page
 * @param {object[]} jobs – Mutable array; `.description` will be updated in-place
 */
async function enrichWithDetails(page, jobs) {
  const toVisit = jobs.filter((j) => j.url).slice(0, MAX_DETAIL_VISITS);
  console.log(`[NaukriScraper] Visiting ${toVisit.length} detail pages for full descriptions`);

  for (const job of toVisit) {
    try {
      await page.goto(job.url, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT,
      });

      // Naukri detail pages commonly use these selectors for the full JD
      const detailSelectors = [
        '.styles_JDC__dang-inner-html__h0K4t',  // newer layout
        '.job-desc .dang-inner-html',            // legacy layout
        '.job-desc',
        '.jd-desc',
        '#job-desc-container',
      ];

      let fullDesc = '';
      for (const sel of detailSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            fullDesc = await el.evaluate((node) => node.innerText || '');
            if (fullDesc.trim()) break;
          }
        } catch {
          // next selector
        }
      }

      if (fullDesc.trim()) {
        job.description = fullDesc.trim();
        console.log(`[NaukriScraper] Enriched: ${job.title.substring(0, 50)}…`);
      }

      // Polite delay between detail-page visits (3–5 seconds)
      await randomDelay(3000, 5000);
    } catch (err) {
      console.log(`[NaukriScraper] Could not fetch detail for "${job.title}": ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape job listings from Naukri.com for the given query and location.
 *
 * @param {string}  query            – Job title / keyword(s) to search for
 * @param {string}  [location='India'] – City or region
 * @returns {Promise<object[]>}       Normalised job objects (max 20)
 */
export async function scrapeNaukri(query, location = 'India') {
  console.log(`[NaukriScraper] Starting scrape — query="${query}", location="${location}"`);

  let browser = null;

  try {
    // 1. Launch stealth browser
    browser = await launchStealthBrowser();
    const page = (await browser.pages())[0] || (await browser.newPage());

    // Set a realistic viewport
    await page.setViewport({ width: 1366, height: 768 });

    const allRawJobs = [];

    // 2. Iterate through search-result pages (up to MAX_PAGES)
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      // Stop early if we already have enough jobs
      if (allRawJobs.length >= MAX_JOBS) {
        console.log(`[NaukriScraper] Reached ${MAX_JOBS} jobs — stopping pagination`);
        break;
      }

      const searchUrl = buildSearchUrl(query, location, pageNum);
      console.log(`[NaukriScraper] Navigating to page ${pageNum}: ${searchUrl}`);

      try {
        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: NAV_TIMEOUT,
        });
      } catch (navErr) {
        console.log(`[NaukriScraper] Navigation error on page ${pageNum}: ${navErr.message}`);
        break; // Don't try further pages if navigation fails
      }

      // Brief wait for any lazy-loaded content
      await randomDelay(1500, 3000);

      // Extract jobs from the current page
      const pageJobs = await extractJobsFromPage(page);
      if (pageJobs.length === 0) {
        console.log(`[NaukriScraper] No jobs found on page ${pageNum} — stopping`);
        break;
      }

      allRawJobs.push(...pageJobs);
      console.log(`[NaukriScraper] Total raw jobs collected so far: ${allRawJobs.length}`);

      // Polite delay before loading the next page
      if (pageNum < MAX_PAGES) {
        await randomDelay(2000, 4000);
      }
    }

    // 3. Trim to MAX_JOBS
    const trimmedJobs = allRawJobs.slice(0, MAX_JOBS);

    // 4. Optionally enrich the first batch with full descriptions
    try {
      await enrichWithDetails(page, trimmedJobs);
    } catch (enrichErr) {
      console.log('[NaukriScraper] Detail enrichment failed (non-fatal):', enrichErr.message);
    }

    // 5. Normalise every job using the shared helper
    const normalizedJobs = trimmedJobs.map((job) =>
      normalizeJob({
        title: job.title,
        company: job.company,
        location: job.location,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        description: job.description,
        url: job.url,
        experience: job.experience,
        source: 'Naukri',
      }),
    );

    console.log(`[NaukriScraper] Scrape complete — returning ${normalizedJobs.length} jobs`);
    return normalizedJobs;
  } catch (err) {
    console.log('[NaukriScraper] Fatal error during scrape:', err.message);
    return [];
  } finally {
    // 6. Always close the browser
    if (browser) {
      try {
        await browser.close();
        console.log('[NaukriScraper] Browser closed');
      } catch (closeErr) {
        console.log('[NaukriScraper] Error closing browser:', closeErr.message);
      }
    }
  }
}
