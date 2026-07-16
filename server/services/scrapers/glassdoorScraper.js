/**
 * Glassdoor India Job Scraper
 * 
 * Scrapes job listings from Glassdoor India (glassdoor.co.in).
 * Uses Puppeteer with stealth mode to navigate the dynamically-rendered
 * React-based Glassdoor pages.
 * 
 * Target URL pattern:
 *   https://www.glassdoor.co.in/Job/india-{query}-jobs-SRCH_KO6,{end}.htm
 * 
 * Rate limiting: Uses 5-8s delays between detail page visits to avoid detection.
 */

import { launchStealthBrowser, randomDelay, normalizeJob, safeTextContent } from './scraperUtils.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_JOBS = 20;
const MAX_DETAIL_VISITS = 10;
const DETAIL_DELAY_MIN = 5000;  // 5 seconds minimum between detail page visits
const DETAIL_DELAY_MAX = 8000;  // 8 seconds maximum between detail page visits
const PAGE_LOAD_TIMEOUT = 60000;
const CARD_WAIT_TIMEOUT = 15000;

/**
 * Build the Glassdoor India search URL for a given query.
 * 
 * Glassdoor uses a URL pattern that embeds the query as a slug and
 * character offsets in the SRCH_KO parameter:
 *   /Job/india-react-developer-jobs-SRCH_KO6,21.htm
 *   where 6 = length of "india-" and 21 = 6 + query-slug length
 * 
 * @param {string} query - Raw search query (e.g., "React Developer")
 * @returns {string}       Full Glassdoor search URL
 */
function buildSearchUrl(query) {
  const slug = query.replace(/\s+/g, '-').toLowerCase();
  const startOffset = 6; // length of "india-"
  const endOffset = startOffset + slug.length;
  return `https://www.glassdoor.co.in/Job/india-${slug}-jobs-SRCH_KO${startOffset},${endOffset}.htm`;
}

/**
 * Extract job card data from the Glassdoor search results page.
 * 
 * Glassdoor renders job cards using React components. The selectors may
 * change over time — we try multiple fallback selectors to be resilient.
 * 
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @returns {Promise<Array<Object>>}        Array of raw job card objects
 */
async function extractJobCards(page) {
  return page.evaluate(() => {
    // Glassdoor uses data-test attributes and React class names
    const cardSelectors = [
      '[data-test="jobListing"]',
      '.react-job-listing',
      'li.react-job-listing',
      '[data-id]',   // Fallback: cards often have a data-id attribute
    ];

    let cards = [];
    for (const selector of cardSelectors) {
      cards = document.querySelectorAll(selector);
      if (cards.length > 0) break;
    }

    const jobs = [];

    cards.forEach(card => {
      try {
        // ----- Title -----
        // Glassdoor typically uses an anchor tag with the job title
        const titleSelectors = [
          '[data-test="job-title"]',
          '.job-title',
          'a.jobLink',
          'a[data-test="job-link"]',
          'h2 a',
        ];
        let title = '';
        let url = '';
        for (const sel of titleSelectors) {
          const el = card.querySelector(sel);
          if (el) {
            title = el.textContent.trim();
            url = el.href || '';
            break;
          }
        }

        // ----- Company -----
        const companySelectors = [
          '[data-test="emp-name"]',
          '.job-search-key-l2hmii',
          '.e1n63ojh0',
          'span.job-search-key-l2hmii',
          '.employerName',
        ];
        let company = '';
        for (const sel of companySelectors) {
          const el = card.querySelector(sel);
          if (el) {
            company = el.textContent.trim();
            break;
          }
        }

        // ----- Location -----
        const locationSelectors = [
          '[data-test="emp-location"]',
          '.job-search-key-1p7qaeo',
          '.e1rrn5ka4',
          '.loc',
        ];
        let location = '';
        for (const sel of locationSelectors) {
          const el = card.querySelector(sel);
          if (el) {
            location = el.textContent.trim();
            break;
          }
        }

        // ----- Salary (optional) -----
        const salarySelectors = [
          '[data-test="detailSalary"]',
          '.salary-estimate',
          '.css-1bluz6i',
          '.e1wijj240',
        ];
        let salary = '';
        for (const sel of salarySelectors) {
          const el = card.querySelector(sel);
          if (el) {
            salary = el.textContent.trim();
            break;
          }
        }

        // ----- Job ID -----
        const jobId = card.getAttribute('data-id') ||
                       card.getAttribute('data-job-id') ||
                       '';

        // Ensure the URL is absolute
        if (url && !url.startsWith('http')) {
          url = `https://www.glassdoor.co.in${url}`;
        }

        if (title) {
          jobs.push({ title, company, location, salary, url, jobId });
        }
      } catch {
        // Skip malformed cards silently
      }
    });

    return jobs;
  });
}

/**
 * Visit a Glassdoor job detail page and extract the full description.
 * 
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string}                   url  - Job detail page URL
 * @returns {Promise<string>}               Job description text or empty string
 */
async function fetchJobDescription(page, url) {
  try {
    console.log('[GlassdoorScraper] Fetching description from:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Glassdoor renders job descriptions in various containers
    const descriptionSelectors = [
      '[data-test="jobDescriptionContent"]',
      '.jobDescriptionContent',
      '.desc',
      '.job-description',
      '[class*="JobDescription"]',
      '[class*="jobDescription"]',
    ];

    let description = '';

    for (const selector of descriptionSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        description = await safeTextContent(page, selector);
        if (description) break;
      } catch {
        // Try the next selector
      }
    }

    return description;
  } catch (err) {
    console.log('[GlassdoorScraper] Failed to fetch description:', err.message);
    return '';
  }
}

