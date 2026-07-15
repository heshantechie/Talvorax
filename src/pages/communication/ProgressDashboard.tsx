import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  ChevronLeft, Trophy, Zap, Flame, Target, BarChart3, TrendingUp, CheckCircle,
  Clock, Star, Bot, ArrowRight, RefreshCw, Globe, MessageSquare, Activity,
  Headphones, AlertTriangle, Sparkles, BookOpen, Award
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_MISSIONS } from './worldsConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

import { apiCall } from '../../lib/communicationApi';

const SCORE_METRICS = [
  { key: 'grammar_score', label: 'Grammar', color: 'bg-emerald-500', barColor: '#10b981', icon: '✍️' },
  { key: 'fluency_score', label: 'Fluency', color: 'bg-teal-600', barColor: '#0d9488', icon: '🌊' },
  { key: 'vocabulary_score', label: 'Vocabulary', color: 'bg-emerald-600', barColor: '#059669', icon: '📚' },
  { key: 'confidence_score', label: 'Confidence', color: 'bg-green-600', barColor: '#16a34a', icon: '💪' },
  { key: 'professional_tone_score', label: 'Tone', color: 'bg-teal-700', barColor: '#0f766e', icon: '🎯' },
  { key: 'pronunciation_score', label: 'Pronunciation', color: 'bg-green-750', barColor: '#15803d', icon: '🗣️' },
];

const ACHIEVEMENTS = [
  { id: 'first_session', label: 'First Step', desc: 'Completed your first session', icon: '🌟', req: 1 },
  { id: 'five_sessions', label: 'Consistent', desc: 'Completed 5 sessions', icon: '🔥', req: 5 },
  { id: 'ten_sessions', label: 'Dedicated', desc: 'Completed 10 sessions', icon: '🏆', req: 10 },
  { id: 'score_80', label: 'Communicator', desc: 'Achieved 80+ overall score', icon: '🎖️', scoreReq: 80 },
  { id: 'score_90', label: 'Excellence', desc: 'Achieved 90+ overall score', icon: '💎', scoreReq: 90 },
  { id: 'campus_master', label: 'Campus Master', desc: 'Complete all Campus missions', icon: '🎓', worldReq: 'campus' },
  { id: 'workplace_pro', label: 'Workplace Pro', desc: 'Complete all Workplace missions', icon: '💼', worldReq: 'workplace' },
];

