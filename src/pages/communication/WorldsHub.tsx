import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, CheckCircle, ChevronRight,
  Zap, Target, Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CommNav } from './CommNav';
import { apiCall } from '../../lib/communicationApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

import { WORLDS_DATA as worldsConfigMap } from './worldsConfig';

const WORLDS_DATA = Object.values(worldsConfigMap).map(w => {
  const diffs = w.missions.map(m => m.difficulty);
  const distinctDiffs = [...new Set(diffs)];
  const difficultyRange = distinctDiffs.length > 1 ? `${distinctDiffs[0]} → ${distinctDiffs[distinctDiffs.length - 1]}` : distinctDiffs[0] || 'Beginner';

  const characters = [...new Set(w.missions.map(m => m.character.avatar))].slice(0, 3);

  const tags: Record<string, { tag: string; tagColor: string }> = {
    campus: { tag: 'Most Popular', tagColor: 'bg-emerald-100 text-emerald-800' },
    workplace: { tag: 'Career Booster', tagColor: 'bg-teal-100 text-teal-800' },
    social: { tag: 'Social Skills', tagColor: 'bg-green-100 text-green-800' },
    leadership: { tag: 'High Impact', tagColor: 'bg-emerald-100 text-emerald-800' },
  };
  const tagInfo = tags[w.id] || { tag: 'New', tagColor: 'bg-slate-100 text-slate-700' };

  return {
    id: w.id,
    title: w.title,
    emoji: w.emoji,
    number: w.worldNumber,
    subtitle: w.subtitle,
    gradient: w.gradient,
    glow: w.glow,
    totalMissions: w.missions.length,
    totalXP: w.missions.reduce((acc, m) => acc + m.xp, 0),
    path: w.returnPath,
    characters,
    difficulty: difficultyRange,
    tag: tagInfo.tag,
    tagColor: tagInfo.tagColor,
    unlocked: true,
    missions: w.missions.map(m => m.title),
  };
});

export const WorldsHub: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token || null;
  const navigate = useNavigate();
  const [worldCompletion, setWorldCompletion] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!token) return;
    apiCall('/api/communication/user-stats', token)
      .then(d => { if (d.worldCompletion) setWorldCompletion(d.worldCompletion); })
      .catch(() => {});
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <CommNav compact backLabel="Home" onBack={() => navigate('/communication')} />

      <div className="max-w-4xl mx-auto px-4 pt-20 space-y-5">
        {/* Intro */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 rounded-3xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-xl">🗺️</div>
            <div>
              <p className="text-base font-black">Learning Worlds</p>
              <p className="text-xs text-emerald-300/70">4 worlds · 23 missions · Dynamic AI conversations</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Each world is a unique environment with real-life scenarios. AI characters respond dynamically to your every reply — no two sessions are ever the same.
          </p>
        </div>

        {/* World Cards */}
        {WORLDS_DATA.map((world) => {
          const done = worldCompletion[world.id] || 0;
          const pct = Math.round((done / world.totalMissions) * 100);
          const isComplete = done >= world.totalMissions;

          return (
            <div key={world.id}
              onClick={() => navigate(world.path)}
              className="comm-world-card bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm cursor-pointer hover:border-emerald-300">
              {/* World gradient header */}
              <div className={`bg-gradient-to-br ${world.gradient} p-5 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg">
                      {world.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="text-lg font-black text-white">{world.title}</h2>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${world.tagColor}`}>{world.tag}</span>
                      </div>
                      <p className="text-white/70 text-xs font-medium max-w-xs">{world.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="bg-white/20 rounded-xl px-2.5 py-1.5 text-center">
                      <p className="text-lg font-black text-white">{world.number}</p>
                      <p className="text-[10px] text-white/70">World</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar in header */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-white/70 font-bold mb-1.5">
                    <span>{done}/{world.totalMissions} missions</span>
                    <span>{pct}% complete</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                    <Target className="w-3.5 h-3.5" /> {world.totalMissions} missions
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                    <Zap className="w-3.5 h-3.5" /> {world.totalXP} total XP
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                    <Star className="w-3.5 h-3.5" /> {world.difficulty}
                  </div>
                  {isComplete && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-black">
                      <CheckCircle className="w-3.5 h-3.5" /> Complete!
                    </div>
                  )}
                </div>

                {/* Mission list preview */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {world.missions.map((m, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-[10px] font-semibold ${i < done ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {i < done
                        ? <CheckCircle className="w-3 h-3 flex-shrink-0" />
                        : <div className="w-3 h-3 rounded-full border border-slate-200 flex-shrink-0" />}
                      {m}
                    </div>
                  ))}
                </div>

                {/* Characters */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Characters:</span>
                    <div className="flex -space-x-1 ml-1">
                      {world.characters.map((c, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs">{c}</div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(world.path)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm bg-gradient-to-r ${world.gradient} text-white hover:opacity-90 hover:shadow-md active:scale-95`}>
                    {done > 0 ? 'Continue' : 'Start'} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Tip */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">💡</div>
          <div>
            <p className="text-xs font-black text-slate-700 mb-0.5">Pro Tip</p>
            <p className="text-xs text-slate-500 leading-relaxed">Complete worlds in order for the best learning progression. Campus builds foundational skills, Workplace applies them professionally, Social makes them natural, and Leadership takes you to mastery.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
