import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
  Send, CheckCircle, Settings, Sliders, Briefcase, Clock,
  DollarSign, Globe, FileText, Check, X, AlertCircle, Eye,
  RefreshCw, Play, Sparkles, ShieldAlert, ChevronRight
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { AILoader } from '../components/AILoader';

const API_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost') ? import.meta.env.VITE_API_URL : '')
  : (import.meta.env.VITE_API_URL || '');

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

interface ApplicationLog {
  id: string;
  job_id: string;
  status: 'queued' | 'applying' | 'applied' | 'failed' | 'needs_manual_action';
  error_log: string;
  screenshot_url?: string;
  screenshot_signed_url?: string;
  applied_at?: string;
  created_at: string;
  job?: {
    id: string;
    title: string;
    company: string;
    location: string;
    source: string;
    url: string;
  };
}

interface Recommendation {
  id: string;
  match_score: number;
  shortlist_verdict: 'strong' | 'likely' | 'possible' | 'unlikely';
  job?: {
    id: string;
    title: string;
    company: string;
    location: string;
    source: string;
    url: string;
  };
}

export const AutoApplyLanding: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token || null;

  // Tabs
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

  // Applications and recommendations state
  const [applications, setApplications] = useState<ApplicationLog[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [triggeringJobId, setTriggeringJobId] = useState<string | null>(null);

  // Resume check state
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [loadingResumeCheck, setLoadingResumeCheck] = useState(false);

  // Log Viewer Modal
  const [selectedApp, setSelectedApp] = useState<ApplicationLog | null>(null);

  const [scraping, setScraping] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: call API
  const apiCall = async (method: string, endpoint: string, body?: any) => {
    if (!token) return null;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  // Load Settings
  const loadSettings = async () => {
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
  };

  // Load Applications
  const loadApplications = async () => {
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
  };

  // Load recommendations for pending tab
  const loadRecommendations = async () => {
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
  };

  // Check if resume is uploaded
  const checkResumeProfile = async () => {
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
  };

  useEffect(() => {
    if (token) {
      loadSettings();
      loadApplications();
      loadRecommendations();
      checkResumeProfile();
    }
  }, [token]);

  // Save Settings
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

  // Trigger Co-pilot Apply
  const handleTriggerApply = async (jobId: string) => {
    setTriggeringJobId(jobId);
    showToast('Launching background Puppeteer worker...');
    try {
      await apiCall('POST', '/api/auto-apply/apply-now', { jobId });
      showToast('Application successfully queued. Tracking updates!');
      // Poll applications after a few seconds
      setTimeout(() => loadApplications(), 4000);
      setTimeout(() => loadApplications(), 10000);
    } catch (err: any) {
      showToast(err.message || 'Auto-apply trigger failed', 'error');
    } finally {
      setTriggeringJobId(null);
    }
  };

  // Trigger Scraper
  const handleTriggerScrape = async () => {
    setScraping(true);
    showToast('Launching Puppeteer scrapers in background... This can take up to 2 minutes.', 'success');
    try {
      const data = await apiCall('POST', '/api/jobs/scrape');
      showToast(`Successfully scraped ${data?.jobs_scraped || 0} jobs! AI match scoring initiated.`);
      setTimeout(() => {
        loadRecommendations();
        loadApplications();
      }, 5000);
    } catch (err: any) {
      showToast(err.message || 'Job scraping failed', 'error');
    } finally {
      setScraping(false);
    }
  };

  if (!session) {
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
          <h1 className="text-4xl md:text-5xl font-[800] text-slate-900 tracking-tight">Auto Apply Engine</h1>
          <p className="text-slate-500 font-medium text-lg max-w-md">Sign in to let our background AI agent match and submit applications on your behalf.</p>
          <a href="/login" className="px-8 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5">
            Get Started with Auto Apply
          </a>
        </div>
      </div>
    );
  }

  // Pending manual items & highly match score
  const pendingJobs = recommendations
    .filter(rec => rec.job && !applications.some(app => app.job_id === rec.job?.id))
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; class: string }> = {
      queued: { label: 'Queued', class: 'bg-blue-50 text-blue-700 border-blue-200' },
      applying: { label: 'Applying...', class: 'bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse' },
      applied: { label: 'Applied', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      failed: { label: 'Failed', class: 'bg-red-50 text-red-700 border-red-200' },
      needs_manual_action: { label: 'Action Needed', class: 'bg-orange-50 text-orange-700 border-orange-200' }
    };
    const c = config[status] || { label: status, class: 'bg-slate-100 text-slate-700 border-slate-200' };
    return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${c.class}`}>{c.label}</span>;
  };

  const getSourceBadge = (source: string) => {
    const cleanSrc = (source || '').toLowerCase();
    const badges: Record<string, string> = {
      linkedin: 'bg-blue-50 text-blue-700 border-blue-200',
      indeed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      naukri: 'bg-orange-55 text-orange-700 border-orange-200',
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

  return (
    <div className="min-h-screen font-sans bg-white relative overflow-x-hidden pt-24 text-slate-900 pb-20">
      <SEO 
        title="AI Auto Apply & Co-pilot | Talvorax"
        description="Automatically apply to jobs that match your resume. Track your applications and settings."
        url="https://www.talvorax.com/auto-apply"
      />
      <Navbar />

      {/* Background radial blobs */}
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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-[800] tracking-tight">Auto Apply Dashboard</h1>
            <p className="text-slate-500 font-medium mt-1">Configure your preferences and track background AI applications.</p>
          </div>
          <div className="flex bg-white border border-slate-200 shadow-sm rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#10B981] text-white shadow-md' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'}`}
            >
              <Briefcase className="w-4 h-4" /> Applications
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'settings' ? 'bg-[#10B981] text-white shadow-md' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'}`}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>

        {/* Resume Missing Alert */}
        {hasResume === false && !loadingResumeCheck && (
          <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <AlertCircle className="w-5.5 h-5.5" />
              </div>
              <div className="text-left">
                <h4 className="font-[800] text-amber-900 text-[14px]">Resume Required for Auto-Apply</h4>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  You haven't uploaded a resume yet. To match and automatically submit applications, please upload a resume first.
                </p>
              </div>
            </div>
            <a
              href="/job-alerts"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-md shadow-amber-600/10 hover:shadow-amber-600/20 text-center flex-shrink-0"
            >
              Go to Resume Upload
            </a>
          </div>
        )}

        {/* ── TAB 1: DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Application Logs */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-[800]">Activity Log</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerScrape}
                    disabled={scraping}
                    className="px-4.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#10B981] text-[12px] font-bold rounded-xl transition-all border border-emerald-100 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${scraping ? 'animate-spin' : ''}`} />
                    {scraping ? 'Scraping...' : 'Scrape Jobs'}
                  </button>
                  <button
                    type="button"
                    onClick={loadApplications}
                    className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                    title="Refresh status"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingApps ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingApps ? (
                <AILoader inline messages={["Fetching Applications...", "Syncing Status..."]} />
              ) : applications.length === 0 ? (
                <div className="rounded-[24px] border-2 border-dashed border-slate-200 bg-white p-14 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-[800] text-slate-900 mb-2">No applications triggered</h3>
                  <p className="text-slate-500 font-medium text-[13px] max-w-sm mx-auto">Toggle Autopilot in settings, or use the Co-pilot list on the right to apply with one click.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map(app => (
                    <div
                      key={app.id}
                      className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)] hover:border-emerald-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-[#10B981] transition-all flex-shrink-0">
                           <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-[800] text-slate-900 leading-tight">{app.job?.title || 'Job Application'}</h4>
                          <p className="text-[13px] text-slate-500 font-medium mt-1">
                            {app.job?.company} • {app.job?.location}
                          </p>
                          <div className="mt-2">{getSourceBadge(app.job?.source || '')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {getStatusBadge(app.status)}
                        
                        {(app.status === 'failed' || app.status === 'needs_manual_action') && (
                          <button
                            onClick={() => app.job_id && handleTriggerApply(app.job_id)}
                            disabled={triggeringJobId === app.job_id}
                            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-1.5 text-[13px] font-bold shadow-sm disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${triggeringJobId === app.job_id ? 'animate-spin' : ''}`} />
                            Retry
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedApp(app)}
                          className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 text-[13px] font-bold shadow-sm"
                        >
                          <Eye className="w-4 h-4" /> View Logs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: Co-pilot Queue */}
            <div className="space-y-6">
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-[800] text-emerald-800">Co-pilot Queue</h3>
                </div>
                <p className="text-[13px] text-emerald-800/80 font-medium mb-5 leading-relaxed">
                  These recommended jobs matched your threshold. Click to launch the Puppeteer agent and apply instantly.
                </p>

                {loadingRecs ? (
                  <AILoader inline messages={["Analyzing Job Market...", "Finding Best Matches..."]} />
                ) : pendingJobs.length === 0 ? (
                  <div className="bg-white/40 border border-emerald-100 rounded-2xl p-6 text-center text-emerald-800 text-[13px] font-bold">
                    No pending recommendations.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingJobs.map(rec => (
                      <div key={rec.id} className="bg-white border border-emerald-100/50 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm text-slate-900 leading-tight truncate flex-1">{rec.job?.title}</h4>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">{rec.match_score}% Match</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{rec.job?.company} • {rec.job?.location}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            {getSourceBadge(rec.job?.source || '')}
                          </div>
                        </div>
                        <button
                          onClick={() => rec.job && handleTriggerApply(rec.job.id)}
                          disabled={triggeringJobId === rec.job?.id}
                          className="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white text-[12px] font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {triggeringJobId === rec.job?.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Auto-Apply Now
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: SETTINGS ── */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* General Preferences */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <h3 className="font-[800] text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Sliders className="w-5 h-5 text-[#10B981]" /> General Preferences
                </h3>

                {/* Enable toggle */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div>
                    <h4 className="font-bold text-[14px]">Enable Auto Apply</h4>
                    <p className="text-xs text-slate-500 font-medium">Let the worker crawl and submit applications.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, is_enabled: !s.is_enabled }))}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.is_enabled ? 'bg-[#10B981] justify-end' : 'bg-slate-300 justify-start'}`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {/* Autopilot toggle */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div>
                    <h4 className="font-bold text-[14px]">Autopilot Mode</h4>
                    <p className="text-xs text-slate-500 font-medium">Automatically apply without requiring one-click approvals.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, is_autopilot: !s.is_autopilot }))}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.is_autopilot ? 'bg-[#10B981] justify-end' : 'bg-slate-300 justify-start'}`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {/* Threshold slider */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-[13px] text-slate-700">
                    <span>Minimum Match Score</span>
                    <span className="text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-lg">{settings.min_match_score}%</span>
                  </div>
                  <input
                    type="range" min="40" max="95" step="5"
                    value={settings.min_match_score}
                    onChange={e => setSettings(s => ({ ...s, min_match_score: parseInt(e.target.value) }))}
                    className="w-full accent-[#10B981] h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 font-bold">Only matches at or above this percentage will qualify.</p>
                </div>

                {/* Daily limit */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Daily Application Limit</label>
                  <select
                    value={settings.daily_limit}
                    onChange={e => setSettings(s => ({ ...s, daily_limit: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
                  >
                    {[1, 3, 5, 10, 20].map(val => (
                      <option key={val} value={val}>{val} applications / day</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profile Details for Forms */}
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <h3 className="font-[800] text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="w-5 h-5 text-[#10B981]" /> Profile & Social URLs
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">LinkedIn URL</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type="url" value={settings.linkedin_url}
                        onChange={e => setSettings(s => ({ ...s, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">GitHub URL</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type="url" value={settings.github_url}
                        onChange={e => setSettings(s => ({ ...s, github_url: e.target.value }))}
                        placeholder="https://github.com/username"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Portfolio URL</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type="url" value={settings.portfolio_url}
                        onChange={e => setSettings(s => ({ ...s, portfolio_url: e.target.value }))}
                        placeholder="https://my-portfolio.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Questionnaire Details */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <h3 className="font-[800] text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-5 h-5 text-[#10B981]" /> Common Form Answers
                </h3>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Notice Period</label>
                  <select
                    value={settings.notice_period}
                    onChange={e => setSettings(s => ({ ...s, notice_period: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
                  >
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
                    <input
                      type="text" value={settings.expected_salary}
                      onChange={e => setSettings(s => ({ ...s, expected_salary: e.target.value }))}
                      placeholder="e.g. ₹15 LPA, $120,000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit" disabled={savingSettings}
                className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Auto-Apply Config
              </button>
            </div>
          </form>
        )}
      </main>

      {/* ── MODAL: LOG VIEWER ── */}
      {selectedApp && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-[800] text-slate-900">{selectedApp.job?.title}</h3>
                <p className="text-[13px] text-slate-500 font-medium mt-1">{selectedApp.job?.company} • {selectedApp.job?.location}</p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Parsed AI Success Details */}
              {(() => {
                const lines = (selectedApp.error_log || '').split('\n');
                const successMsgLine = lines.find(l => l.startsWith('[SUCCESS_CONFIRMATION_MSG]'));
                const successIdLine = lines.find(l => l.startsWith('[SUCCESS_CONFIRMATION_ID]'));
                const successMsg = successMsgLine ? successMsgLine.replace('[SUCCESS_CONFIRMATION_MSG] ', '') : null;
                const successId = successIdLine ? successIdLine.replace('[SUCCESS_CONFIRMATION_ID] ', '') : null;

                if (!successMsg && !successId) return null;
                return (
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-md flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-[800] text-slate-900 text-[15px]">Official Submission Verified</h4>
                      {successMsg && (
                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">"{successMsg}"</p>
                      )}
                      {successId && successId !== 'N/A' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confirmation Code</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[11px] font-mono font-bold select-all">
                            {successId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Screenshot Proof */}
              {selectedApp.screenshot_signed_url && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Screen Submission Capture
                  </h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-950 flex items-center justify-center max-h-[260px]">
                    <img
                      src={selectedApp.screenshot_signed_url}
                      alt="Submission screen capture"
                      className="w-full object-contain max-h-[260px]"
                    />
                  </div>
                </div>
              )}

              {/* Steps Console */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> Application Execution Logs
                </h4>
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[12px] text-emerald-400 overflow-x-auto shadow-inner select-text whitespace-pre max-h-[250px]">
                  {(selectedApp.error_log || '')
                    .split('\n')
                    .filter(l => !l.startsWith('[SUCCESS_CONFIRMATION_MSG]') && !l.startsWith('[SUCCESS_CONFIRMATION_ID]'))
                    .join('\n') || '[System] No logs recorded.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
              <span className="text-[11px] text-slate-400 font-bold">
                LOGS GENERATED ON {new Date(selectedApp.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-3">
                {(selectedApp.status === 'failed' || selectedApp.status === 'needs_manual_action') && (
                  <button
                    onClick={() => {
                      if (selectedApp.job_id) {
                        handleTriggerApply(selectedApp.job_id);
                        setSelectedApp(null);
                      }
                    }}
                    disabled={triggeringJobId === selectedApp.job_id}
                    className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${triggeringJobId === selectedApp.job_id ? 'animate-spin' : ''}`} />
                    Retry Application
                  </button>
                )}
                {selectedApp.job?.url && (
                  <a
                    href={selectedApp.job.url} target="_blank" rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-[13px] font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
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
