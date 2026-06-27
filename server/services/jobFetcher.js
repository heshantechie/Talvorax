import fetch from 'node-fetch'; // Make sure node-fetch is available, or use native fetch if Node >= 18
import dotenv from 'dotenv';
dotenv.config();

// Helper to calculate expiration date
const getExpiresAt = (days = 48) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const fetchFromJSearch = async (keyword, location) => {
  if (!process.env.JSEARCH_API_KEY) throw new Error('JSEARCH_API_KEY missing');
  
  const query = `${keyword} in ${location || 'anywhere'}`;
  const url = `https://${process.env.JSEARCH_HOST}/search?query=${encodeURIComponent(query)}&num_pages=1`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': process.env.JSEARCH_API_KEY,
      'X-RapidAPI-Host': process.env.JSEARCH_HOST
    }
  };

  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`JSearch API error: ${response.statusText}`);
  const data = await response.json();

  return (data.data || []).map(job => ({
    job_id: `jsearch-${job.job_id}`,
    source: 'JSearch',
    title: job.job_title,
    company: job.employer_name,
    location: `${job.job_city || ''}, ${job.job_country || ''}`.trim(),
    remote: job.job_is_remote || false,
    salary_min: job.job_min_salary || null,
    salary_max: job.job_max_salary || null,
    description: job.job_description || '',
    url: job.job_apply_link || '',
    posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
    expires_at: job.job_offer_expiration_datetime_utc || getExpiresAt()
  }));
};

export const fetchFromAdzuna = async (keyword, location, country = 'in') => {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    throw new Error('ADZUNA credentials missing');
  }

  const query = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID,
    app_key: process.env.ADZUNA_APP_KEY,
    what: keyword,
    where: location || '',
    results_per_page: 20
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${query.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Adzuna API error: ${response.statusText}`);
  const data = await response.json();

  return (data.results || []).map(job => ({
    job_id: `adzuna-${job.id}`,
    source: 'Adzuna',
    title: job.title,
    company: job.company?.display_name || '',
    location: job.location?.display_name || location,
    remote: false, // Adzuna doesn't have a strict boolean for this, might need parsing
    salary_min: job.salary_min || null,
    salary_max: job.salary_max || null,
    description: job.description || '',
    url: job.redirect_url || '',
    posted_at: job.created || new Date().toISOString(),
    expires_at: getExpiresAt()
  }));
};

export const fetchFromRemotive = async (keyword) => {
  const url = `${process.env.REMOTIVE_BASE_URL || 'https://remotive.com/api/remote-jobs'}?search=${encodeURIComponent(keyword)}&limit=20`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Remotive API error: ${response.statusText}`);
  const data = await response.json();

  return (data.jobs || []).map(job => ({
    job_id: `remotive-${job.id}`,
    source: 'Remotive',
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || 'Worldwide',
    remote: true,
    salary_min: null, // Remotive usually has salary in a string format, hard to parse min/max
    salary_max: null,
    description: job.description || '',
    url: job.url,
    posted_at: job.publication_date || new Date().toISOString(),
    expires_at: getExpiresAt()
  }));
};

export const fetchAllJobs = async (keyword, location) => {
  const results = await Promise.allSettled([
    fetchFromJSearch(keyword, location),
    fetchFromAdzuna(keyword, location),
    fetchFromRemotive(keyword)
  ]);

  const allJobs = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
    } else {
      console.error('Job fetcher error:', result.reason);
    }
  });

  return allJobs;
};
