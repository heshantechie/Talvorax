/**
 * Arbeitnow Scraper
 * 
 * Fetches job listings from the Arbeitnow public JSON API.
 * This is 100% reliable, fast, and does not require Puppeteer (no anti-bot block risk).
 */

import axios from 'axios';
import { normalizeJob } from './scraperUtils.js';

export async function scrapeArbeitnow(query, location = 'Remote') {
  console.log(`[ArbeitnowScraper] Fetching API results and filtering locally for "${query}"`);
  try {
    const url = 'https://www.arbeitnow.com/api/job-board-api';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    if (!response.data || !Array.isArray(response.data.data)) {
      console.log('[ArbeitnowScraper] No jobs returned from Arbeitnow API');
      return [];
    }

    const rawJobs = response.data.data;
    console.log(`[ArbeitnowScraper] API returned ${rawJobs.length} raw jobs`);

    // Filter locally by query matching title, company, or tags
    const q = query.toLowerCase().trim();
    const filteredJobs = rawJobs.filter(job => {
      const title = (job.title || '').toLowerCase();
      const company = (job.company_name || '').toLowerCase();
      const tags = Array.isArray(job.tags) ? job.tags.map(t => String(t).toLowerCase()) : [];
      
      return title.includes(q) || 
             company.includes(q) || 
             tags.some(tag => tag.includes(q));
    });

    console.log(`[ArbeitnowScraper] Filtered down to ${filteredJobs.length} matching jobs (out of ${rawJobs.length} total)`);

    // Limit to top 20 jobs
    const targetJobs = filteredJobs.slice(0, 20);

    const normalizedJobs = targetJobs.map(job => {
      // Parse description (strip HTML tags)
      const cleanDesc = (job.description || '').replace(/<[^>]*>/g, ' ');

      return normalizeJob({
        id: job.slug, // Use slug as external ID since it is unique
        title: job.title,
        company: job.company_name,
        location: job.location || 'Remote',
        description: cleanDesc,
        url: job.url,
        is_remote: job.remote || false,
        posted_at: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
        source: 'Arbeitnow',
      });
    });

    console.log(`[ArbeitnowScraper] Successfully normalized ${normalizedJobs.length} jobs`);
    return normalizedJobs;
  } catch (err) {
    console.log('[ArbeitnowScraper] Failed to fetch from Arbeitnow:', err.message);
    return [];
  }
}
