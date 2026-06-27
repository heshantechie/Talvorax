export const computeMatchScore = (job, alert) => {
  let score = 0;

  const jobTitle = (job.title || '').toLowerCase();
  const alertTitle = (alert.role_title || '').toLowerCase();
  
  // Title keyword match (40 points): Any word in alert title found in job title
  const alertTitleWords = alertTitle.split(/\s+/).filter(w => w.length > 2);
  const titleMatch = alertTitleWords.some(word => jobTitle.includes(word));
  if (titleMatch || jobTitle.includes(alertTitle)) {
    score += 40;
  }

  // Skills overlap (up to 30 points)
  const jobDesc = (job.description || '').toLowerCase();
  const keywords = alert.keywords || [];
  let matchedSkills = 0;
  keywords.forEach(keyword => {
    const kw = keyword.toLowerCase();
    if (jobDesc.includes(kw) || jobTitle.includes(kw)) {
      matchedSkills += 1;
    }
  });
  score += Math.min(matchedSkills * 10, 30);

  // Remote match (15 points)
  if (alert.remote_only && job.remote) {
    score += 15;
  } else if (!alert.remote_only) {
    // If user doesn't care about remote, give partial points to level the field
    score += 5;
  }

  // Location fuzzy match (15 points)
  const jobLocation = (job.location || '').toLowerCase();
  const alertLocation = (alert.location || '').toLowerCase();
  if (alertLocation && jobLocation.includes(alertLocation)) {
    score += 15;
  } else if (!alertLocation) {
    // If no location preference, give points
    score += 15;
  }

  return score;
};

export const runMatchingEngine = async (supabaseAdmin) => {
  console.log('Starting matching engine...');

  // 1. Fetch all active alerts
  const { data: alerts, error: alertsError } = await supabaseAdmin
    .from('job_alerts')
    .select('*')
    .eq('status', 'active');
    
  if (alertsError) {
    console.error('Error fetching alerts:', alertsError);
    return;
  }
  
  if (!alerts || alerts.length === 0) {
    console.log('No active alerts found.');
    return;
  }

  // 2. Fetch jobs from the last 48 hours
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data: cachedJobs, error: jobsError } = await supabaseAdmin
    .from('jobs_cache')
    .select('*')
    .gte('created_at', twoDaysAgo.toISOString());

  if (jobsError) {
    console.error('Error fetching cached jobs:', jobsError);
    return;
  }

  if (!cachedJobs || cachedJobs.length === 0) {
    console.log('No recent cached jobs found.');
    return;
  }

  // 3. Score and match jobs to alerts
  const recommendationsToInsert = [];
  const deliveriesToInsert = [];

  for (const alert of alerts) {
    // Get already delivered jobs for this user to avoid duplicates
    const { data: pastDeliveries } = await supabaseAdmin
      .from('job_alert_deliveries')
      .select('job_id')
      .eq('user_id', alert.user_id);
      
    const deliveredJobIds = new Set((pastDeliveries || []).map(d => d.job_id));

    for (const job of cachedJobs) {
      if (deliveredJobIds.has(job.job_id)) continue;

      const score = computeMatchScore(job, alert);
      
      // Threshold: minimum 40 points to be recommended
      if (score >= 40) {
        recommendationsToInsert.push({
          user_id: alert.user_id,
          job_id: job.job_id,
          match_score: score,
          status: 'new'
        });
        
        deliveriesToInsert.push({
          user_id: alert.user_id,
          job_id: job.job_id
        });
      }
    }
  }

  // 4. Upsert recommendations
  if (recommendationsToInsert.length > 0) {
    const { error: insertRecsError } = await supabaseAdmin
      .from('job_recommendations')
      .upsert(recommendationsToInsert, { onConflict: 'user_id, job_id' });
      
    if (insertRecsError) {
      console.error('Error upserting recommendations:', insertRecsError);
    } else {
      console.log(`Successfully upserted ${recommendationsToInsert.length} recommendations.`);
    }
  }

  // 5. Log deliveries
  if (deliveriesToInsert.length > 0) {
    // Ignore conflicts for deliveries
    const { error: insertDelivError } = await supabaseAdmin
      .from('job_alert_deliveries')
      .insert(deliveriesToInsert);
      
    if (insertDelivError) {
      console.error('Error inserting deliveries (some might be duplicates):', insertDelivError);
    }
  }

  console.log('Matching engine complete.');
};
