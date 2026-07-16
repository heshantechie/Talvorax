/**
 * We Work Remotely Scraper
 * 
 * Scrapes job listings from weworkremotely.com.
 * WWR is developer-friendly, does not require login, and does not block scrapers.
 */

import { launchStealthBrowser, randomDelay, normalizeJob, safeTextContent } from './scraperUtils.js';

const MAX_JOBS = 20;
const MAX_DETAIL_VISITS = 10;

async function fetchJobDescription(page, url) {
  try {
    console.log('[WWRScraper] Fetching description from:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const selector = '#job-details, .job-container, .listing-container';
    await page.waitForSelector(selector, { timeout: 10000 });
    const description = await safeTextContent(page, selector);
    return description;
  } catch (err) {
    console.log('[WWRScraper] Failed to fetch description:', err.message);
    return '';
  }
}

export async function scrapeWeWorkRemotely(query, location = 'Remote') {
  console.log(`[WWRScraper] Starting scrape for "${query}"`);
  let browser = null;

  try {
    browser = await launchStealthBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    const searchUrl = `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(query)}`;
    console.log('[WWRScraper] Navigating to:', searchUrl);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const cardSelector = 'section.jobs article ul li:not(.view-all)';
    try {
      await page.waitForSelector(cardSelector, { timeout: 15000 });
    } catch {
      console.log('[WWRScraper] No jobs found for query');
      return [];
    }

    const jobCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('section.jobs article ul li:not(.view-all)');
      const jobs = [];

      cards.forEach(card => {
        try {
          const titleEl = card.querySelector('.title');
          const companyEl = card.querySelector('.company');
          const regionEl = card.querySelector('.region');
          const linkEl = card.querySelector('a[href^="/remote-jobs/"]');

          const title = titleEl ? titleEl.textContent.trim() : '';
          const company = companyEl ? companyEl.textContent.trim() : '';
          const location = regionEl ? regionEl.textContent.trim() : 'Remote';
          const url = linkEl ? linkEl.href : '';

          // Extracts job key from WWR URL (e.g. /remote-jobs/company-title-12345)
          const match = url.match(/-(\d+)$/);
          const jobId = match ? match[1] : '';

          if (title && url) {
            jobs.push({ title, company, location, url, id: jobId });
          }
        } catch {
          // Skip card errors
        }
      });

      return jobs;
    });

    console.log(`[WWRScraper] Found ${jobCards.length} job cards on page`);
    const targetJobs = jobCards.slice(0, MAX_JOBS);

    const detailCount = Math.min(targetJobs.length, MAX_DETAIL_VISITS);
    for (let i = 0; i < detailCount; i++) {
      if (i > 0) {
        await randomDelay(2000, 4000);
      }
      const description = await fetchJobDescription(page, targetJobs[i].url);
      targetJobs[i].description = description;
    }

    const normalizedJobs = targetJobs.map(job =>
      normalizeJob({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description || '',
        url: job.url,
        is_remote: true,
        posted_at: new Date().toISOString(),
        source: 'WeWorkRemotely',
      })
    );

    return normalizedJobs;
  } catch (err) {
    console.log('[WWRScraper] Scrape failed:', err.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