const RECOMMENDED_NEXT = [
  { id: 'campus_group_discussion', label: 'Group Discussion', desc: 'Practice debate and argumentation', icon: '🎓', path: '/communication/campus', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'workplace_salary_negotiation', label: 'Salary Negotiation', desc: 'Master compensation conversations', icon: '💼', path: '/communication/workplace', gradient: 'from-teal-500 to-cyan-600' },
  { id: 'leadership_vc_pitch', label: 'VC Pitch', desc: 'Practice investor presentations', icon: '🎤', path: '/communication/leadership', gradient: 'from-green-600 to-teal-700' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced'
};

export const ProgressDashboard: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('/api/communication/sessions', token);
      setSessions(data.sessions || []);

      const statsData = await apiCall('/api/communication/user-stats', token);
      setMetrics({
        overall: statsData.overallScore || 0,
        grammar: statsData.skillScores?.grammar || 0,
        fluency: statsData.skillScores?.fluency || 0,
        vocab: statsData.skillScores?.vocabulary || 0,
        confidence: statsData.skillScores?.confidence || 0,
        tone: statsData.skillScores?.tone || 0,
        pronunciation: statsData.skillScores?.pronunciation || 0,
        totalXP: statsData.totalXP || 0,
        completedCount: statsData.totalSessions || 0,
        bestScore: statsData.recentSessions?.length > 0 ? Math.max(...statsData.recentSessions.map((s: any) => s.overall_score || 0)) : 0,
        streak: statsData.streak || 0,
        worldsCompleted: Object.keys(statsData.worldCompletion || {}).length,
      });

      const achievementsData = await apiCall('/api/communication/achievements', token);
      setAchievements(achievementsData.achievements || []);
    } catch (err: any) {
      setError('Failed to load progress data.');
    } finally {
      setLoading(false);
    }
  };

  const completedSessions = sessions.filter(s => s.status === 'completed');

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 65) return 'text-teal-600';
    return 'text-red-500';
  };

  const levelInfo = metrics ? { level: Math.floor(metrics.totalXP / 200) + 1, nextXP: 200 - (metrics.totalXP % 200) } : { level: 1, nextXP: 200 };
  const xpProgress = metrics ? (metrics.totalXP % 200) / 200 * 100 : 0;

  // Dynamically derive recommended missions: incomplete missions from completed worlds + next missions
  const completedMissionIds = new Set(completedSessions.map((s: any) => s.mission_id));
  const WORLD_GRADIENTS: Record<string, string> = {
    campus: 'from-emerald-500 to-teal-600',
    workplace: 'from-green-500 to-emerald-600',
    social: 'from-teal-500 to-cyan-600',
    leadership: 'from-green-600 to-teal-700',
  };
  const WORLD_PATHS: Record<string, string> = {
    campus: '/communication/campus',
    workplace: '/communication/workplace',
    social: '/communication/social',
    leadership: '/communication/leadership',
  };
  const WORLD_EMOJIS: Record<string, string> = { campus: '🎓', workplace: '💼', social: '🤝', leadership: '🎤' };
  const incompleteMissions = ALL_MISSIONS
    .filter(m => !completedMissionIds.has(m.id))
    .slice(0, 3)
    .map(m => ({
      id: m.id,
      label: m.title,
      desc: m.desc,
      icon: WORLD_EMOJIS[m.worldId] || '💬',
      path: WORLD_PATHS[m.worldId] || '/communication/worlds',
      gradient: WORLD_GRADIENTS[m.worldId] || 'from-slate-500 to-slate-600',
    }));
  const recommendedNext = incompleteMissions.length > 0 ? incompleteMissions : [
    { id: 'campus_group_discussion', label: 'Group Discussion', desc: 'Practice debate and argumentation', icon: '🎓', path: '/communication/campus', gradient: 'from-emerald-500 to-teal-600' },
    { id: 'workplace_salary_negotiation', label: 'Salary Negotiation', desc: 'Master compensation conversations', icon: '💼', path: '/communication/workplace', gradient: 'from-green-500 to-emerald-600' },
    { id: 'leadership_vc_pitch', label: 'VC Pitch', desc: 'Practice investor presentations', icon: '🎤', path: '/communication/leadership', gradient: 'from-green-600 to-teal-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <CommNav activeView="progress" compact backLabel="Home" onBack={() => navigate('/communication')} />
      <div className="max-w-5xl mx-auto px-4 pt-20">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" /> My Progress
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">AI coaching journey & growth analytics</p>
          </div>
          <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2 text-red-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-bold">Loading your progress...</p>
          </div>
        ) : !metrics ? (
          // Empty state
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm max-w-lg mx-auto">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-800 mb-2">No Sessions Yet</h3>
              <p className="text-sm text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed mb-6">Complete your first practice session to start tracking your progress, earning XP, and unlocking achievements!</p>
              <Link to="/communication/conversation" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm">
                <Globe className="w-4 h-4" /> Start First Session
              </Link>
            </div>

            {/* Recommended even without data */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4">Recommended Practice Tools</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: <MessageSquare className="w-4 h-4" />, label: 'AI Conversation Practice', desc: 'Back-and-forth roleplay with AI', path: '/communication/conversation', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                  { icon: <Activity className="w-4 h-4" />, label: 'Speech Analyzer', desc: 'Pronunciation & fluency scoring', path: '/communication/pronunciation', color: 'bg-teal-50 border-teal-100 text-teal-700' },
                  { icon: <AlertTriangle className="w-4 h-4" />, label: 'Filler Word Detection', desc: 'Real-time um/uh tracking', path: '/communication/filler-words', color: 'bg-green-50 border-green-100 text-green-700' },
                  { icon: <Headphones className="w-4 h-4" />, label: 'Voice Clarity Coach', desc: 'Pace, volume & clarity gauges', path: '/communication/voice-analysis', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                ].map(t => (
                  <Link key={t.path} to={t.path} className={`${t.color} border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all`}>
                    <div className="flex-shrink-0">{t.icon}</div>
                    <div>
                      <p className="text-xs font-black">{t.label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{t.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Hero row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Overall Score', value: `${metrics.overall}`, icon: <Trophy className="w-5 h-5 text-emerald-600" />, color: 'bg-emerald-50 border-emerald-100', sub: 'avg across all sessions' },
                { label: 'Total XP', value: `${metrics.totalXP} XP`, icon: <Zap className="w-5 h-5 text-teal-600" />, color: 'bg-teal-50 border-teal-100', sub: `Level ${levelInfo.level}` },
                { label: 'Sessions Done', value: `${metrics.completedCount}`, icon: <CheckCircle className="w-5 h-5 text-green-600" />, color: 'bg-green-50 border-green-100', sub: 'completed' },
                { label: 'Practice Streak', value: `${metrics.streak} days`, icon: <Flame className="w-5 h-5 text-emerald-700" />, color: 'bg-emerald-50 border-emerald-100', sub: 'keep it up!' },
              ].map(w => (
                <div key={w.label} className={`${w.color} border rounded-2xl p-4 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-2">{w.icon}<p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{w.label}</p></div>
                  <p className="text-2xl font-black text-slate-900">{w.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{w.sub}</p>
                </div>
              ))}
            </div>

            {/* ── XP Level Progress ── */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">{levelInfo.level}</div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Level {levelInfo.level}</p>
                    <p className="text-[10px] text-slate-400">{metrics.totalXP} / {levelInfo.level * 200} XP total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">{levelInfo.nextXP} XP to Level {levelInfo.level + 1}</p>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>

            {/* ── Skill Breakdown ── */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 mb-5 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Skill Breakdown</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SCORE_METRICS.map(m => {
                  const score = metrics[m.key.replace('_score', '').replace('professional_tone', 'tone').replace('vocabulary', 'vocab')] || metrics.overall;
                  return (
                    <div key={m.key} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">{m.icon} {m.label}</span>
                        <span className={`font-black ${getScoreColor(score)}`}>{score}/100</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.color} transition-all duration-700`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Achievements ── */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-emerald-600" /> Achievements</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {achievements.slice(0, 8).map(a => {
                  return (
                    <div key={a.id} className={`p-3 rounded-2xl border text-center transition-all ${a.earned ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                      <div className="text-2xl mb-1">{a.earned ? a.icon : '🔒'}</div>
                      <p className={`text-xs font-black mb-0.5 ${a.earned ? 'text-emerald-800' : 'text-slate-400'}`}>{a.label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{a.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Session History ── */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" /> Session History</h2>
              {completedSessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No completed sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {completedSessions.slice(0, 10).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-sm flex-shrink-0">
                        {s.world_id === 'campus' ? '🎓' : s.world_id === 'workplace' ? '💼' : s.world_id === 'social' ? '🤝' : s.world_id === 'leadership' ? '🎤' : '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{s.title || s.mission_id || 'Practice Session'}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(s.completed_at || s.created_at)} • {DIFFICULTY_LABELS[s.difficulty] || s.difficulty || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-black ${getScoreColor(s.overall_score)}`}>{s.overall_score || '—'}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">+{s.xp_earned || 0} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── AI Learning Insights ── */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white">
              <p className="text-xs font-black text-emerald-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                <Bot className="w-3.5 h-3.5" /> AI Learning Insights
              </p>
              <div className="space-y-3">
                {[
                  metrics.grammar >= 80 && `Your grammar is strong at ${metrics.grammar}/100. Focus on expanding vocabulary for an even bigger impact.`,
                  metrics.confidence < 70 && `Your confidence score of ${metrics.confidence} suggests hesitation — try practicing assertive statements more regularly.`,
                  metrics.fluency >= 75 && `Good fluency at ${metrics.fluency}/100! Reducing filler words further will push you to the next level.`,
                  metrics.completedCount >= 5 && `You've completed ${metrics.completedCount} sessions — you're building great habits! Aim for harder missions next.`,
                  metrics.bestScore >= 80 && `Your best score of ${metrics.bestScore} shows peak potential. Consistent practice will make that your average!`,
                  `Keep exploring different worlds — you've completed ${metrics.worldsCompleted} of 4 worlds so far.`
                ].filter(Boolean).slice(0, 3).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Star className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-slate-300 leading-relaxed">{insight as string}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Recommended Next Missions (Dynamic) ── */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500" /> Recommended Next</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recommendedNext.map(r => (
                  <Link key={r.id} to={r.path}
                    className={`p-4 bg-gradient-to-br ${r.gradient} rounded-2xl text-white hover:shadow-lg transition-all hover:-translate-y-0.5`}>
                    <div className="text-2xl mb-2">{r.icon}</div>
                    <p className="text-xs font-black mb-0.5">{r.label}</p>
                    <p className="text-[10px] text-white/70 leading-relaxed line-clamp-2">{r.desc}</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-white/80">
                      Start <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
