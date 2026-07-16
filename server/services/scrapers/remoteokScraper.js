/**
 * RemoteOK Scraper
 * 
 * Fetches job listings from the RemoteOK public JSON API.
 * This is 100% reliable, fast, and does not require Puppeteer (stealth browser is not blocked).
 */

import axios from 'axios';
import { normalizeJob } from './scraperUtils.js';

export async function scrapeRemoteOK(query, location = 'Remote') {
  console.log(`[RemoteOKScraper] Fetching all API results and filtering locally for "${query}"`);
  try {
    // Fetch all active remote jobs
    const url = 'https://remoteok.com/api';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });

    if (!Array.isArray(response.data) || response.data.length <= 1) {
      console.log('[RemoteOKScraper] No jobs returned from RemoteOK API');
      return [];
    }

    // Skip the legal disclaimer element
    const rawJobs = response.data.slice(1);
    
    // Filter locally by query matching position, company, or tags
    const q = query.toLowerCase().trim();
    const filteredJobs = rawJobs.filter(job => {
      const position = (job.position || '').toLowerCase();
      const company = (job.company || '').toLowerCase();
      const tags = Array.isArray(job.tags) ? job.tags.map(t => String(t).toLowerCase()) : [];
      
      return position.includes(q) || 
             company.includes(q) || 
             tags.some(tag => tag.includes(q));
    });

    console.log(`[RemoteOKScraper] Filtered down to ${filteredJobs.length} matching jobs (out of ${rawJobs.length} total)`);

    // Limit to top 20 jobs
    const targetJobs = filteredJobs.slice(0, 20);

    const normalizedJobs = targetJobs.map(job => {
      const cleanDesc = (job.description || '').replace(/<[^>]*>/g, ' ');

      return normalizeJob({
        id: job.id,
        title: job.position,
        company: job.company,
        location: job.location || 'Remote',
        description: cleanDesc,
        url: job.url,
        is_remote: true,
        posted_at: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
        salary_min: job.salary_min || null,
        salary_max: job.salary_max || null,
        source: 'RemoteOK',
      });
    });

    console.log(`[RemoteOKScraper] Successfully normalized ${normalizedJobs.length} jobs`);
    return normalizedJobs;
  } catch (err) {
    console.log('[RemoteOKScraper] Failed to fetch from RemoteOK:', err.message);
    return [];
  }
}
