// ─── Resume & Job Recommender Types ─────────────────────────────────────────

export interface ResumeProfile {
  id: string;
  user_id: string;
  raw_text: string;
  file_url?: string;
  parsed_profile: ParsedResume;
  uploaded_at: string;
  updated_at: string;
}

export interface ParsedResume {
  full_name: string;
  email: string;
  target_roles: string[];
  skills: string[];
  tools: string[];
  years_of_experience: number;
  seniority_level: 'fresher' | 'junior' | 'mid' | 'senior' | 'lead';
  education: string;
  industries: string[];
  languages: string[];
  certifications: string[];
  summary: string;
}

export interface JobMatchResult {
  match_score: number; // 0-100
  matched_skills: string[];
  missing_skills: string[];
  bonus_skills: string[];
  seniority_match: boolean;
  shortlist_verdict: 'strong' | 'likely' | 'possible' | 'unlikely';
  shortlist_reasoning: string;
  suggested_resume_tweaks: string[];
}

export interface CachedJob {
  id: string;
  external_id: string;
  source: string;
  title: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
  is_remote: boolean;
  posted_at: string;
  fetched_at: string;
}

export interface JobRecommendation {
  id: string;
  user_id: string;
  job_id: string;
  match_score: number;
  match_details: JobMatchResult;
  shortlist_verdict: 'strong' | 'likely' | 'possible' | 'unlikely';
  suggested_tweaks: string[];
  is_dismissed: boolean;
  is_saved: boolean;
  recommended_at: string;
  job?: CachedJob;
}

export interface JobAlert {
  id: string;
  user_id: string;
  role_title: string;
  location?: string;
  remote_only: boolean;
  skills: string[];
  frequency: 'instant' | 'daily' | 'weekly';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
