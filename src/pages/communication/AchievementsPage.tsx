import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  ArrowLeft, Trophy, RefreshCw, Lock, Star, Zap, Target, CheckCircle,
  Flame, MessageSquare, Headphones, Activity, Shield, Crown, Rocket,
  GraduationCap, Briefcase, Users, Book, Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../lib/communicationApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type Rarity = 'bronze' | 'silver' | 'gold' | 'diamond';

const RARITY: Record<Rarity, { label: string; gradient: string; glow: string; badgeBg: string; ring: string }> = {
  bronze:  { label: 'Bronze',  gradient: 'from-green-400 to-emerald-500',  glow: 'shadow-green-200', badgeBg: 'bg-green-50 border-green-200 text-green-700', ring: 'ring-green-100' },
  silver:  { label: 'Silver',  gradient: 'from-emerald-450 to-teal-500',   glow: 'shadow-emerald-200', badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700', ring: 'ring-emerald-100' },
  gold:    { label: 'Gold',    gradient: 'from-teal-400 to-cyan-500',  glow: 'shadow-teal-200',  badgeBg: 'bg-teal-50 border-teal-200 text-teal-700',   ring: 'ring-teal-100' },
  diamond: { label: 'Diamond', gradient: 'from-emerald-600 to-teal-700',   glow: 'shadow-emerald-300',   badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-800',     ring: 'ring-emerald-200' },
};

const ICON_MAP: Record<string, React.FC<any>> = {
  first_session: MessageSquare,
  five_sessions: Flame,
  ten_sessions: Zap,
  score_80: Target,
  score_90: Trophy,
  confident_speaker: Shield,
  no_filler: CheckCircle,
  grammar_master: Book,
  level_5: Star,
  level_10: Crown,
  campus_start: GraduationCap,
  campus_champion: GraduationCap,
  workplace_start: Briefcase,
  workplace_pro: Briefcase,
  social_start: Users,
  leadership_start: Rocket,
  leadership_master: Rocket,
  speaking_time: Clock,
};

export const AchievementsPage: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [selectedRarity, setSelectedRarity] = useState<Rarity | 'all'>('all');

  useEffect(() => {
    if (token) fetchAchievements();
    else setLoading(false);
  }, [token]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/communication/achievements', token);
      setAchievements(data.achievements || []);
    } catch {
      // Show empty state
    } finally {
      setLoading(false);
    }
  };

  const earned = achievements.filter(a => a.earned).length;
  const total = achievements.length;

  const filtered = achievements.filter(a => {
    if (filter === 'earned' && !a.earned) return false;
    if (filter === 'locked' && a.earned) return false;
    if (selectedRarity !== 'all' && a.rarity !== selectedRarity) return false;
    return true;
  });

  // Group by rarity for display order
  const grouped: Record<Rarity, typeof filtered> = { diamond: [], gold: [], silver: [], bronze: [] };
  filtered.forEach(a => { if (grouped[a.rarity as Rarity]) grouped[a.rarity as Rarity].push(a); });
  const ordered = [...grouped.diamond, ...grouped.gold, ...grouped.silver, ...grouped.bronze];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <CommNav compact backLabel="Home" onBack={() => navigate('/communication')} />
      <div className="max-w-4xl mx-auto px-4 pt-20">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Achievements
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{earned} of {total} unlocked</p>
          </div>
          <button onClick={fetchAchievements} disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-black text-slate-900">{earned}<span className="text-slate-400 text-base font-bold">/{total}</span></p>
              <p className="text-xs text-slate-500 font-semibold">Achievements Unlocked</p>
            </div>
            <div className="flex gap-2">
              {(['bronze', 'silver', 'gold', 'diamond'] as Rarity[]).map(r => {
                const earnedCount = achievements.filter(a => a.earned && a.rarity === r).length;
                const rarityTotal = achievements.filter(a => a.rarity === r).length;
                const R = RARITY[r];
                return (
                  <div key={r} className="text-center">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${R.gradient} flex items-center justify-center text-white text-xs font-black shadow-md`}>
                      {earnedCount}
                    </div>
                    <p className="text-[8px] text-slate-400 mt-0.5 capitalize">{r}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
              style={{ width: `${total > 0 ? (earned / total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(['all', 'earned', 'locked'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all capitalize ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {f === 'all' ? 'All' : f === 'earned' ? '✅ Earned' : '🔒 Locked'}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-auto">
            {(['all', 'bronze', 'silver', 'gold', 'diamond'] as const).map(r => (
              <button key={r} onClick={() => setSelectedRarity(r)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black capitalize transition-all ${selectedRarity === r ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-bold">Loading achievements...</p>
          </div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-base font-black text-slate-500 mb-1">No achievements yet</p>
            <p className="text-xs text-slate-400 mb-5">Complete your first session to start unlocking achievements!</p>
            <Link to="/communication/worlds" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 transition-colors">
              Start First Mission
            </Link>
          </div>
        ) : (
          <>
            {/* Diamond + Gold highlight row */}
            {ordered.filter(a => a.rarity === 'diamond' || a.rarity === 'gold').length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-emerald-500" /> Elite Achievements
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ordered.filter(a => (a.rarity === 'diamond' || a.rarity === 'gold') && (selectedRarity === 'all' || a.rarity === selectedRarity) && (filter === 'all' || (filter === 'earned' && a.earned) || (filter === 'locked' && !a.earned))).map(a => (
                    <AchievementCard key={a.id} achievement={a} featured />
                  ))}
                </div>
              </div>
            )}

            {/* Silver + Bronze grid */}
            {ordered.filter(a => a.rarity === 'silver' || a.rarity === 'bronze').length > 0 && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-slate-400" /> Milestone Achievements
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ordered.filter(a => (a.rarity === 'silver' || a.rarity === 'bronze') && (selectedRarity === 'all' || a.rarity === selectedRarity) && (filter === 'all' || (filter === 'earned' && a.earned) || (filter === 'locked' && !a.earned))).map(a => (
                    <AchievementCard key={a.id} achievement={a} />
                  ))}
                </div>
              </div>
            )}

            {ordered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm font-bold">No achievements match your filters.</p>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-6 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 rounded-3xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-sm font-black mb-0.5">Want more achievements?</p>
            <p className="text-xs text-slate-400">Practice daily, complete missions, and score high to unlock them all.</p>
          </div>
          <Link to="/communication/worlds" className="flex-shrink-0 px-4 py-2.5 bg-white text-emerald-950 font-black text-xs rounded-xl hover:bg-emerald-50 transition-colors">
            Practice Now
          </Link>
        </div>
      </div>
    </div>
  );
};

const AchievementCard: React.FC<{ achievement: any; featured?: boolean }> = ({ achievement: a, featured }) => {
  const R = RARITY[a.rarity as Rarity];
  const Icon = ICON_MAP[a.id] || Trophy;
  const pct = Math.round((a.progress / a.max) * 100);

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${a.earned ? `border-emerald-250 ${R.ring} ring-2` : 'border-slate-100 opacity-60'} ${featured ? 'p-4' : 'p-3'}`}>
      <div className="flex items-start gap-3">
        <div className={`relative flex-shrink-0 ${featured ? 'w-12 h-12' : 'w-10 h-10'} rounded-xl bg-gradient-to-br ${a.earned ? R.gradient : 'from-slate-300 to-slate-400'} flex items-center justify-center shadow-md`}>
          {a.earned ? (
            <span className={featured ? 'text-2xl' : 'text-xl'}>{a.icon}</span>
          ) : (
            <Lock className={`${featured ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <p className={`font-black text-slate-900 ${featured ? 'text-sm' : 'text-xs'} truncate`}>{a.label}</p>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border capitalize ${R.badgeBg}`}>{R.label}</span>
          </div>
          <p className={`text-slate-400 font-medium ${featured ? 'text-xs' : 'text-[10px]'} leading-snug mb-2`}>{a.desc}</p>

          {/* Progress */}
          {!a.earned && a.max > 1 && (
            <div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-0.5">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                  style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-slate-400">{a.progress}/{a.max}</p>
            </div>
          )}
          {a.earned && (
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black">
              <CheckCircle className="w-3 h-3" /> Earned!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
