import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
  Send, CheckCircle, Settings, Sliders, Briefcase, Clock,
  DollarSign, Globe, FileText, Check, X, AlertCircle, Eye,
  RefreshCw, Play, Sparkles, ChevronRight, ExternalLink,
  Bell, Zap, TrendingUp, Layers, ClipboardCheck, MapPin
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { AILoader } from '../components/AILoader';

const API_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost') ? import.meta.env.VITE_API_URL : '')
  : (import.meta.env.VITE_API_URL || '');

/**
 * Feature gate. Auto Apply is built but intentionally NOT exposed to real users
 * yet (see project roadmap — "Coming Soon"). Flip AUTO_APPLY_LIVE to true to ship.
 * Owner preview: append ?preview=autoapply to the URL once (persists via
 * localStorage), or set localStorage.talvorax_autoapply_preview = '1'.
 */
const AUTO_APPLY_LIVE = false;
/**
 * Allowlist — while AUTO_APPLY_LIVE is false, only these signed-in emails get the
 * live engine; everyone else sees the "Coming Soon" splash. Keep in sync with the
 * server-side AUTO_APPLY_ALLOWLIST in server/index.js (that one actually enforces it).
 */
const AUTO_APPLY_ALLOWLIST = [
  'venkatesh.1817.m@gmail.com',
  'bethahemanth7264@gmail.com',
  'shh@gmail.com',
];
const isEmailAllowed = (email?: string | null): boolean =>
  !!email && AUTO_APPLY_ALLOWLIST.includes(email.trim().toLowerCase());

const isPreviewEnabled = (): boolean => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'autoapply') {
      localStorage.setItem('talvorax_autoapply_preview', '1');
    }
    return localStorage.getItem('talvorax_autoapply_preview') === '1';
  } catch {
    return false;
  }
};

/** Sources that sit behind strict external auth portals → Tier 3 (no auto-submit). */
const EXTERNAL_PORTAL_SOURCES = ['linkedin', 'glassdoor'];

interface AutoApplySettings {
  is_enabled: boolean;
  min_match_score: number;
  daily_limit: number;
  is_autopilot: boolean;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  notice_period: string;
  expected_salary: string;
}

interface JobRef {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  remote?: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  posted_at?: string;
}

interface ApplicationLog {
  id: string;
  job_id: string;
  status: 'queued' | 'applying' | 'applied' | 'failed' | 'needs_manual_action';
  error_log: string;
  screenshot_url?: string;
  screenshot_signed_url?: string;
  applied_at?: string;
  created_at: string;
  job?: JobRef;
}

interface Recommendation {
  id: string;
  match_score: number;
  shortlist_verdict?: 'strong' | 'likely' | 'possible' | 'unlikely';
  matched_skills?: string[];
  missing_skills?: string[];
  job?: JobRef;
}

interface Metrics {
  total_jobs_scraped: number;
  completed_applies: number;
  pending_actions: number;
  average_match_score: number;
}

type CoPilotAnswers = { expected_salary: string; notice_period: string; custom_note: string };

