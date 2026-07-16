/**
 * LinkedIn Public Job Scraper
 * 
 * Scrapes job listings from LinkedIn's public job search pages (no login required).
 * Uses Puppeteer with stealth mode to avoid bot detection.
 * 
 * LinkedIn's public job search exposes listings at:
 *   https://www.linkedin.com/jobs/search/?keywords=...&location=...
 * 
 * Rate limiting: LinkedIn is aggressive with bot detection, so we use
 * randomized delays (5-8s) between detail page visits and stealth browser settings.
 */

import { launchStealthBrowser, randomDelay, normalizeJob, safeTextContent } from './scraperUtils.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_JOBS = 20;
const MAX_DETAIL_VISITS = 10;
const DETAIL_DELAY_MIN = 5000;  // 5 seconds minimum between detail page visits
const DETAIL_DELAY_MAX = 8000;  // 8 seconds maximum between detail page visits
const SCROLL_PAUSE = 2000;      // Pause between scroll actions (ms)
const MAX_SCROLL_ATTEMPTS = 5;  // Max number of scroll-to-bottom attempts

/**
 * Scroll the page incrementally to trigger LinkedIn's lazy-loaded job cards.
 * 
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
async function autoScroll(page) {
  console.log('[LinkedInScraper] Scrolling to load more job cards...');

  for (let i = 0; i < MAX_SCROLL_ATTEMPTS; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, SCROLL_PAUSE));

    // Click the "See more jobs" button if it exists
    try {
      const seeMoreBtn = await page.$('button.infinite-scroller__show-more-button');
      if (seeMoreBtn) {
        await seeMoreBtn.click();
        console.log('[LinkedInScraper] Clicked "See more jobs" button');
        await new Promise(resolve => setTimeout(resolve, SCROLL_PAUSE));
      }
    } catch {
      // Button may not exist — that's fine
    }
  }
}

/**
 * Extract basic job card data from the LinkedIn search results page.
 * 
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @returns {Promise<Array<Object>>} Array of raw job card objects
 */
async function extractJobCards(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('.base-card, .base-search-card');
    const jobs = [];

    cards.forEach(card => {
      try {
        // Title
        const titleEl = card.querySelector('.base-search-card__title');
        const title = titleEl ? titleEl.textContent.trim() : '';

        // Company
        const companyEl = card.querySelector('.base-search-card__subtitle');
        const company = companyEl ? companyEl.textContent.trim() : '';

        // Location
        const locationEl = card.querySelector('.job-search-card__location');
        const location = locationEl ? locationEl.textContent.trim() : '';

        // Posted date from <time> element
        const timeEl = card.querySelector('time');
        const postedAt = timeEl ? timeEl.getAttribute('datetime') : '';

        // Job detail URL from the card link
        const linkEl = card.querySelector('a');
        const url = linkEl ? linkEl.href : '';

        if (title && url) {
          jobs.push({ title, company, location, postedAt, url });
        }
      } catch {
        // Skip malformed cards silently
      }
    });

    return jobs;
  });
}

/**
 * Visit a job detail page and extract the full description.
 * 
 * @param {import('puppeteer').Page} page    - Puppeteer page instance
 * @param {string}                   url     - Job detail page URL
 * @returns {Promise<string>}                  Job description text or empty string
 */
async function fetchJobDescription(page, url) {
  try {
    console.log('[LinkedInScraper] Fetching description from:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // LinkedIn renders descriptions in several possible containers
    const descriptionSelectors = [
      '.show-more-less-html__markup',
      '.description__text',
      '.decorated-job-posting__details',
      '[class*="description"]',
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
    console.log('[LinkedInScraper] Failed to fetch description:', err.message);
    return '';
  }
}

/**
 * Scrape LinkedIn public job listings for a given query and location.
 * 
 * This function:
 *   1. Launches a stealth browser to bypass basic bot detection
 *   2. Navigates to LinkedIn's public job search page (last 7 days filter)
 *   3. Scrolls down to trigger lazy-loaded job cards
 *   4. Extracts basic card data (title, company, location, posted date, URL)
 *   5. Visits up to 10 detail pages for full job descriptions
 *   6. Returns up to 20 normalized job objects
 * 
 * @param {string} query                - Job search keywords (e.g., "React Developer")
 * @param {string} [location='India']   - Job location filter
 * @returns {Promise<Array<Object>>}      Normalized job objects with source='LinkedIn'
 */
export async function scrapeLinkedIn(query, location = 'India') {
  console.log(`[LinkedInScraper] Starting scrape for "${query}" in "${location}"`);

  let browser = null;

  try {
    // 1. Launch stealth browser
    browser = await launchStealthBrowser();
    const page = await browser.newPage();

    // Set a realistic viewport and user-agent behaviour
    await page.setViewport({ width: 1366, height: 768 });

    // 2. Build the LinkedIn public search URL
    //    f_TPR=r604800 => posted within the last 7 days
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&f_TPR=r604800&position=1&pageNum=0`;

    console.log('[LinkedInScraper] Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // 3. Wait for job results to render
    try {
      await page.waitForSelector('.jobs-search__results-list, .base-card', {
        timeout: 15000,
      });
      console.log('[LinkedInScraper] Job results loaded');
    } catch {
      console.log('[LinkedInScraper] No job results found or page structure changed');
      return [];
    }

    // 4. Scroll to load additional lazy-loaded cards
    await autoScroll(page);

    // 5. Extract basic card data
    let jobCards = await extractJobCards(page);
    console.log(`[LinkedInScraper] Found ${jobCards.length} job cards on page`);

    // Cap at MAX_JOBS
    jobCards = jobCards.slice(0, MAX_JOBS);

    // 6. Visit detail pages for full descriptions (first N only)
    const detailCount = Math.min(jobCards.length, MAX_DETAIL_VISITS);
    console.log(`[LinkedInScraper] Fetching descriptions for first ${detailCount} jobs`);

    for (let i = 0; i < detailCount; i++) {
      const job = jobCards[i];

      // Rate-limit: wait 5-8 seconds between visits to avoid detection
      if (i > 0) {
        const delay = await randomDelay(DETAIL_DELAY_MIN, DETAIL_DELAY_MAX);
        console.log(`[LinkedInScraper] Waiting ${delay}ms before next detail page...`);
      }

      const description = await fetchJobDescription(page, job.url);
      jobCards[i].description = description;
    }

    // 7. Normalize all jobs
    const normalizedJobs = jobCards.map(job =>
      normalizeJob({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description || '',
        url: job.url,
        postedAt: job.postedAt || new Date().toISOString(),
        source: 'LinkedIn',
      })
    );

    console.log(`[LinkedInScraper] Successfully scraped ${normalizedJobs.length} jobs`);
    return normalizedJobs;
  } catch (err) {
    console.log('[LinkedInScraper] Scraping failed:', err.message);
    return [];
  } finally {
    // 8. Always close the browser
    if (browser) {
      try {
        await browser.close();
        console.log('[LinkedInScraper] Browser closed');
      } catch (closeErr) {
        console.log('[LinkedInScraper] Error closing browser:', closeErr.message);
      }
    }
  }
}
