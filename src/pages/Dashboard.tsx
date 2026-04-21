import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppSection } from '../../types';
import { ResumeAnalyzer } from '../../components/ResumeAnalyzer';
import { InterviewCoach } from '../../components/InterviewCoach';
import { MinuteTalk } from '../../components/MinuteTalk';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import talvoraxLogo from '../assets/Logo.png';
import { Navbar } from '../components/Navbar';

interface FeedbackRow {
  overall_score: number;
  communication_rating: number;
  technical_rating: number;
  problem_solving_rating: number;
  key_takeaways: string[];
  focus_topics: string[];
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  let activeSection = AppSection.DASHBOARD;
  if (location.pathname.includes('/dashboard/resume-analyzer')) {
    activeSection = AppSection.RESUME_ANALYZER;
  } else if (location.pathname.includes('/dashboard/interview-coach')) {
    activeSection = AppSection.INTERVIEW_COACH;
  } else if (location.pathname.includes('/dashboard/minute-talk')) {
    activeSection = AppSection.MINUTE_TALK;
  }

  // Real interview history from Supabase
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) { setLoadingHistory(false); return; }
      try {
        const { data, error } = await supabase
          .from('interview_feedback')
          .select('overall_score, communication_rating, technical_rating, problem_solving_rating, key_takeaways, focus_topics, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) setFeedbackHistory(data as FeedbackRow[]);
      } catch (_) { }
      finally { setLoadingHistory(false); }
    };
    fetchHistory();
  }, [user]);

  const isReturningUser = feedbackHistory.length > 0;
  const lastFeedback = feedbackHistory[0];

  // Compute weak areas: average each skill across all sessions, sorted ascending
  const weakAreas = (() => {
    if (feedbackHistory.length === 0) return [];
    const avg = (key: keyof FeedbackRow) =>
      Math.round(feedbackHistory.reduce((s, f) => s + ((f[key] as number) || 0), 0) / feedbackHistory.length);
    return [
      { label: 'Communication', score: avg('communication_rating') },
      { label: 'Technical Accuracy', score: avg('technical_rating') },
      { label: 'Problem Solving', score: avg('problem_solving_rating') },
    ].sort((a, b) => a.score - b.score);
  })();

  const avgScore = feedbackHistory.length > 0
    ? Math.round(feedbackHistory.reduce((s, f) => s + f.overall_score, 0) / feedbackHistory.length)
    : 0;

  // Aggregate all focus topics across sessions
  const allFocusTopics = Array.from(new Set(feedbackHistory.flatMap(f => f.focus_topics || [])));
  const allKeyTakeaways = feedbackHistory.flatMap(f => f.key_takeaways || []).slice(0, 4);

  const getScoreColor = (s: number) => s >= 70 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';
  const getScoreLabel = (s: number) => s >= 70 ? 'Great' : s >= 50 ? 'Moderate' : 'Needs Work';

  const renderSection = () => {
    switch (activeSection) {
      case AppSection.RESUME_ANALYZER:
        return (
          <Suspense fallback={<div className="flex justify-center items-center h-full min-h-[50vh]"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <ResumeAnalyzer />
          </Suspense>
        );
      case AppSection.INTERVIEW_COACH:
        return (
          <Suspense fallback={<div className="flex justify-center items-center h-full min-h-[50vh]"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <InterviewCoach />
          </Suspense>
        );
      case AppSection.MINUTE_TALK:
        return (
          <Suspense fallback={<div className="flex justify-center items-center h-full min-h-[50vh]"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <MinuteTalk />
          </Suspense>
        );
      case AppSection.DASHBOARD:
      default:
        return (
          <div className="space-y-12 py-12">
            <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
              <h1 className="text-5xl md:text-7xl font-[800] tracking-tight text-slate-900 leading-tight">
                Welcome to your<br />Dashboard.
              </h1>
              <p className="text-xl text-slate-500 font-medium">
                You are logged in as <span className="text-[#10B981] font-bold">{user?.email}</span>
              </p>

              {loadingHistory ? (
                <div className="mt-12 text-slate-400 text-lg animate-pulse">Loading your data…</div>
              ) : !isReturningUser ? (
                // ── New Candidate Layout ──────────────────────────────────
                <div className="mt-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">Let's Skill Up!</h2>
                  <p className="text-slate-500 mb-8 max-w-xl mx-auto font-medium">Start by analyzing your resume to find your strong points, or jump straight into a mock interview to test your skills.</p>
                  <div className="flex flex-wrap justify-center gap-6">
                    <button
                      onClick={() => navigate('/dashboard/resume-analyzer')}
                      className="px-8 py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] text-lg hover:-translate-y-0.5"
                    >
                      Analyze My Resume
                    </button>
                    <button
                      onClick={() => navigate('/dashboard/interview-coach')}
                      className="px-8 py-4 bg-white border-2 border-[#10B981] hover:bg-[#10B981]/5 text-[#10B981] font-bold rounded-2xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.1)] text-lg hover:-translate-y-0.5"
                    >
                      Start Mock Interview
                    </button>
                  </div>
                </div>
              ) : (
                // ── Returning User Layout ─────────────────────────────────
                <div className="mt-16 text-left w-full max-w-5xl mx-auto">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-gray-200 pb-4">Recent Interview Performance</h2>

                  {/* Top Row: 2 columns — Last Score | Weak Areas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                    {/* Last Attempted Interview Score */}
                    <div className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-[0_10px_40px_rgba(16,185,129,0.08)] flex flex-col items-center justify-center gap-4">
                      <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider self-start">Last Interview Score</h3>
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="45" fill="none"
                            stroke={getScoreColor(lastFeedback.overall_score)}
                            strokeWidth="8"
                            strokeDasharray="283"
                            strokeDashoffset={283 - (283 * lastFeedback.overall_score) / 100}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-4xl font-[800] text-slate-900">{lastFeedback.overall_score}<span className="text-lg text-slate-400 font-bold">%</span></span>
                        </div>
                      </div>
                      <p className="text-sm font-bold px-4 py-1.5 rounded-full" style={{ color: getScoreColor(lastFeedback.overall_score), background: `${getScoreColor(lastFeedback.overall_score)}18` }}>
                        {getScoreLabel(lastFeedback.overall_score)} Performance
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        From {new Date(lastFeedback.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Improvement / Weak Areas */}
                    <div className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-[0_10px_40px_rgba(16,185,129,0.08)] flex flex-col gap-4">
                      <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider">Areas to Improve</h3>
                      <p className="text-xs text-slate-400 font-medium -mt-2">Based on all {feedbackHistory.length} interview{feedbackHistory.length > 1 ? 's' : ''}</p>
                      <div className="flex flex-col gap-3 flex-1">
                        {weakAreas.map(area => (
                          <div key={area.label}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-bold text-slate-700">{area.label}</span>
                              <span className="text-sm font-bold" style={{ color: getScoreColor(area.score) }}>{area.score}/10</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{ width: `${area.score * 10}%`, background: getScoreColor(area.score) }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {allFocusTopics.length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Focus Topics</p>
                          <div className="flex flex-wrap gap-2">
                            {allFocusTopics.slice(0, 5).map(t => (
                              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#059669] font-bold">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Full-width Analysis Summary */}
                  <div className="bg-white border border-gray-100 p-8 rounded-[24px] shadow-[0_10px_40px_rgba(16,185,129,0.08)] flex flex-col">
                    <h3 className="text-slate-500 font-bold mb-6 text-sm uppercase tracking-wider">Interview Analysis Summary</h3>
                    <div className="flex-1 space-y-4">
                      {allKeyTakeaways.length > 0 ? allKeyTakeaways.map((tip, i) => (
                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-700 font-bold flex items-start gap-2">
                            <span className="mt-1 w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)] flex-shrink-0"></span>
                            {tip}
                          </p>
                        </div>
                      )) : (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-500 font-medium">Complete more interviews to see detailed takeaways here.</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-[13px] text-slate-400 font-medium">
                        Avg score across {feedbackHistory.length} attempt{feedbackHistory.length > 1 ? 's' : ''}: <strong className="text-slate-700">{avgScore}%</strong>
                      </span>
                      <button
                        onClick={() => navigate('/dashboard/interview-coach')}
                        className="text-[13px] text-[#10B981] hover:text-[#059669] font-bold transition-colors"
                      >
                        Take another interview &gt;
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden" style={{ background: '#FFFFFF' }}>
      {/* Top-right green blob */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, #C8E6C9 0%, #B9F6CA 40%, transparent 75%)',
        filter: 'blur(48px)', opacity: 0.75, pointerEvents: 'none', zIndex: 0
      }} />
      {/* Bottom-left green blob */}
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '460px', height: '460px', borderRadius: '50%',
        background: 'radial-gradient(circle, #C8E6C9 0%, #B9F6CA 40%, transparent 75%)',
        filter: 'blur(52px)', opacity: 0.7, pointerEvents: 'none', zIndex: 0
      }} />

      {/* Unified Nav */}
      <Navbar />

      <main className="flex-1 relative z-10 w-full pt-[76px]">
        {renderSection()}
      </main>
    </div>
  );
};