export const AutoApplyLanding: React.FC = () => {
  const { session, user } = useAuth();
  const token = session?.access_token || null;

  const previewOn = useMemo(() => isPreviewEnabled(), []);
  const emailAllowed = isEmailAllowed(user?.email);
  const engineUnlocked = AUTO_APPLY_LIVE || previewOn || emailAllowed;

  // Top-level tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');

  // Settings state
  const [settings, setSettings] = useState<AutoApplySettings>({
    is_enabled: false,
    min_match_score: 80,
    daily_limit: 5,
    is_autopilot: false,
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    notice_period: 'Immediate',
    expected_salary: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Data state
  const [applications, setApplications] = useState<ApplicationLog[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [triggeringJobId, setTriggeringJobId] = useState<string | null>(null);
  const [markingAppliedId, setMarkingAppliedId] = useState<string | null>(null);

  // Resume check
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [loadingResumeCheck, setLoadingResumeCheck] = useState(false);

  // Modals / drawers
  const [selectedApp, setSelectedApp] = useState<ApplicationLog | null>(null);
  const [coPilotApp, setCoPilotApp] = useState<ApplicationLog | null>(null);
  const [coPilotAnswers, setCoPilotAnswers] = useState<CoPilotAnswers>({ expected_salary: '', notice_period: '', custom_note: '' });
  const [resuming, setResuming] = useState(false);

  const [scraping, setScraping] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const apiCall = useCallback(async (method: string, endpoint: string, body?: any) => {
    if (!token) return null;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [token]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiCall('GET', '/api/auto-apply/settings');
      if (data?.settings) {
        setSettings({
          is_enabled: data.settings.is_enabled ?? false,
          min_match_score: data.settings.min_match_score ?? 80,
          daily_limit: data.settings.daily_limit ?? 5,
          is_autopilot: data.settings.is_autopilot ?? false,
          linkedin_url: data.settings.linkedin_url ?? '',
          github_url: data.settings.github_url ?? '',
          portfolio_url: data.settings.portfolio_url ?? '',
          notice_period: data.settings.notice_period ?? 'Immediate',
          expected_salary: data.settings.expected_salary ?? ''
        });
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err.message);
    }
  }, [token, apiCall]);

  const loadApplications = useCallback(async () => {
    if (!token) return;
    setLoadingApps(true);
    try {
      const data = await apiCall('GET', '/api/auto-apply/applications');
      setApplications(data?.applications || []);
    } catch (err: any) {
      console.error('Failed to load applications:', err.message);
    } finally {
      setLoadingApps(false);
    }
  }, [token, apiCall]);

  const loadRecommendations = useCallback(async () => {
    if (!token) return;
    setLoadingRecs(true);
    try {
      const data = await apiCall('GET', '/api/jobs/recommendations');
      setRecommendations(data?.recommendations || []);
    } catch (err: any) {
      console.error('Failed to load recommendations:', err.message);
    } finally {
      setLoadingRecs(false);
    }
  }, [token, apiCall]);

  const loadMetrics = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiCall('GET', '/api/auto-apply/metrics');
      if (data?.metrics) setMetrics(data.metrics);
    } catch (err: any) {
      console.error('Failed to load metrics:', err.message);
    }
  }, [token, apiCall]);

  const checkResumeProfile = useCallback(async () => {
    if (!token) return;
    setLoadingResumeCheck(true);
    try {
      const data = await apiCall('GET', '/api/resume/profile');
      setHasResume(!!data?.profile);
    } catch (err: any) {
      console.error('Failed to check resume profile:', err.message);
      setHasResume(false);
    } finally {
      setLoadingResumeCheck(false);
    }
  }, [token, apiCall]);

  useEffect(() => {
    if (token && engineUnlocked) {
      loadSettings();
      loadApplications();
      loadRecommendations();
      loadMetrics();
      checkResumeProfile();
    }
  }, [token, engineUnlocked, loadSettings, loadApplications, loadRecommendations, loadMetrics, checkResumeProfile]);

  // Auto-poll while any application is in flight
  const hasActiveApps = applications.some(a => a.status === 'queued' || a.status === 'applying');
  useEffect(() => {
    if (!token || !engineUnlocked || !hasActiveApps) return;
    const id = setInterval(() => {
      loadApplications();
      loadMetrics();
    }, 6000);
    return () => clearInterval(id);
  }, [token, engineUnlocked, hasActiveApps, loadApplications, loadMetrics]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await apiCall('POST', '/api/auto-apply/settings', settings);
      showToast('Auto-apply settings updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerApply = async (jobId: string) => {
    setTriggeringJobId(jobId);
    showToast('Launching background auto-apply worker...');
    try {
      await apiCall('POST', '/api/auto-apply/apply-now', { jobId });
      showToast('Application queued. Tracking live updates in the queue.');
      setTimeout(() => { loadApplications(); loadMetrics(); }, 4000);
      setTimeout(() => { loadApplications(); loadMetrics(); }, 10000);
    } catch (err: any) {
      showToast(err.message || 'Auto-apply trigger failed', 'error');
    } finally {
      setTriggeringJobId(null);
    }
  };

  const handleMarkApplied = async (jobId: string) => {
    setMarkingAppliedId(jobId);
    try {
      await apiCall('POST', '/api/auto-apply/mark-applied', { jobId });
      showToast('Marked as applied. Nice work!');
      await Promise.all([loadApplications(), loadMetrics()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to mark as applied', 'error');
    } finally {
      setMarkingAppliedId(null);
    }
  };

  const handleTriggerScrape = async () => {
    setScraping(true);
    showToast('Aggregating jobs across all sources... this can take up to 2 minutes.');
    try {
      const data = await apiCall('POST', '/api/jobs/scrape');
      showToast(`Aggregated ${data?.jobs_scraped || 0} jobs. AI match scoring initiated.`);
      setTimeout(() => { loadRecommendations(); loadApplications(); loadMetrics(); }, 5000);
    } catch (err: any) {
      showToast(err.message || 'Job aggregation failed', 'error');
    } finally {
      setScraping(false);
    }
  };

  const openCoPilot = (app: ApplicationLog) => {
    setCoPilotApp(app);
    setCoPilotAnswers({
      expected_salary: settings.expected_salary || '',
      notice_period: settings.notice_period || 'Immediate',
      custom_note: ''
    });
  };

  const handleSubmitResume = async () => {
    if (!coPilotApp?.job_id) return;
    setResuming(true);
    try {
      await apiCall('POST', '/api/auto-apply/resume', {
        jobId: coPilotApp.job_id,
        answers: coPilotAnswers
      });
      showToast('Details submitted — auto-apply resumed.');
      setCoPilotApp(null);
      setTimeout(() => { loadApplications(); loadMetrics(); }, 3000);
    } catch (err: any) {
      showToast(err.message || 'Failed to resume application', 'error');
    } finally {
      setResuming(false);
    }
  };

  // ─── Gate: logged out, or feature not unlocked → Coming Soon splash ───
  if (!session || !engineUnlocked) {
    return (
      <div className="min-h-screen font-sans bg-white relative overflow-x-hidden pt-24 text-slate-900">
        <SEO
          title="AI Auto Apply & Co-pilot | Talvorax"
          description="Automatically apply to jobs that match your resume. Set up your AI auto-apply preferences with Talvorax."
          url="https://www.talvorax.com/auto-apply"
        />
        <Navbar />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 text-center">
          <div className="w-24 h-24 rounded-[32px] bg-white border border-slate-100 shadow-[0_20px_40px_rgba(16,185,129,0.12)] flex items-center justify-center mb-2">
            <Send className="w-12 h-12 text-[#10B981]" />
          </div>
          <span className="px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold tracking-widest uppercase">Coming Soon</span>
          <h1 className="text-4xl md:text-5xl font-[800] text-slate-900 tracking-tight">Auto Apply Engine</h1>
          <p className="text-slate-500 font-medium text-lg max-w-md">Our background AI agent will scrape, match, and submit applications on your behalf — pausing to ask you only when a form needs something we don't have.</p>
          <a href={session ? '/dashboard' : '/signup'} className="px-8 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5">
            {session ? 'Back to Dashboard' : 'Join the Waitlist — Sign Up Free'}
          </a>
        </div>
      </div>
    );
  }

  // ─── Derived data ───
  const appByJobId = new Map(applications.map(a => [a.job_id, a] as const));
  const actionRequired = applications.filter(a => a.status === 'needs_manual_action');
  const feed = recommendations.filter(r => r.job);
  const candidateName = user?.user_metadata?.full_name || (user?.email || '').split('@')[0] || 'Candidate';
  const candidateEmail = user?.email || '';

  const getTier = (source: string): 1 | 3 => {
    const src = (source || '').toLowerCase();
    return EXTERNAL_PORTAL_SOURCES.some(s => src.includes(s)) ? 3 : 1;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; class: string }> = {
      queued: { label: 'Queued', class: 'bg-blue-50 text-blue-700 border-blue-200' },
      applying: { label: 'In Progress', class: 'bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse' },
      applied: { label: 'Applied', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      failed: { label: 'Failed', class: 'bg-red-50 text-red-700 border-red-200' },
      needs_manual_action: { label: 'Action Required', class: 'bg-orange-50 text-orange-700 border-orange-200' }
    };
    const c = config[status] || { label: status, class: 'bg-slate-100 text-slate-700 border-slate-200' };
    return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${c.class}`}>{c.label}</span>;
  };

  const getSourceBadge = (source: string) => {
    const cleanSrc = (source || '').toLowerCase();
    const badges: Record<string, string> = {
      linkedin: 'bg-blue-50 text-blue-700 border-blue-200',
      indeed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      naukri: 'bg-orange-50 text-orange-700 border-orange-200',
      glassdoor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      jsearch: 'bg-purple-50 text-purple-700 border-purple-200',
      adzuna: 'bg-rose-50 text-rose-700 border-rose-200',
      remotive: 'bg-teal-50 text-teal-700 border-teal-200',
      weworkremotely: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      remoteok: 'bg-violet-50 text-violet-700 border-violet-200',
      arbeitnow: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    const badgeClass = badges[cleanSrc] || 'bg-slate-50 text-slate-700 border-slate-200';
    return (
      <span className={`inline-block text-[9px] font-[800] px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${badgeClass}`}>
        {source}
      </span>
    );
  };

  const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const pct = Math.max(0, Math.min(100, score));
    const stroke = pct >= 80 ? '#10B981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    return (
      <div className="relative w-12 h-12 flex-none">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#eef0ea" strokeWidth="12" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={stroke} strokeWidth="12" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={264 - (264 * pct) / 100} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[12px] font-[800] text-slate-900">{pct}</span>
      </div>
    );
  };

  const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; tint: string }> = ({ icon, label, value, tint }) => (
    <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-none ${tint}`}>{icon}</div>
      <div className="min-w-0">
        <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 truncate">{label}</p>
        <p className="m-0 text-[22px] font-[800] text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans bg-white relative overflow-x-hidden pt-24 text-slate-900 pb-20">
      <SEO
        title="AI Auto Apply & Co-pilot | Talvorax"
        description="Automatically apply to jobs that match your resume. Track your applications and settings."
        url="https://www.talvorax.com/auto-apply"
      />
      <Navbar />

      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, #D1FAE5 0%, #A7F3D0 30%, transparent 70%)',
        filter: 'blur(64px)', opacity: 0.6, pointerEvents: 'none', zIndex: 0
      }} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 mt-8">
        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-sm font-bold transition-all ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Preview banner — feature is gated, this is an internal preview */}
        {!AUTO_APPLY_LIVE && (
          <div className="flex items-start gap-3 bg-slate-900 text-white rounded-2xl px-5 py-4 mb-8">
            <Eye className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-[800] text-[14px]">Internal preview</h4>
              <p className="text-slate-300 text-[13px] font-medium">Auto Apply is not live for users yet. You're seeing it via preview mode. Actions here trigger the real background worker.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-[800] tracking-tight">Auto Apply Engine</h1>
            <p className="text-slate-500 font-medium mt-1">Scrape, match, and apply — with a co-pilot for anything a form needs from you.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTriggerScrape}
              disabled={scraping}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#10B981] text-[12px] font-bold rounded-xl transition-all border border-emerald-100 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? 'Aggregating...' : 'Scrape Jobs'}
            </button>
            <div className="flex bg-white border border-slate-200 shadow-sm rounded-xl p-1 w-fit">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#10B981] text-white shadow-md' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'}`}
              >
                <Layers className="w-4 h-4" /> Engine
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'settings' ? 'bg-[#10B981] text-white shadow-md' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'}`}
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            </div>
          </div>
        </div>

        {/* Resume Missing Alert */}
        {hasResume === false && !loadingResumeCheck && (
          <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-[800] text-amber-900 text-[14px]">Resume required for Auto-Apply</h4>
                <p className="text-xs text-amber-700 font-medium mt-0.5">Upload a resume so the engine can match roles and fill applications on your behalf.</p>
              </div>
            </div>
            <a href="/job-alerts" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-md text-center flex-shrink-0">
              Go to Resume Upload
            </a>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* ── Dashboard Performance Metrics ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard icon={<Layers className="w-5 h-5 text-purple-600" />} tint="bg-purple-50" label="Jobs Scraped" value={metrics?.total_jobs_scraped ?? '—'} />
              <MetricCard icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} tint="bg-emerald-50" label="Auto-Applies" value={metrics?.completed_applies ?? '—'} />
              <MetricCard icon={<Bell className="w-5 h-5 text-orange-600" />} tint="bg-orange-50" label="Pending Actions" value={metrics?.pending_actions ?? '—'} />
              <MetricCard icon={<TrendingUp className="w-5 h-5 text-blue-600" />} tint="bg-blue-50" label="Avg Match" value={metrics ? `${metrics.average_match_score}%` : '—'} />
            </div>

            {/* ── SECTION 2: Co-Pilot Action Center ── */}
            <section className="mb-10">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="relative">
                  <Bell className="w-5 h-5 text-orange-500" />
                  {actionRequired.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-[800] flex items-center justify-center">{actionRequired.length}</span>
                  )}
                </div>
                <h2 className="text-xl font-[800]">Co-Pilot Action Center</h2>
                <span className="text-[13px] text-slate-400 font-bold">{actionRequired.length} pending</span>
              </div>

              {actionRequired.length === 0 ? (
                <div className="rounded-[24px] border border-slate-100 bg-slate-50/60 p-8 text-center">
                  <ClipboardCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-[13px]">Nothing needs you right now. We'll surface any application that needs a manual answer here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {actionRequired.map(app => (
                    <div key={app.id} className="bg-white border border-orange-200 rounded-[24px] p-5 shadow-[0_4px_20px_rgba(249,115,22,0.06)] flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-[800] text-slate-900 leading-tight truncate">{app.job?.title || 'Job Application'}</h4>
                          <p className="text-[13px] text-slate-500 font-medium mt-0.5 truncate">{app.job?.company} • {app.job?.location}</p>
                          <div className="mt-2 flex items-center gap-1.5">{getSourceBadge(app.job?.source || '')}{getStatusBadge(app.status)}</div>
                        </div>
                      </div>
                      <p className="text-[12px] text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 font-medium">This form needs details we didn't have. Add them and we'll resume automatically.</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openCoPilot(app)} className="flex-1 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5">
                          <Zap className="w-4 h-4" /> Provide details & resume
                        </button>
                        <button onClick={() => setSelectedApp(app)} className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" title="View logs">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── SECTION 1: Auto-Apply Queue & Applications Log ── */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-5 h-5 text-slate-700" />
                  <h2 className="text-xl font-[800]">Auto-Apply Queue &amp; Log</h2>
                </div>
                <button onClick={loadApplications} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all" title="Refresh status">
                  <RefreshCw className={`w-4 h-4 ${loadingApps ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingApps && applications.length === 0 ? (
                <AILoader inline messages={["Fetching Applications...", "Syncing Status..."]} />
              ) : applications.length === 0 ? (
                <div className="rounded-[24px] border-2 border-dashed border-slate-200 bg-white p-14 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-[800] text-slate-900 mb-2">No applications yet</h3>
                  <p className="text-slate-500 font-medium text-[13px] max-w-sm mx-auto">Pick a matched job from the feed below and hit Auto-Apply Now, or enable Autopilot in Settings.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map(app => (
                    <div key={app.id} className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)] hover:border-emerald-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-[#10B981] transition-all flex-shrink-0">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-[800] text-slate-900 leading-tight truncate">{app.job?.title || 'Job Application'}</h4>
                          <p className="text-[13px] text-slate-500 font-medium mt-1 truncate">{app.job?.company} • {app.job?.location}</p>
                          <div className="mt-2">{getSourceBadge(app.job?.source || '')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center flex-none">
                        {getStatusBadge(app.status)}
                        {app.status === 'needs_manual_action' && (
                          <button onClick={() => openCoPilot(app)} className="px-3 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all flex items-center gap-1.5 text-[13px] font-bold shadow-sm">
                            <Zap className="w-4 h-4" /> Resolve
                          </button>
                        )}
                        {app.status === 'failed' && (
                          <button onClick={() => app.job_id && handleTriggerApply(app.job_id)} disabled={triggeringJobId === app.job_id} className="px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-1.5 text-[13px] font-bold shadow-sm disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${triggeringJobId === app.job_id ? 'animate-spin' : ''}`} /> Retry
                          </button>
                        )}
                        <button onClick={() => setSelectedApp(app)} className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 text-[13px] font-bold shadow-sm">
                          <Eye className="w-4 h-4" /> Logs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── SECTION 3: Recommended Jobs & Public Feed ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-[800]">Recommended Jobs</h2>
                  <span className="text-[13px] text-slate-400 font-bold">{feed.length} matches</span>
                </div>
                <button onClick={loadRecommendations} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all" title="Refresh feed">
                  <RefreshCw className={`w-4 h-4 ${loadingRecs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingRecs && feed.length === 0 ? (
                <AILoader inline messages={["Analyzing Job Market...", "Scoring Matches..."]} />
              ) : feed.length === 0 ? (
                <div className="rounded-[24px] border-2 border-dashed border-slate-200 bg-white p-14 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-[800] text-slate-900 mb-2">No recommendations yet</h3>
                  <p className="text-slate-500 font-medium text-[13px] max-w-sm mx-auto">Hit “Scrape Jobs” above to aggregate fresh listings and score them against your resume.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feed.map(rec => {
                    const job = rec.job!;
                    const tier = getTier(job.source);
                    const existing = appByJobId.get(job.id);
                    const isTriggering = triggeringJobId === job.id;
                    return (
                      <div key={rec.id} className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                          <ScoreRing score={rec.match_score} />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-[800] text-slate-900 leading-tight truncate">{job.title}</h4>
                            <p className="text-[13px] text-slate-500 font-medium mt-0.5 truncate">{job.company}</p>
                            <div className="mt-2 flex items-center flex-wrap gap-1.5">
                              {getSourceBadge(job.source)}
                              {tier === 3 && <span className="text-[9px] font-[800] px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200 uppercase tracking-wider">External Portal</span>}
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium"><MapPin className="w-3 h-3" />{job.location || '—'}</span>
                              {job.remote && <span className="text-[9px] font-[800] px-2 py-0.5 rounded-md border bg-teal-50 text-teal-700 border-teal-200 uppercase tracking-wider">Remote</span>}
                            </div>
                          </div>
                        </div>

                        {(rec.matched_skills?.length || rec.missing_skills?.length) ? (
                          <div className="flex flex-wrap gap-1.5">
                            {(rec.matched_skills || []).slice(0, 4).map(s => (
                              <span key={`m-${s}`} className="text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">✓ {s}</span>
                            ))}
                            {(rec.missing_skills || []).slice(0, 3).map(s => (
                              <span key={`x-${s}`} className="text-[10.5px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold border border-rose-100">− {s}</span>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2 mt-auto">
                          {existing && (existing.status === 'applied') ? (
                            <span className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 text-[13px] font-bold rounded-xl flex items-center justify-center gap-1.5 border border-emerald-100">
                              <CheckCircle className="w-4 h-4" /> Applied
                            </span>
                          ) : tier === 3 ? (
                            <>
                              <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5">
                                <ExternalLink className="w-4 h-4" /> Apply on Company Site
                              </a>
                              <button onClick={() => handleMarkApplied(job.id)} disabled={markingAppliedId === job.id} className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50" title="Mark as applied">
                                {markingAppliedId === job.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleTriggerApply(job.id)} disabled={isTriggering} className="flex-1 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50">
                                {isTriggering ? <><RefreshCw className="w-4 h-4 animate-spin" /> Applying...</> : <><Play className="w-3.5 h-3.5 fill-current" /> Auto-Apply Now</>}
                              </button>
                              <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-[13px] font-bold flex items-center gap-1.5" title="Apply on company site">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── SETTINGS TAB (Smart Profile Field Mapper) ── */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <h3 className="font-[800] text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Sliders className="w-5 h-5 text-[#10B981]" /> General Preferences
                </h3>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div>
                    <h4 className="font-bold text-[14px]">Enable Auto Apply</h4>
                    <p className="text-xs text-slate-500 font-medium">Let the worker crawl and submit applications.</p>
                  </div>
                  <button type="button" onClick={() => setSettings(s => ({ ...s, is_enabled: !s.is_enabled }))} className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.is_enabled ? 'bg-[#10B981] justify-end' : 'bg-slate-300 justify-start'}`}>
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div>
                    <h4 className="font-bold text-[14px]">Autopilot Mode</h4>
                    <p className="text-xs text-slate-500 font-medium">Automatically apply without requiring one-click approvals.</p>
                  </div>
                  <button type="button" onClick={() => setSettings(s => ({ ...s, is_autopilot: !s.is_autopilot }))} className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.is_autopilot ? 'bg-[#10B981] justify-end' : 'bg-slate-300 justify-start'}`}>
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-[13px] text-slate-700">
                    <span>Minimum Match Score</span>
                    <span className="text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-lg">{settings.min_match_score}%</span>
                  </div>
                  <input type="range" min="40" max="95" step="5" value={settings.min_match_score} onChange={e => setSettings(s => ({ ...s, min_match_score: parseInt(e.target.value) }))} className="w-full accent-[#10B981] h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                  <p className="text-[11px] text-slate-400 font-bold">Only matches at or above this percentage will qualify.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Daily Application Limit</label>
                  <select value={settings.daily_limit} onChange={e => setSettings(s => ({ ...s, daily_limit: parseInt(e.target.value) }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all">
                    {[1, 3, 5, 10, 20].map(val => (<option key={val} value={val}>{val} applications / day</option>))}
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <h3 className="font-[800] text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="w-5 h-5 text-[#10B981]" /> Profile &amp; Social URLs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">LinkedIn URL</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input type="url" value={settings.linkedin_url} onChange={e => setSettings(s => ({ ...s, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/username" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">GitHub URL</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input type="url" value={settings.github_url} onChange={e => setSettings(s => ({ ...s, github_url: e.target.value }))} placeholder="https://github.com/username" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Portfolio URL</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input type="url" value={settings.portfolio_url} onChange={e => setSettings(s => ({ ...s, portfolio_url: e.target.value }))} placeholder="https://my-portfolio.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <h3 className="font-[800] text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-5 h-5 text-[#10B981]" /> Common Form Answers
                </h3>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Notice Period</label>
                  <select value={settings.notice_period} onChange={e => setSettings(s => ({ ...s, notice_period: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all">
                    <option value="Immediate">Immediate / Serving Notice</option>
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">2 Months</option>
                    <option value="90 Days">3 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Expected Salary (CTC)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input type="text" value={settings.expected_salary} onChange={e => setSettings(s => ({ ...s, expected_salary: e.target.value }))} placeholder="e.g. ₹15 LPA, $120,000" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all" />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={savingSettings} className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Auto-Apply Config
              </button>
            </div>
          </form>
        )}
      </main>

      {/* ── CO-PILOT DRAWER (manual input + resume) ── */}
      {coPilotApp && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => !resuming && setCoPilotApp(null)} />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-[800] uppercase tracking-widest text-orange-500">Co-Pilot · Action Required</span>
                <h3 className="text-lg font-[800] text-slate-900 mt-1 leading-tight">{coPilotApp.job?.title}</h3>
                <p className="text-[13px] text-slate-500 font-medium">{coPilotApp.job?.company} • {coPilotApp.job?.location}</p>
              </div>
              <button onClick={() => !resuming && setCoPilotApp(null)} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Pre-filled known data */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Known details (auto-filled)</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Full name', value: candidateName },
                    { label: 'Email', value: candidateEmail },
                    { label: 'LinkedIn', value: settings.linkedin_url },
                    { label: 'Portfolio', value: settings.portfolio_url },
                  ].filter(r => r.value).map(r => (
                    <div key={r.label} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{r.label}</span>
                      <span className="text-[13px] font-semibold text-slate-700 truncate max-w-[55%]">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fields this form needs</h4>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Expected Salary (CTC)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input type="text" value={coPilotAnswers.expected_salary} onChange={e => setCoPilotAnswers(a => ({ ...a, expected_salary: e.target.value }))} placeholder="e.g. ₹15 LPA, $120,000" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Notice Period</label>
                  <select value={coPilotAnswers.notice_period} onChange={e => setCoPilotAnswers(a => ({ ...a, notice_period: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all">
                    <option value="Immediate">Immediate / Serving Notice</option>
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">2 Months</option>
                    <option value="90 Days">3 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Additional context / screening answers</label>
                  <textarea value={coPilotAnswers.custom_note} onChange={e => setCoPilotAnswers(a => ({ ...a, custom_note: e.target.value }))} rows={4} placeholder="Anything the form asked that we couldn't answer — visa status, willingness to relocate, a short note the AI should use for open-ended questions, etc." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all resize-none" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <button onClick={() => setSelectedApp(coPilotApp)} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-[13px] font-bold transition-all flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Logs
              </button>
              <button onClick={handleSubmitResume} disabled={resuming} className="flex-1 py-3 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                {resuming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Submit &amp; Resume Auto-Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LIVE EXECUTION LOG VIEWER ── */}
      {selectedApp && (
        <div className="fixed inset-0 z-[1001] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-[800] text-slate-900">{selectedApp.job?.title}</h3>
                <p className="text-[13px] text-slate-500 font-medium mt-1">{selectedApp.job?.company} • {selectedApp.job?.location}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const lines = (selectedApp.error_log || '').split('\n');
                const successMsgLine = lines.find(l => l.startsWith('[SUCCESS_CONFIRMATION_MSG]'));
                const successIdLine = lines.find(l => l.startsWith('[SUCCESS_CONFIRMATION_ID]'));
                const successMsg = successMsgLine ? successMsgLine.replace('[SUCCESS_CONFIRMATION_MSG] ', '') : null;
                const successId = successIdLine ? successIdLine.replace('[SUCCESS_CONFIRMATION_ID] ', '') : null;
                if (!successMsg && !successId) return null;
                return (
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0"><CheckCircle className="w-6 h-6" /></div>
                    <div className="space-y-1">
                      <h4 className="font-[800] text-slate-900 text-[15px]">Official Submission Verified</h4>
                      {successMsg && <p className="text-[13px] text-slate-500 font-medium leading-relaxed">"{successMsg}"</p>}
                      {successId && successId !== 'N/A' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confirmation Code</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[11px] font-mono font-bold select-all">{successId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {selectedApp.screenshot_signed_url && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Screen Submission Capture</h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-950 flex items-center justify-center max-h-[260px]">
                    <img src={selectedApp.screenshot_signed_url} alt="Submission screen capture" className="w-full object-contain max-h-[260px]" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> Application Execution Logs</h4>
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[12px] text-emerald-400 overflow-x-auto shadow-inner select-text whitespace-pre max-h-[250px]">
                  {(selectedApp.error_log || '')
                    .split('\n')
                    .filter(l => !l.startsWith('[SUCCESS_CONFIRMATION_MSG]') && !l.startsWith('[SUCCESS_CONFIRMATION_ID]'))
                    .join('\n') || '[System] No logs recorded.'}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
              <span className="text-[11px] text-slate-400 font-bold">LOGS GENERATED ON {new Date(selectedApp.created_at).toLocaleDateString()}</span>
              <div className="flex items-center gap-3">
                {selectedApp.status === 'needs_manual_action' && (
                  <button onClick={() => { const a = selectedApp; setSelectedApp(null); openCoPilot(a); }} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Provide details
                  </button>
                )}
                {selectedApp.status === 'failed' && (
                  <button onClick={() => { if (selectedApp.job_id) { handleTriggerApply(selectedApp.job_id); setSelectedApp(null); } }} disabled={triggeringJobId === selectedApp.job_id} className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${triggeringJobId === selectedApp.job_id ? 'animate-spin' : ''}`} /> Retry Application
                  </button>
                )}
                {selectedApp.job?.url && (
                  <a href={selectedApp.job.url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5">
                    Visit Application Link <ChevronRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
