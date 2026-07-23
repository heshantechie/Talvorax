// src/lib/freeLimits.ts
// Central utility for checking free-tier usage limits.
// All checks query Supabase directly so the counts are always accurate.

import { supabase } from './supabase';
import { FREE_MONTHLY_INTERVIEW_LIMIT, FREE_DAILY_JOB_ALERT_LIMIT } from './pricing';

export interface LimitStatus {
  used: number;
  limit: number;
  isAtLimit: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO string for the start of the current calendar month (UTC). */
const startOfMonth = (): string => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
};

/** ISO string for the start of today (UTC). */
const startOfDay = (): string => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
};

// ─── Mock Interview Limit (5 per month) ───────────────────────────────────────

/**
 * Counts completed/active mock interview sessions started this calendar month.
 * Free users are capped at FREE_MONTHLY_INTERVIEW_LIMIT (5).
 */
export const checkInterviewLimit = async (userId: string): Promise<LimitStatus> => {
  try {
    const { count, error } = await supabase
      .from('interview_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth());

    if (error) throw error;

    const used = count ?? 0;
    return {
      used,
      limit: FREE_MONTHLY_INTERVIEW_LIMIT,
      isAtLimit: used >= FREE_MONTHLY_INTERVIEW_LIMIT,
    };
  } catch (err) {
    console.error('[freeLimits] checkInterviewLimit error:', err);
    // On error, allow the action (fail open so users aren't incorrectly blocked)
    return { used: 0, limit: FREE_MONTHLY_INTERVIEW_LIMIT, isAtLimit: false };
  }
};

// ─── Job Alert Limit (3 per day) ─────────────────────────────────────────────

/**
 * Counts job alerts created today for the user.
 * Free users are capped at FREE_DAILY_JOB_ALERT_LIMIT (3) new alerts per day.
 */
export const checkJobAlertLimit = async (userId: string): Promise<LimitStatus> => {
  try {
    const { count, error } = await supabase
      .from('job_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay());

    if (error) throw error;

    const used = count ?? 0;
    return {
      used,
      limit: FREE_DAILY_JOB_ALERT_LIMIT,
      isAtLimit: used >= FREE_DAILY_JOB_ALERT_LIMIT,
    };
  } catch (err) {
    console.error('[freeLimits] checkJobAlertLimit error:', err);
    return { used: 0, limit: FREE_DAILY_JOB_ALERT_LIMIT, isAtLimit: false };
  }
};
