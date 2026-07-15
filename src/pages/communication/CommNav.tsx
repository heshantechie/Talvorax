import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Globe, Zap, BarChart2, Trophy, Flame, User, Menu, X, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import talvoraxLogo from '../../assets/logo.png';
import { apiCall } from '../../lib/communicationApi';

interface CommNavProps {
  activeView?: string;
  onViewChange?: (v: string) => void;
  xp?: number;
  streak?: number;
  /** Compact strip mode — shown during active tool sessions */
  compact?: boolean;
  /** Fully hide the nav — for full-screen recording states */
  hidden?: boolean;
  /** Back label shown in compact mode */
  backLabel?: string;
  onBack?: () => void;
}

const TABS = [
  { id: 'home',         label: 'Home',         Icon: Home,     path: '/communication' },
  { id: 'journey',      label: 'Worlds',       Icon: Globe,    path: '/communication/worlds' },
  { id: 'studio',       label: 'Practice',     Icon: Zap,      path: '/communication/studio' },
  { id: 'progress',     label: 'Progress',     Icon: BarChart2, path: '/communication/progress' },
  { id: 'achievements', label: 'Badges',       Icon: Trophy,   path: '/communication/achievements' },
];

export const CommNav: React.FC<CommNavProps> = ({
  activeView,
  onViewChange,
  xp = 0,
  streak = 0,
  compact = false,
  hidden = false,
  backLabel,
  onBack,
}) => {
  const { user, session } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch live stats if not provided
  const [liveXP, setLiveXP] = useState(xp);
  const [liveStreak, setLiveStreak] = useState(streak);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!session?.access_token || (xp > 0 && streak > 0)) return;
    apiCall('/api/communication/user-stats', session.access_token)
      .then(d => {
        if (d.totalXP !== undefined) setLiveXP(d.totalXP);
        if (d.streak !== undefined) setLiveStreak(d.streak);
      })
      .catch(() => {});
  }, [session?.access_token]);

  // Use provided xp/streak if given (from parent)
  useEffect(() => { if (xp > 0) setLiveXP(xp); }, [xp]);
  useEffect(() => { if (streak > 0) setLiveStreak(streak); }, [streak]);

  if (hidden) return null;

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? 'C';

  const getActiveTab = () => {
    if (activeView) return activeView;
    const path = location.pathname;
    if (path === '/communication' || path === '/communication/daily-challenge') return 'home';
    if (path.startsWith('/communication/worlds') || path.startsWith('/communication/campus') || path.startsWith('/communication/workplace') || path.startsWith('/communication/social') || path.startsWith('/communication/leadership')) return 'journey';
    if (path.startsWith('/communication/studio') || path.startsWith('/communication/pronunciation') || path.startsWith('/communication/filler-words') || path.startsWith('/communication/voice-analysis') || path.startsWith('/communication/pronunciation-coach') || path.startsWith('/communication/confidence')) return 'studio';
    if (path.startsWith('/communication/progress')) return 'progress';
    if (path.startsWith('/communication/achievements')) return 'achievements';
    return 'home';
  };

  const currentActive = getActiveTab();

  // ── Compact mode: minimal top bar for tool pages ──────────────
  if (compact) {
    return (
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-white/80 backdrop-blur-md'
      }`}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button
            onClick={onBack ? onBack : () => window.history.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-xs font-bold">{backLabel || 'Back'}</span>
          </button>

          <Link to="/" className="flex-shrink-0">
            <img src={talvoraxLogo} alt="Talvorax" className="h-7 w-auto object-contain mix-blend-multiply" />
          </Link>

          <div className="flex items-center gap-2">
            {liveStreak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-xl">
                <Flame className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-black text-emerald-700">{liveStreak}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Zap className="w-3 h-3 text-emerald-600" />
              <span className="text-xs font-black text-emerald-700">{liveXP.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ── Full nav: used on main navigation pages ───────────────────
  return (
    <>
      {/* Desktop top nav */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100/80'
          : 'bg-white/75 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src={talvoraxLogo} alt="Talvorax" className="h-8 w-auto object-contain mix-blend-multiply" />
          </Link>

          {/* Center tabs */}
          <nav className="hidden md:flex items-center gap-0.5 bg-slate-100/80 rounded-2xl p-1">
            {TABS.map(({ id, label, Icon, path }) => (
              <Link
                key={id}
                to={path}
                onClick={() => onViewChange?.(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 ${
                  currentActive === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side: stats + avatar */}
          <div className="hidden md:flex items-center gap-2.5">
            {liveStreak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                <Flame className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-black text-emerald-700">{liveStreak} day{liveStreak !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-black text-emerald-700">{liveXP.toLocaleString()} XP</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-black shadow-md ring-2 ring-white cursor-pointer">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
              ) : initials}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-5 py-3 space-y-1">
              {TABS.map(({ id, label, Icon, path }) => (
                <Link
                  key={id}
                  to={path}
                  onClick={() => { setMobileOpen(false); onViewChange?.(id); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                    currentActive === id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2">
                  {liveStreak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <Flame className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-700">{liveStreak}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <Zap className="w-3 h-3 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-700">{liveXP.toLocaleString()} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
