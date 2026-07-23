import { supabase } from './supabase';

// Product analytics events. Every event goes to two sinks:
//  1. GA4 via the gtag snippet in index.html (best-effort, no-op if blocked)
//  2. The `analytics_events` table in Supabase (see supabase/schema_analytics.sql)
// Neither sink may ever throw into a user flow.

export type AnalyticsEvent =
  | 'signup'
  | 'first_analysis_completed'
  | 'mock_interview_started'
  | 'mock_interview_completed'
  | 'free_limit_hit'
  | 'upgraded_to_paid'
  | 'upgrade_cta_clicked';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const track = (
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean | null> = {},
  userId?: string | null
): void => {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, properties);
    }
  } catch (e) {
    console.warn('[analytics] gtag failed:', e);
  }

  supabase
    .from('analytics_events')
    .insert({
      event_name: event,
      user_id: userId ?? null,
      properties,
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('[analytics] event log insert failed:', error.message);
    });
};

// Fire-once guard for events that must not double-fire per user (e.g. signup
// re-triggering on every OAuth redirect back into the app).
export const trackOnce = (
  key: string,
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean | null> = {},
  userId?: string | null
): void => {
  const storageKey = `tv_tracked_${key}`;
  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // localStorage unavailable — still send, accepting possible duplicates
  }
  track(event, properties, userId);
};
