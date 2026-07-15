import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { WorldConfig, MissionDef } from './worldsConfig';
import {
  ChevronLeft, PlayCircle, CheckCircle, Star,
  Zap, Clock, Target, Trophy, Bot, Sparkles
} from 'lucide-react';
import { CommNav } from './CommNav';
// ─── Difficulty config ────────────────────────────────────────────────────────
const DIFF: Record<string, { badge: string; dot: string; ring: string }> = {
  'Beginner':     { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  'Intermediate': { badge: 'bg-teal-100 text-teal-700',      dot: 'bg-teal-500',     ring: 'ring-teal-200' },
  'Advanced':     { badge: 'bg-green-100 text-green-800',    dot: 'bg-green-600',    ring: 'ring-green-200' },
};

import { apiCall } from '../../lib/communicationApi';

// ─── RefreshIcon ──────────────────────────────────────────────────────────────
const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── WorldPage ────────────────────────────────────────────────────────────────
export const WorldPage: React.FC<{ config: WorldConfig }> = ({ config }) => {
  const { session, user: authUser } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set());
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  useEffect(() => { setToken(session?.access_token || null); }, [session]);
  useEffect(() => { if (token) fetchHistory(); }, [token]);

  const fetchHistory = async () => {
    try {
      const d = await apiCall('GET', '/api/communication/sessions', token);
      const sessions: any[] = d.sessions || [];
      setSessionHistory(sessions);
      setCompletedMissions(new Set(
        sessions.filter(s => s.status === 'completed' && s.world_id === config.id).map(s => s.mission_id)
      ));
    } catch { /* silent */ }
  };

  const handleStartMission = (mission: MissionDef) => {
    if (!authUser) { navigate('/login'); return; }
    navigate('/communication/conversation', {
      state: {
        missionId: mission.id,
        worldId: config.id,
        missionTitle: mission.title,
        returnPath: config.returnPath,
      }
    });
  };

  const totalXP = config.missions.filter(m => completedMissions.has(m.id)).reduce((a, m) => a + m.xp, 0);
  const completedCount = completedMissions.size;
  const progressPct = Math.round((completedCount / config.missions.length) * 100);
  const maxXP = config.missions.reduce((a, m) => a + m.xp, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <CommNav compact backLabel="Communication" onBack={() => navigate('/communication')} />

      {/* ── Cinematic Hero ── */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${config.gradient} pt-20 pb-24`}>
        {/* background pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        {/* glow orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-20 -translate-x-20" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="mb-8" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-4xl ring-2 ring-white/20 shadow-xl"
                  style={{ animation: 'float 3s ease-in-out infinite' }}>
                  {config.emoji}
                </div>
                <div>
                  <p className="text-white/50 text-xs font-black uppercase tracking-widest">World {config.worldNumber}</p>
                  <h1 className="text-4xl font-black text-white">{config.title}</h1>
                </div>
              </div>
              <p className="text-white/70 font-medium max-w-xl leading-relaxed mb-4">{config.subtitle}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-white/70 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl">
                  <Target className="w-3.5 h-3.5" />{config.missions.length} Missions
                </span>
                <span className="flex items-center gap-1.5 text-white/70 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl">
                  <Zap className="w-3.5 h-3.5 text-white/80" />Up to {maxXP.toLocaleString()} XP
                </span>
              </div>
            </div>

            {/* Progress card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full md:w-64 flex-shrink-0 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/60 text-xs font-black uppercase tracking-wider">Progress</p>
                <span className="text-white font-black text-xl">{progressPct}%</span>
              </div>
              <div className="h-2.5 bg-white/15 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-emerald-300 to-teal-400 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-white/50 text-xs font-bold mb-4">{completedCount}/{config.missions.length} completed · {totalXP} XP earned</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-white font-black text-xl">{completedCount}</p>
                  <p className="text-white/40 text-[10px] font-bold">Done</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-emerald-200 font-black text-xl">{totalXP}</p>
                  <p className="text-white/40 text-[10px] font-bold">XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 mt-6 pb-24">
        {/* AI Coach tip */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-lg p-5 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 mb-0.5">🤖 AI Coach</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">{config.coachTip}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-700 text-sm font-semibold">⚠️ {error}</div>
        )}

        {/* ── Mission Panels ── */}
        <div className="space-y-5">
          {config.missions.map((mission) => {
            const isDone = completedMissions.has(mission.id);
            const isLoading = loading === mission.id;
            const d = DIFF[mission.difficulty];
            const lastSession = sessionHistory.find(s => s.mission_id === mission.id && s.status === 'completed');

            return (
              <div
                key={mission.id}
                className={`comm-mission-card group relative overflow-hidden bg-white rounded-3xl border transition-all duration-300 ${
                  isDone
                    ? 'border-emerald-200/80 shadow-sm hover:shadow-md'
                    : 'border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-emerald-500/25'
                }`}
              >
                {/* Top gradient stripe */}
                <div className={`h-1.5 bg-gradient-to-r ${mission.gradient} ${isDone ? 'opacity-40' : ''}`} />

                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
                    <div className="flex items-start gap-5 flex-1 min-w-0">
                      {/* Character avatar — large premium display */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                        <div className={`w-[72px] h-[72px] rounded-2.5xl flex items-center justify-center text-3xl ring-2 shadow-md transition-all duration-300 ${mission.character.bg} ${mission.character.ring} ${isDone ? 'opacity-65' : 'group-hover:scale-105 group-hover:shadow-lg'}`}>
                          {mission.character.avatar}
                        </div>
                        <span className={`text-[10px] font-black text-center max-w-[72px] leading-tight ${mission.character.text}`}>
                          {mission.character.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium text-center max-w-[72px] leading-tight">
                          {mission.character.role}
                        </span>
                      </div>

                      {/* Mission info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mission {mission.num}</span>
                            {isDone && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            {isDone && lastSession?.overall_score && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                <Star className="w-3 h-3 text-emerald-600 fill-emerald-500" />
                                <span className="text-xs font-black text-emerald-700">{lastSession.overall_score}/100</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className={`font-black text-base sm:text-lg mb-1 ${isDone ? 'text-slate-500' : 'text-slate-900'}`}>
                          {mission.title}
                        </h3>

                        <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed mb-3 max-w-xl">
                          {mission.desc}
                        </p>

                        {/* Skills */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
                          {mission.skills.map(skill => (
                            <span key={skill} className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full border border-slate-100">
                              {skill}
                            </span>
                          ))}
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${d.badge}`}>
                            <span className={`inline-block w-1 h-1 rounded-full ${d.dot} mr-1`} />
                            {mission.difficulty}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />{mission.duration}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1">
                            <Zap className="w-3 h-3" />+{mission.xp} XP
                          </span>
                          {isDone && lastSession?.xp_earned && (
                            <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />Earned {lastSession.xp_earned} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-0 flex sm:block justify-end">
                      {isDone ? (
                        <button
                          onClick={() => handleStartMission(mission)}
                          disabled={isLoading}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-sm font-black rounded-2xl transition-all border border-slate-200 hover:border-emerald-200 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : <RefreshIcon className="w-4 h-4" />}
                          Retry
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartMission(mission)}
                          disabled={isLoading}
                          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${mission.gradient} text-white font-black rounded-2xl shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none min-w-[120px] text-sm`}
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4" />
                              Start Mission
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Champion teaser */}
        {completedCount >= config.championThreshold && (
          <div className="mt-8 relative overflow-hidden rounded-3xl p-6 shadow-xl comm-reveal-up"
            style={{ background: completedCount >= config.missions.length
              ? 'linear-gradient(135deg, #059669, #047857)'
              : 'linear-gradient(135deg, #10b981, #0d9488)' }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">
                  {completedCount >= config.missions.length ? '🏆 Achievement Unlocked' : '🌟 Great Progress!'}
                </p>
                <p className="text-white font-black text-xl">
                  {completedCount >= config.missions.length
                    ? `${config.championLabel} Achieved!`
                    : `${config.championLabel} in Progress`}
                </p>
                <p className="text-white/60 text-sm font-medium mt-0.5">
                  {completedCount >= config.missions.length
                    ? 'You have mastered this world! 🎉'
                    : `${completedCount}/${config.missions.length} missions — complete all to earn the badge!`}
                </p>
              </div>
              {completedCount >= config.missions.length
                ? <Trophy className="w-14 h-14 text-white/80 flex-shrink-0" />
                : <Sparkles className="w-12 h-12 text-white/60 flex-shrink-0" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
