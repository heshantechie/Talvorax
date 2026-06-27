import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
  Bell, FileText, Upload, X, ChevronDown, ChevronUp,
  Bookmark, BookmarkCheck, ExternalLink, Trash2, Plus,
  ToggleLeft, ToggleRight, Edit3, Check, RefreshCw,
  AlertCircle, Sparkles, Target, TrendingUp, Zap
} from 'lucide-react';
import type { JobAlert, JobRecommendation } from '../types/resume';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const apiCall = async (
  method: string,
  endpoint: string,
  token: string | null,
  body?: any,
  isFormData = false
): Promise<any> => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ─── Score Ring Component ──────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 64 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-[800] text-slate-900" style={{ fontSize: size * 0.25 }}>{score}</span>
      </div>
    </div>
  );
};

// ─── Verdict Badge ─────────────────────────────────────────────────────────────

const VerdictBadge: React.FC<{ verdict: string }> = ({ verdict }) => {
  const config: Record<string, { label: string; class: string }> = {
    strong: { label: '🔥 STRONG', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    likely: { label: '✓ LIKELY', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    possible: { label: '◎ POSSIBLE', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    unlikely: { label: '✗ UNLIKELY', class: 'bg-red-100 text-red-700 border-red-200' },
  };
  const c = config[verdict] || config.possible;
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.class}`}>{c.label}</span>
  );
};

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="rounded-[24px] p-6 border border-gray-100 bg-white shadow-[0_10px_40px_rgba(16,185,129,0.08)] animate-pulse">
    <div className="flex gap-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="flex gap-2">
          {[1,2,3].map(i => <div key={i} className="h-5 bg-slate-100 rounded-full w-16" />)}
        </div>
      </div>
    </div>
  </div>
);

// ─── Toast ─────────────────────────────────────────────────────────────────────

const Toast: React.FC<{ msg: string; type: 'success' | 'error'; onClose: () => void }> = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-sm font-bold transition-all ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
};

// ─── Job Match Card ────────────────────────────────────────────────────────────

const JobMatchCard: React.FC<{
  rec: JobRecommendation;
  onDismiss: (id: string) => void;
  onSave: (id: string, saved: boolean) => void;
  token: string | null;
}> = ({ rec, onDismiss, onSave, token }) => {
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const job = rec.job;
  const details = rec.match_details;
  const tweaks = Array.isArray(rec.suggested_tweaks) ? rec.suggested_tweaks :
    (details?.suggested_resume_tweaks || []);

  const handleDismiss = async () => {
    setActing(true);
    try {
      await apiCall('PATCH', `/api/jobs/recommendations/${rec.id}`, token, { is_dismissed: true });
      onDismiss(rec.id);
    } catch { setActing(false); }
  };

  const handleSave = async () => {
    setActing(true);
    try {
      const newSaved = !rec.is_saved;
      await apiCall('PATCH', `/api/jobs/recommendations/${rec.id}`, token, { is_saved: newSaved });
      onSave(rec.id, newSaved);
    } catch { } finally { setActing(false); }
  };

  return (
    <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(16,185,129,0.06)] hover:border-emerald-200 hover:shadow-[0_10px_40px_rgba(16,185,129,0.12)] transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <ScoreRing score={rec.match_score} size={68} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-[800] text-slate-900 text-lg leading-tight truncate">{job?.title || 'Job'}</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">{job?.company} • {job?.location}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <VerdictBadge verdict={rec.shortlist_verdict} />
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200">{job?.source}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matched Skills */}
      {details?.matched_skills?.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">✓ Matched Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {details.matched_skills.slice(0, 8).map(s => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {details?.missing_skills?.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">✗ Missing Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {details.missing_skills.slice(0, 6).map(s => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-100">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* AI Reasoning */}
      {details?.shortlist_reasoning && (
        <p className="text-sm text-slate-600 font-medium mb-5 leading-relaxed border-l-[3px] border-[#10B981] bg-emerald-50/50 p-3 rounded-r-lg">
          {details.shortlist_reasoning}
        </p>
      )}

      {/* Resume Tweak Accordion */}
      {tweaks?.length > 0 && (
        <div className="mb-5 bg-yellow-50/50 rounded-xl border border-yellow-100 overflow-hidden transition-all">
          <button
            onClick={() => setTweaksOpen(!tweaksOpen)}
            className="flex items-center justify-between w-full p-3 text-[13px] font-bold text-yellow-700 hover:bg-yellow-100/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Resume Tweak Tips ({tweaks.length})
            </span>
            {tweaksOpen ? <ChevronUp className="w-4 h-4 text-yellow-600" /> : <ChevronDown className="w-4 h-4 text-yellow-600" />}
          </button>
          {tweaksOpen && (
            <div className="px-4 pb-3 border-t border-yellow-100/50 pt-2">
              <ul className="space-y-2">
                {tweaks.map((t, i) => (
                  <li key={i} className="text-[13px] text-yellow-800 flex items-start gap-2">
                    <span className="text-yellow-500 font-bold mt-0.5">→</span>
                    <span className="font-medium leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-2">
        {job?.url && (
          <a
            href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold transition-all shadow-md shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            <ExternalLink className="w-4 h-4" />Apply Now
          </a>
        )}
        <button
          onClick={handleSave} disabled={acting}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-all hover:-translate-y-0.5 ${rec.is_saved ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
        >
          {rec.is_saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {rec.is_saved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={handleDismiss} disabled={acting}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold border bg-white text-slate-500 border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all hover:-translate-y-0.5"
        >
          <X className="w-4 h-4" />Dismiss
        </button>
      </div>
    </div>
  );
};

// ─── Alert Editor Form ─────────────────────────────────────────────────────────

const AlertEditorForm: React.FC<{
  initial?: Partial<JobAlert>;
  onSave: (data: Partial<JobAlert>) => Promise<void>;
  onCancel: () => void;
}> = ({ initial = {}, onSave, onCancel }) => {
  const [form, setForm] = useState({
    role_title: initial.role_title || '',
    location: initial.location || '',
    remote_only: initial.remote_only || false,
    skills: (initial.skills || []).join(', '),
    frequency: initial.frequency || 'daily',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6 rounded-[24px] bg-white border border-gray-100 shadow-[0_10px_40px_rgba(16,185,129,0.06)]">
      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Role Title *</label>
          <input
            required value={form.role_title}
            onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))}
            placeholder="e.g. Frontend Developer"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition-all focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Location</label>
          <input
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Bangalore"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition-all focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Frequency</label>
          <select
            value={form.frequency}
            onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition-all focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="instant">Instant</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Skills (comma-separated)</label>
          <input
            value={form.skills}
            onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
            placeholder="e.g. React, TypeScript, Node.js"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-[13px] font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition-all focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
        <div className="col-span-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, remote_only: !f.remote_only }))}
            className="flex-shrink-0 focus:outline-none rounded-full"
          >
            {form.remote_only
              ? <ToggleRight className="w-9 h-9 text-[#10B981]" />
              : <ToggleLeft className="w-9 h-9 text-slate-300 hover:text-slate-400 transition-colors" />}
          </button>
          <span className="text-[13px] text-slate-700 font-bold">Only show Remote jobs</span>
        </div>
      </div>
      <div className="flex gap-3 pt-3">
        <button
          type="submit" disabled={saving}
          className="flex-1 py-3 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : initial.id ? 'Update Alert' : 'Create Alert'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-xl transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
};

// ─── Alert List Item ───────────────────────────────────────────────────────────

const AlertItem: React.FC<{
  alert: JobAlert;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (alert: JobAlert) => void;
  onDelete: (id: string) => void;
}> = ({ alert, onToggle, onEdit, onDelete }) => (
  <div className={`flex items-start gap-4 p-5 rounded-[20px] border transition-all duration-300 ${alert.is_active ? 'border-emerald-100 bg-emerald-50/30 shadow-sm' : 'border-gray-100 bg-slate-50 opacity-70 grayscale-[0.2]'}`}>
    <button onClick={() => onToggle(alert.id, !alert.is_active)} className="mt-1 focus:outline-none rounded-full">
      {alert.is_active
        ? <ToggleRight className="w-8 h-8 text-[#10B981] hover:text-[#059669] transition-colors shadow-sm rounded-full" />
        : <ToggleLeft className="w-8 h-8 text-slate-400 hover:text-slate-500 transition-colors" />}
    </button>
    <div className="flex-1 min-w-0 pt-0.5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <p className={`font-[800] text-base truncate ${alert.is_active ? 'text-slate-900' : 'text-slate-600'}`}>{alert.role_title}</p>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${alert.frequency === 'instant' ? 'bg-purple-50 text-purple-600 border-purple-200' : alert.frequency === 'daily' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {alert.frequency}
        </span>
        {alert.remote_only && <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-200">Remote</span>}
      </div>
      {alert.location && <p className="text-[13px] font-medium text-slate-500 mb-2">📍 {alert.location}</p>}
      {alert.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alert.skills.slice(0, 5).map(s => (
            <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-bold shadow-sm">{s}</span>
          ))}
          {alert.skills.length > 5 && <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 rounded-full flex items-center">+{alert.skills.length - 5}</span>}
        </div>
      )}
    </div>
    <div className="flex items-center gap-1.5 pt-1">
      <button onClick={() => onEdit(alert)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm transition-all focus:outline-none">
        <Edit3 className="w-4 h-4" />
      </button>
      <button onClick={() => onDelete(alert.id)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all focus:outline-none">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// ─── Main JobAlertsLanding Component ──────────────────────────────────────────

export const JobAlertsLanding: React.FC = () => {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'alerts' | 'resume'>('alerts');
  const [token, setToken] = useState<string | null>(null);

  // Alert state
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);

  // Resume state
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragging, setDragging] = useState(false);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'strong' | 'likely' | 'possible'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'recent'>('score');

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  // Load token via session
  useEffect(() => {
    if (!session?.access_token) return;
    setToken(session.access_token);
  }, [session]);

  // Load alerts
  const loadAlerts = useCallback(async () => {
    if (!token) return;
    setAlertsLoading(true);
    try {
      const data = await apiCall('GET', '/api/job-alerts', token);
      setAlerts(data.alerts || []);
    } catch (e: any) {
      console.error('Load alerts error:', e.message);
    } finally { setAlertsLoading(false); }
  }, [token]);

  // Load resume profile
  const loadProfile = useCallback(async () => {
    if (!token) return;
    setProfileLoading(true);
    try {
      const data = await apiCall('GET', '/api/resume/profile', token);
      setProfile(data.profile);
    } catch (e: any) {
      console.error('Load profile error:', e.message);
    } finally { setProfileLoading(false); }
  }, [token]);

  // Load recommendations
  const loadRecommendations = useCallback(async () => {
    if (!token) return;
    setRecsLoading(true);
    try {
      const data = await apiCall('GET', '/api/jobs/recommendations', token);
      setRecommendations(data.recommendations || []);
    } catch (e: any) {
      console.error('Load recs error:', e.message);
    } finally { setRecsLoading(false); }
  }, [token]);

  useEffect(() => { if (token) { loadAlerts(); loadProfile(); loadRecommendations(); } }, [token]);

  // File upload handler
  const handleFileUpload = async (file: File) => {
    if (!file || !token) return;
    if (!file.name.endsWith('.pdf')) { showToast('Please upload a PDF file', 'error'); return; }

    setUploading(true);
    setUploadProgress('Reading PDF...');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      setUploadProgress('Parsing with AI...');

      const data = await apiCall('POST', '/api/resume/parse', token, formData, true);
      setProfile(data.profile);
      setUploadProgress('');
      showToast('Resume parsed successfully! AI scoring in progress...');
      setTimeout(() => loadRecommendations(), 5000);
    } catch (e: any) {
      showToast(e.message || 'Upload failed', 'error');
    } finally { setUploading(false); setUploadProgress(''); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Alert CRUD
  const handleCreateAlert = async (data: Partial<JobAlert>) => {
    const res = await apiCall('POST', '/api/job-alerts', token, data);
    setAlerts(prev => [res.alert, ...prev]);
    setShowForm(false);
    showToast('Alert created!');
  };

  const handleUpdateAlert = async (data: Partial<JobAlert>) => {
    if (!editingAlert) return;
    const res = await apiCall('PATCH', `/api/job-alerts/${editingAlert.id}`, token, data);
    setAlerts(prev => prev.map(a => a.id === editingAlert.id ? res.alert : a));
    setEditingAlert(null);
    showToast('Alert updated!');
  };

  const handleToggleAlert = async (id: string, active: boolean) => {
    await apiCall('PATCH', `/api/job-alerts/${id}`, token, { is_active: active });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: active } : a));
  };

  const handleDeleteAlert = async (id: string) => {
    await apiCall('DELETE', `/api/job-alerts/${id}`, token);
    setAlerts(prev => prev.filter(a => a.id !== id));
    showToast('Alert deleted');
  };

  const handleDeleteResume = async () => {
    if (!confirm('Delete your resume profile and all recommendations?')) return;
    await apiCall('DELETE', '/api/resume/profile', token);
    setProfile(null);
    setRecommendations([]);
    showToast('Resume deleted');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiCall('POST', '/api/jobs/sync', token);
      showToast(`Synced ${res.jobs_fetched} jobs! AI scoring in progress...`);
      setTimeout(() => loadRecommendations(), 8000);
    } catch (e: any) {
      showToast(e.message || 'Sync failed', 'error');
    } finally { setSyncing(false); }
  };

  // Filtered & sorted recommendations
  const filteredRecs = recommendations
    .filter(r => filter === 'all' || r.shortlist_verdict === filter)
    .sort((a, b) => sortBy === 'score'
      ? b.match_score - a.match_score
      : new Date(b.recommended_at).getTime() - new Date(a.recommended_at).getTime()
    );

  // Completeness score
  const completeness = profile ? (() => {
    const p = profile.parsed_profile || {};
    let s = 0;
    if (p.full_name) s += 20;
    if (p.email) s += 15;
    if (p.skills?.length > 0) s += 25;
    if (p.target_roles?.length > 0) s += 20;
    if (p.summary) s += 10;
    if (p.years_of_experience > 0) s += 10;
    return s;
  })() : 0;

  // ─── Auth Gate ───────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen font-sans relative overflow-x-hidden bg-slate-50">
        <Navbar />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
          <div className="w-24 h-24 rounded-[32px] bg-white border border-gray-100 shadow-[0_20px_40px_rgba(16,185,129,0.12)] flex items-center justify-center mb-2">
            <Bell className="w-12 h-12 text-[#10B981]" />
          </div>
          <h1 className="text-4xl font-[800] text-slate-900 tracking-tight">Job Alerts & AI Matching</h1>
          <p className="text-slate-500 font-medium text-lg max-w-md">Sign in to set up job alerts, upload your resume, and get AI-powered job recommendations.</p>
          <a href="/login" className="px-8 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5">
            Sign In to Get Started
          </a>
        </div>
      </div>
    );
  }

  // ─── Main UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden bg-slate-50">
      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 pt-32 pb-20">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-[800] text-slate-900 tracking-tight">Job Alerts & Matching</h1>
            <p className="text-slate-500 font-medium mt-2">Get AI-powered job recommendations tuned specifically to your resume.</p>
          </div>
          {activeTab === 'resume' && (
            <button
              onClick={handleSync} disabled={syncing || !profile}
              className="flex items-center gap-2 px-5 py-3 bg-white text-[#10B981] text-[13px] font-bold rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#10B981]/30 transition-all disabled:opacity-50 disabled:hover:shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing Jobs...' : 'Force Sync Jobs'}
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white border border-gray-200 shadow-sm rounded-xl p-1.5 mb-10 w-fit">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'alerts' ? 'bg-[#10B981] text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            <Bell className="w-4 h-4" />Job Alerts
            {alerts.filter(a => a.is_active).length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'alerts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {alerts.filter(a => a.is_active).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'resume' ? 'bg-[#10B981] text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            <Target className="w-4 h-4" />AI Resume Match
            {recommendations.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'resume' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {recommendations.length}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 1: JOB ALERTS ─────────────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Alerts List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-[800] text-slate-900">Your Alerts ({alerts.length})</h2>
                <button
                  onClick={() => { setEditingAlert(null); setShowForm(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />New Alert
                </button>
              </div>

              {/* Create Form */}
              {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <AlertEditorForm
                    onSave={handleCreateAlert}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              )}

              {/* Edit Form */}
              {editingAlert && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <AlertEditorForm
                    initial={editingAlert}
                    onSave={handleUpdateAlert}
                    onCancel={() => setEditingAlert(null)}
                  />
                </div>
              )}

              {alertsLoading ? (
                <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-[20px] bg-white border border-gray-100 shadow-sm animate-pulse" />)}</div>
              ) : alerts.length === 0 ? (
                <div className="rounded-[24px] border border-gray-200 border-dashed bg-white p-14 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-[800] text-slate-900 mb-2">No alerts yet</h3>
                  <p className="text-slate-500 font-medium text-[13px]">Create your first job alert to receive matching opportunities.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map(alert => (
                    <AlertItem
                      key={alert.id} alert={alert}
                      onToggle={handleToggleAlert}
                      onEdit={a => { setEditingAlert(a); setShowForm(false); }}
                      onDelete={handleDeleteAlert}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Alert Stats Sidebar */}
            <div className="space-y-6">
              <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(16,185,129,0.06)]">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-5">Alert Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-slate-500 font-bold">Total alerts</span>
                    <span className="font-[800] text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{alerts.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-slate-500 font-bold">Active</span>
                    <span className="font-[800] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{alerts.filter(a => a.is_active).length}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-slate-500 font-bold">Paused</span>
                    <span className="font-[800] text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{alerts.filter(a => !a.is_active).length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-[13px] font-[800] text-emerald-800">How it works</h3>
                </div>
                <ul className="space-y-3.5 text-[13px] text-emerald-800/80 font-medium">
                  <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-black mt-0.5 bg-emerald-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">1</span>Create alerts for roles you want</li>
                  <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-black mt-0.5 bg-emerald-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">2</span>Jobs sync every 6 hours automatically</li>
                  <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-black mt-0.5 bg-emerald-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">3</span>Upload your resume for AI match scoring</li>
                  <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-black mt-0.5 bg-emerald-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">4</span>Get ranked recommendations with shortlist probability</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: AI RESUME MATCH ────────────────────────────────────────── */}
        {activeTab === 'resume' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Upload + Profile */}
            <div className="lg:col-span-1 space-y-6">

              {/* Upload Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`rounded-[24px] border-2 border-dashed p-8 text-center transition-all duration-300 ${dragging ? 'border-[#10B981] bg-emerald-50/50 shadow-inner' : 'border-gray-200 bg-white hover:border-[#10B981]/50 hover:bg-slate-50'} shadow-sm cursor-pointer`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
                {uploading ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-100 border-t-[#10B981] rounded-full animate-spin mx-auto" />
                    <p className="text-[#10B981] font-bold text-[13px] animate-pulse">{uploadProgress || 'Processing...'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center transition-colors ${dragging ? 'bg-emerald-100 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-slate-900 font-[800] text-[15px]">{profile ? 'Re-upload Resume' : 'Upload Resume'}</p>
                      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wide mt-2">Drag & drop or click • PDF only • Max 10MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Parsed Profile Preview */}
              {profile && (
                <div className="rounded-[24px] border border-gray-100 bg-white shadow-[0_10px_40px_rgba(16,185,129,0.06)] p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                    <h3 className="font-[800] text-slate-900 text-sm flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 rounded-lg text-[#10B981]"><FileText className="w-4 h-4" /></div>
                      Profile Extract
                    </h3>
                    <button onClick={handleDeleteResume} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-slate-900 font-[800] text-lg">{profile.parsed_profile?.full_name || 'Unknown'}</p>
                      <p className="text-slate-500 font-medium text-[13px] mt-0.5">{profile.parsed_profile?.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 capitalize">
                        {profile.parsed_profile?.seniority_level || 'junior'}
                      </span>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-2">{profile.parsed_profile?.years_of_experience}y exp</p>
                    </div>
                  </div>

                  {/* Target roles */}
                  {profile.parsed_profile?.target_roles?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Target Roles</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.parsed_profile.target_roles.slice(0, 4).map((r: string) => (
                          <span key={r} className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {profile.parsed_profile?.skills?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Skills Analyzed</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.parsed_profile.skills.slice(0, 10).map((s: string) => (
                          <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 font-bold border border-slate-200">{s}</span>
                        ))}
                        {profile.parsed_profile.skills.length > 10 && (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 rounded-full flex items-center">+{profile.parsed_profile.skills.length - 10}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Profile Completeness */}
                  <div className="pt-2 border-t border-gray-50">
                    <div className="flex justify-between items-center mb-2 text-[12px]">
                      <span className="font-bold text-slate-500">Profile Completeness</span>
                      <span className="font-[800] text-[#10B981]">{completeness}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-1000 ease-out"
                        style={{ width: `${completeness}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Health Panel — common missing skills */}
              {recommendations.length > 0 && (
                <div className="rounded-[24px] border border-gray-100 bg-white shadow-[0_10px_40px_rgba(16,185,129,0.06)] p-6">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />Market Gap Analysis
                  </h3>
                  <p className="text-[13px] text-slate-500 font-medium mb-3">Skills frequently missing from matched jobs:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(
                      recommendations
                        .flatMap(r => r.match_details?.missing_skills || [])
                        .reduce((map, s) => { map.set(s, (map.get(s) || 0) + 1); return map; }, new Map<string, number>())
                        .entries()
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([skill, count]) => (
                        <span key={skill} className="text-[11px] px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-100 flex items-center gap-1.5">
                          {skill} <span className="opacity-50 text-[10px]">×{count}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Recommendation Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Sort + Filter */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm w-full sm:w-auto">
                  {(['all', 'strong', 'likely', 'possible'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[12px] font-bold capitalize transition-all ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm w-full sm:w-auto">
                  <button
                    onClick={() => setSortBy('score')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${sortBy === 'score' ? 'bg-[#10B981] text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                  >
                    Match %
                  </button>
                  <button
                    onClick={() => setSortBy('recent')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${sortBy === 'recent' ? 'bg-[#10B981] text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                  >
                    Recent
                  </button>
                </div>
              </div>

              {/* No resume state */}
              {!profile && !profileLoading && (
                <div className="rounded-[24px] border border-gray-200 border-dashed bg-white p-16 text-center shadow-sm mt-4">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-[#10B981]" />
                  </div>
                  <h3 className="text-slate-900 font-[800] text-xl mb-3">Upload your resume to get started</h3>
                  <p className="text-slate-500 font-medium text-[14px] max-w-sm mx-auto mb-8">Our AI will parse your profile and match you against thousands of live jobs to find your perfect fit.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 hover:-translate-y-0.5"
                  >
                    Upload PDF Resume
                  </button>
                </div>
              )}

              {/* Loading state */}
              {recsLoading && (
                <div className="space-y-5 mt-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
              )}

              {/* Recs feed */}
              {!recsLoading && profile && (
                <>
                  {filteredRecs.length === 0 ? (
                    <div className="rounded-[24px] border border-gray-200 border-dashed bg-white p-16 text-center shadow-sm mt-4">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-blue-500" />
                      </div>
                      <h3 className="text-slate-900 font-[800] text-xl mb-2">No matches yet</h3>
                      <p className="text-slate-500 font-medium text-[14px] mb-8">Click "Force Sync Jobs" to fetch the latest listings and trigger the AI matching engine.</p>
                      <button
                        onClick={handleSync} disabled={syncing}
                        className="px-6 py-3 bg-white hover:bg-slate-50 border border-gray-200 text-[#10B981] text-[14px] font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing Now...' : 'Force Sync Jobs'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5 mt-4">
                      <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">{filteredRecs.length} recommendations • sorted by {sortBy === 'score' ? 'match score' : 'recency'}</p>
                      {filteredRecs.map(rec => (
                        <JobMatchCard
                          key={rec.id} rec={rec} token={token}
                          onDismiss={id => setRecommendations(prev => prev.filter(r => r.id !== id))}
                          onSave={(id, saved) => setRecommendations(prev => prev.map(r => r.id === id ? { ...r, is_saved: saved } : r))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