/**
 * Parse a salary string into min/max numeric values.
 * 
 * Handles formats like:
 *   "₹8L - ₹15L (Employer Est.)"
 *   "₹8,00,000 - ₹15,00,000"
 *   "₹10L"
 * 
 * @param {string} salaryStr - Raw salary string from Glassdoor
 * @returns {{ min: number|null, max: number|null }}
 */
function parseSalary(salaryStr) {
  if (!salaryStr) return { min: null, max: null };

  try {
    // Remove currency symbols, commas, and non-numeric/non-range chars
    const cleaned = salaryStr.replace(/[₹$€,]/g, '').trim();

    // Match patterns like "8L - 15L" or "800000 - 1500000"
    const rangeMatch = cleaned.match(/([\d.]+)\s*[Ll]?\s*[-–to]+\s*([\d.]+)\s*[Ll]?/);
    if (rangeMatch) {
      let min = parseFloat(rangeMatch[1]);
      let max = parseFloat(rangeMatch[2]);

      // If values are small, they're likely in lakhs
      if (min < 1000) min *= 100000;
      if (max < 1000) max *= 100000;

      return { min, max };
    }

    // Single value like "10L"
    const singleMatch = cleaned.match(/([\d.]+)\s*[Ll]?/);
    if (singleMatch) {
      let val = parseFloat(singleMatch[1]);
      if (val < 1000) val *= 100000;
      return { min: val, max: val };
    }
  } catch {
    // Salary parsing is best-effort
  }

  return { min: null, max: null };
}

/**
 * Scrape Glassdoor India job listings for a given query and location.
 * 
 * This function:
 *   1. Launches a stealth browser to handle Glassdoor's bot protection
 *   2. Navigates to Glassdoor India's search page with the query slug
 *   3. Extracts job cards (title, company, location, salary, URL)
 *   4. Visits up to 10 detail pages for full job descriptions
 *   5. Returns up to 20 normalized job objects
 * 
 * @param {string} query                - Job search keywords (e.g., "React Developer")
 * @param {string} [location='India']   - Location filter (used in normalization)
 * @returns {Promise<Array<Object>>}      Normalized job objects with source='Glassdoor'
 */
export async function scrapeGlassdoor(query, location = 'India') {
  console.log(`[GlassdoorScraper] Starting scrape for "${query}" in "${location}"`);

  let browser = null;

  try {
    // 1. Launch stealth browser
    browser = await launchStealthBrowser();
    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1366, height: 768 });

    // 2. Build and navigate to the search URL
    const searchUrl = buildSearchUrl(query);
    console.log('[GlassdoorScraper] Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: PAGE_LOAD_TIMEOUT });

    // 3. Wait for job cards to render
    try {
      await page.waitForSelector(
        '[data-test="jobListing"], .react-job-listing, li[data-id]',
        { timeout: CARD_WAIT_TIMEOUT }
      );
      console.log('[GlassdoorScraper] Job cards loaded');
    } catch {
      console.log('[GlassdoorScraper] No job cards found or page structure changed');

      // Glassdoor may show a CAPTCHA or redirect — log the page title for debugging
      const pageTitle = await page.title();
      console.log('[GlassdoorScraper] Page title:', pageTitle);
      return [];
    }

    // Handle cookie consent / modal popups that Glassdoor often shows
    try {
      const closeSelectors = [
        '[data-test="close-button"]',
        'button[aria-label="Close"]',
        '#onetrust-accept-btn-handler',
        '.modal_closeIcon',
      ];
      for (const sel of closeSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          console.log('[GlassdoorScraper] Dismissed popup/modal');
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
        }
      }
    } catch {
      // No popup to dismiss — continue
    }

    // 4. Extract job cards
    let jobCards = await extractJobCards(page);
    console.log(`[GlassdoorScraper] Found ${jobCards.length} job cards on page`);

    // Cap at MAX_JOBS
    jobCards = jobCards.slice(0, MAX_JOBS);

    // 5. Visit detail pages for full descriptions (first N only)
    const detailCount = Math.min(jobCards.length, MAX_DETAIL_VISITS);
    console.log(`[GlassdoorScraper] Fetching descriptions for first ${detailCount} jobs`);

    for (let i = 0; i < detailCount; i++) {
      const job = jobCards[i];

      // Skip if no detail URL available
      if (!job.url) {
        console.log(`[GlassdoorScraper] No URL for job "${job.title}" — skipping detail fetch`);
        continue;
      }

      // Rate-limit: wait 5-8 seconds between visits
      if (i > 0) {
        const delay = await randomDelay(DETAIL_DELAY_MIN, DETAIL_DELAY_MAX);
        console.log(`[GlassdoorScraper] Waiting ${delay}ms before next detail page...`);
      }

      const description = await fetchJobDescription(page, job.url);
      jobCards[i].description = description;
    }

    // 6. Normalize all jobs
    const normalizedJobs = jobCards.map(job => {
      const salary = parseSalary(job.salary);

      return normalizeJob({
        title: job.title,
        company: job.company,
        location: job.location || location,
        description: job.description || '',
        url: job.url || '',
        salary_min: salary.min,
        salary_max: salary.max,
        postedAt: new Date().toISOString(), // Glassdoor cards don't always show exact dates
        source: 'Glassdoor',
      });
    });

    console.log(`[GlassdoorScraper] Successfully scraped ${normalizedJobs.length} jobs`);
    return normalizedJobs;
  } catch (err) {
    console.log('[GlassdoorScraper] Scraping failed:', err.message);
    return [];
  } finally {
    // 7. Always close the browser
    if (browser) {
      try {
        await browser.close();
        console.log('[GlassdoorScraper] Browser closed');
      } catch (closeErr) {
        console.log('[GlassdoorScraper] Error closing browser:', closeErr.message);
      }
    }
  }
}
