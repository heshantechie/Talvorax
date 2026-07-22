import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppSection } from '../../types';
import { ResumeAnalyzer } from '../../components/ResumeAnalyzer';
import { InterviewCoach } from '../../components/InterviewCoach';
import { MinuteTalk } from '../../components/MinuteTalk';
import { EditProfile } from './EditProfile';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import talvoraxLogo from '../assets/logo.png';
import { AILoader } from '../components/AILoader';

interface FeedbackRow {
  overall_score: number;
  communication_rating: number;
  technical_rating: number;
  problem_solving_rating: number;
  key_takeaways: string[];
  focus_topics: string[];
  created_at: string;
}

/* Minimal stroke icons (Fresh Mint uses line icons, not emoji) */
const Icon = {
  Home: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21H3z"/><path d="M9 21v-7h6v7"/></svg>,
  Mic: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/></svg>,
  Doc: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>,
  Timer: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>,
  Chat: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  User: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,
  Bell: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  Send: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>,
  Out: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] text-left w-full transition-colors ${
      active ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-500 font-semibold hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    {icon}{label}
  </button>
);

const StatCard: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-white border border-slate-200 rounded-[14px] px-[18px] py-4 shadow-[0_1px_2px_rgba(22,33,29,0.05)] flex flex-col justify-center gap-0.5">
    <p className="m-0 text-xs font-bold uppercase tracking-[0.07em] text-slate-400">{label}</p>
    <p className="m-0 text-[22px] font-[800] text-slate-900 font-display">{value}</p>
    {sub && <p className="m-0 text-xs text-slate-500 font-medium">{sub}</p>}
  </div>
);

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
  } else if (location.pathname.includes('/dashboard/edit-profile')) {
    activeSection = AppSection.EDIT_PROFILE;
  }

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

  const weakAreas = (() => {
    if (feedbackHistory.length === 0) return [];
    const avg = (key: keyof FeedbackRow) =>
      Math.round(feedbackHistory.reduce((s, f) => s + ((f[key] as number) || 0), 0) / feedbackHistory.length);
    return [
      { label: 'Communication', score: avg('communication_rating') },
      { label: 'Technical accuracy', score: avg('technical_rating') },
      { label: 'Problem solving', score: avg('problem_solving_rating') },
    ].sort((a, b) => a.score - b.score);
  })();

  const avgScore = feedbackHistory.length > 0
    ? Math.round(feedbackHistory.reduce((s, f) => s + f.overall_score, 0) / feedbackHistory.length)
    : 0;
  const bestScore = feedbackHistory.length > 0 ? Math.max(...feedbackHistory.map(f => f.overall_score)) : 0;
  const allFocusTopics = Array.from(new Set(feedbackHistory.flatMap(f => f.focus_topics || [])));
  const allKeyTakeaways = feedbackHistory.flatMap(f => f.key_takeaways || []).slice(0, 2);

  const firstName = (user?.user_metadata?.full_name || user?.email || 'there').split(/[\s@]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const toolLoader = (
    <div className="flex justify-center items-center h-full min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case AppSection.RESUME_ANALYZER: return <Suspense fallback={toolLoader}><ResumeAnalyzer /></Suspense>;
      case AppSection.INTERVIEW_COACH: return <Suspense fallback={toolLoader}><InterviewCoach /></Suspense>;
      case AppSection.MINUTE_TALK: return <Suspense fallback={toolLoader}><MinuteTalk /></Suspense>;
      case AppSection.EDIT_PROFILE: return <Suspense fallback={toolLoader}><EditProfile /></Suspense>;
      case AppSection.DASHBOARD:
      default:
        return (
          <div className="flex flex-col gap-[22px] max-w-[1100px]">
            {/* Header row */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="m-0 font-display font-[800] text-[27px] tracking-[-0.02em] text-slate-900">{greeting}, {firstName}</h1>
                <p className="m-0 mt-1 text-sm text-slate-500 font-medium">
                  {isReturningUser
                    ? `You've completed ${feedbackHistory.length} practice session${feedbackHistory.length > 1 ? 's' : ''}. Keep the streak going.`
                    : 'Start with a resume check or jump straight into a mock interview.'}
                </p>
              </div>
              <div className="flex gap-2.5 flex-none">
                <button onClick={() => navigate('/dashboard/resume-analyzer')} className="px-[18px] py-[11px] rounded-[10px] border-[1.5px] border-slate-300 text-slate-900 font-bold text-[13px] bg-white hover:bg-slate-50 transition-colors">Analyze resume</button>
                <button onClick={() => navigate('/dashboard/interview-coach')} className="px-[18px] py-[11px] rounded-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[13px] shadow-[0_1px_2px_rgba(22,33,29,0.15)] transition-colors">Start mock interview</button>
              </div>
            </div>

            {loadingHistory ? (
              <AILoader inline messages={["Analyzing Career History...", "Loading Personal Dashboard...", "Fetching AI Insights..."]} />
            ) : !isReturningUser ? (
              <div className="bg-white border border-slate-200 rounded-[14px] p-10 text-center shadow-[0_1px_2px_rgba(22,33,29,0.05)]">
                <h2 className="m-0 font-display font-[800] text-xl text-slate-900">Let's skill up</h2>
                <p className="mt-2 mb-6 mx-auto max-w-xl text-sm text-slate-500 font-medium">Analyze your resume to find your strong points, or test your skills in a mock interview. Your scores and coach notes will appear here.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => navigate('/dashboard/resume-analyzer')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-[10px] text-sm transition-colors">Analyze my resume</button>
                  <button onClick={() => navigate('/dashboard/interview-coach')} className="px-6 py-3 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 text-slate-900 font-bold rounded-[10px] text-sm transition-colors">Start mock interview</button>
                </div>
              </div>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white border border-slate-200 rounded-[14px] px-[18px] py-4 shadow-[0_1px_2px_rgba(22,33,29,0.05)] flex items-center gap-3.5">
                    <div className="relative w-[52px] h-[52px] flex-none">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#eef0ea" strokeWidth="11" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.68 0.14 163)" strokeWidth="11" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={264 - (264 * lastFeedback.overall_score) / 100} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-[800] text-slate-900">{lastFeedback.overall_score}</span>
                    </div>
                    <div>
                      <p className="m-0 text-xs font-bold uppercase tracking-[0.07em] text-slate-400">Last score</p>
                      <p className="m-0 text-xs text-slate-500 font-medium">{new Date(lastFeedback.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <StatCard label="Sessions" value={feedbackHistory.length} sub="all time" />
                  <StatCard label="Average" value={`${avgScore}%`} sub={`across ${feedbackHistory.length} session${feedbackHistory.length > 1 ? 's' : ''}`} />
                  <StatCard label="Best" value={`${bestScore}%`} sub="personal record" />
                </div>

                {/* Areas to improve + Continue training */}
                <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-3.5">
                  <div className="bg-white border border-slate-200 rounded-[14px] px-[22px] py-5 shadow-[0_1px_2px_rgba(22,33,29,0.05)] flex flex-col gap-3.5">
                    <div className="flex justify-between items-baseline">
                      <h3 className="m-0 font-display font-[800] text-base text-slate-900">Areas to improve</h3>
                      <span className="text-xs text-slate-400 font-medium">avg of {feedbackHistory.length} session{feedbackHistory.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {weakAreas.map((area, i) => (
                        <div key={area.label}>
                          <div className="flex justify-between mb-1.5 text-[13px]">
                            <span className="font-bold text-slate-900">{area.label}</span>
                            <span className={`font-bold ${i === 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{area.score}/10</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${area.score * 10}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {allFocusTopics.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-[7px] items-center">
                        <span className="text-[10.5px] font-bold tracking-[0.07em] uppercase text-slate-400">Focus topics</span>
                        {allFocusTopics.slice(0, 5).map(t => (
                          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[14px] px-[22px] py-5 shadow-[0_1px_2px_rgba(22,33,29,0.05)] flex flex-col gap-1.5">
                    <h3 className="m-0 mb-2 font-display font-[800] text-base text-slate-900">Continue training</h3>
                    {[
                      { icon: <Icon.Mic />, name: 'Mock interview', desc: 'AI coach · voice + video', to: '/dashboard/interview-coach', hot: true },
                      { icon: <Icon.Doc />, name: 'Resume analyzer', desc: 'ATS score + fixes', to: '/dashboard/resume-analyzer' },
                      { icon: <Icon.Timer />, name: 'Minute Talk', desc: '60-second speaking drill', to: '/dashboard/minute-talk' },
                      { icon: <Icon.Chat />, name: 'Communication skills', desc: 'Practice worlds + drills', to: '/communication' },
                    ].map(t => (
                      <button key={t.name} onClick={() => navigate(t.to)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left w-full transition-colors ${t.hot ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-100 border border-transparent'}`}>
                        <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-none ${t.hot ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{t.icon}</span>
                        <span className="flex flex-col">
                          <span className="text-[13.5px] font-bold text-slate-900">{t.name}</span>
                          <span className="text-xs text-slate-500 font-medium">{t.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coach notes strip */}
                {allKeyTakeaways.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-[14px] px-[22px] py-4 shadow-[0_1px_2px_rgba(22,33,29,0.05)] flex items-center gap-4 flex-wrap">
                    <span className="text-[10.5px] font-bold tracking-[0.07em] uppercase text-slate-400 flex-none">Coach notes</span>
                    <p className="m-0 text-[13px] text-slate-900 flex-1 min-w-[240px]">{allKeyTakeaways.join(' · ')}</p>
                    <button onClick={() => navigate('/dashboard/interview-coach')} className="text-[12.5px] font-bold text-emerald-700 hover:text-emerald-800 flex-none transition-colors">All feedback →</button>
                  </div>
                )}
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-[236px] flex-none bg-white border-r border-slate-200 flex flex-col px-3.5 py-5 sticky top-0 h-screen max-lg:hidden">
        <img src={talvoraxLogo} alt="Talvorax" className="h-9 w-auto object-contain self-start ml-2 mt-0.5 mb-[22px] mix-blend-multiply" />
        <nav className="flex flex-col gap-0.5">
          <NavItem icon={<Icon.Home />} label="Dashboard" active={activeSection === AppSection.DASHBOARD} onClick={() => navigate('/dashboard')} />
          <NavItem icon={<Icon.Mic />} label="Interview Coach" active={activeSection === AppSection.INTERVIEW_COACH} onClick={() => navigate('/dashboard/interview-coach')} />
          <NavItem icon={<Icon.Doc />} label="Resume Analyzer" active={activeSection === AppSection.RESUME_ANALYZER} onClick={() => navigate('/dashboard/resume-analyzer')} />
          <NavItem icon={<Icon.Timer />} label="Minute Talk" active={activeSection === AppSection.MINUTE_TALK} onClick={() => navigate('/dashboard/minute-talk')} />
          <NavItem icon={<Icon.Chat />} label="Communication" onClick={() => navigate('/communication')} />
          <NavItem icon={<Icon.Bell />} label="Job Alerts" onClick={() => navigate('/job-alerts')} />
          <NavItem icon={<Icon.Send />} label="Auto Apply" onClick={() => navigate('/auto-apply')} />
          <NavItem icon={<Icon.User />} label="Edit Profile" active={activeSection === AppSection.EDIT_PROFILE} onClick={() => navigate('/dashboard/edit-profile')} />
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          {isReturningUser && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-3 flex flex-col gap-[7px]">
              <div className="flex justify-between text-xs font-bold text-slate-900">
                <span>Average score</span><span className="text-emerald-800">{avgScore}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${avgScore}%` }} />
              </div>
              <span className="text-[11px] text-slate-500 font-medium">{feedbackHistory.length} session{feedbackHistory.length > 1 ? 's' : ''} completed</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-[34px] h-[34px] rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-[800] text-sm flex-none">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-bold text-slate-900 truncate">{firstName}</span>
              <span className="text-[11px] text-slate-400 truncate">{user?.email}</span>
            </div>
            <button onClick={signOut} title="Sign out" className="text-slate-400 hover:text-slate-900 flex-none transition-colors"><Icon.Out /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 px-9 py-[30px] max-lg:px-4">
        {renderSection()}
      </main>
    </div>
  );
};
