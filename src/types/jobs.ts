export interface JobAlert {
  id: string;
  user_id: string;
  role_title: string;
  location: string | null;
  remote_only: boolean;
  keywords: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CachedJob {
  id: string;
  job_id: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  url: string;
  posted_at: string;
  created_at: string;
  expires_at: string;
}

export interface JobRecommendation {
  id: string;
  user_id: string;
  job_id: string;
  match_score: number;
  status: 'new' | 'viewed' | 'saved' | 'dismissed';
  created_at: string;
  updated_at: string;
  cached_job?: CachedJob;
}
