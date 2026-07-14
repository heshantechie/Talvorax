import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, Headphones, BookOpen,
  Shield, Zap, Clock, ChevronRight, Bot, Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CommNav } from './CommNav';
import { apiCall } from '../../lib/communicationApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOOLS = [
  {
    id: 'speech',
    title: 'Speech Analyzer',
    desc: 'Record any speech and get a detailed AI breakdown of grammar, fluency, vocabulary, confidence, and pronunciation.',
    longDesc: 'Choose from 5 practice scripts or enter your own text. Record, analyze, then retry to see your improvement in real-time.',
    icon: Activity,
    emoji: '🎙️',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    iconColor: 'text-emerald-600',
    path: '/communication/pronunciation',
    skills: ['Grammar', 'Fluency', 'Vocabulary', 'Confidence', 'Pronunciation'],
    xp: 50, time: '5 min',
    improvesSkill: 'fluency',
  },
  {
    id: 'filler',
    title: 'Filler Word Coach',
    desc: 'Detect every "um", "uh", "like", and "basically" in your speech. Real-time highlighting with a detailed filler report.',
    longDesc: 'Speak freely for 30-90 seconds and watch your transcript get highlighted with filler words in real-time. See your fluency score and AI tips.',
    icon: AlertTriangle,
    emoji: '🧹',
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    iconColor: 'text-green-600',
    path: '/communication/filler-words',
    skills: ['Filler awareness', 'Fluency', 'Speaking confidence'],
    xp: 30, time: '3 min',
    improvesSkill: 'fluency',
  },
  {
    id: 'clarity',
    title: 'Voice Clarity Coach',
    desc: 'See live gauges for voice clarity, speaking pace, and volume while you speak. Get AI coaching to improve delivery.',
    longDesc: 'Real-time animated clarity/pace/volume meters while speaking. Calculates WPM, filler count, and generates personalized coaching tips.',
    icon: Headphones,
    emoji: '🎧',
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    iconColor: 'text-teal-600',
    path: '/communication/voice-analysis',
    skills: ['Voice clarity', 'Pace control', 'Volume', 'Articulation'],
    xp: 50, time: '5 min',
    improvesSkill: 'tone',
  },
  {
    id: 'pronunciation',
    title: 'Pronunciation Coach',
    desc: 'Listen to the AI model pronunciation, then record your attempt. Practice 5 phrases per session with comparison scoring.',
    longDesc: 'Works on commonly mispronounced words, professional phrases, and tongue twisters. AI speaks first, you repeat, AI compares and scores.',
    icon: BookOpen,
    emoji: '📖',
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    iconColor: 'text-emerald-600',
    path: '/communication/pronunciation-coach',
    skills: ['Pronunciation', 'Articulation', 'Word stress', 'Clarity'],
    xp: 40, time: '4 min',
    improvesSkill: 'pronunciation',
  },
  {
    id: 'confidence',
    title: 'Confidence Builder',
    desc: 'Answer surprise questions under time pressure. 5 questions per session. Get a composite confidence score with coaching.',
    longDesc: 'AI asks random questions (opinion, story, debate, explanation). You have 3 seconds to prepare, then record your response. Measures hesitation, filler ratio, and content quality.',
    icon: Shield,
    emoji: '💪',
    gradient: 'from-green-600 to-teal-700',
    bg: 'bg-green-50',
    border: 'border-green-100',
    iconColor: 'text-green-600',
    path: '/communication/confidence',
    skills: ['Confidence', 'Impromptu speaking', 'Response quality', 'Composure'],
    xp: 60, time: '8 min',
    improvesSkill: 'confidence',
  },
];

export const StudioHub: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;
  const [weakest, setWeakest] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiCall('/api/communication/user-stats', token)
      .then(d => { if (d.weakest) setWeakest(d.weakest); })
      .catch(() => {});
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <CommNav compact backLabel="Home" onBack={() => navigate('/communication')} />

      <div className="max-w-4xl mx-auto px-4 pt-20 space-y-4">
        {/* Intro */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 rounded-3xl p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-xl flex-shrink-0">🎯</div>
            <div>
              <p className="text-base font-black mb-1">Practice Studio</p>
              <p className="text-xs text-emerald-300/70 leading-relaxed">
                Unlike conversation practice, Studio tools focus on one specific skill at a time. Use them to target weaknesses identified by your AI coach and build mastery before your next mission.
              </p>
              {weakest && (
                <div className="mt-2 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-1.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-emerald-300">
                    AI Recommendation: Your weakest skill is <span className="capitalize font-black text-white">{weakest}</span>. Start with the recommended tool below.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tool Cards */}
        {TOOLS.map(tool => {
          const isRecommended = weakest === tool.improvesSkill;
          return (
            <Link key={tool.id} to={tool.path}
              className={`block bg-white border ${isRecommended ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'} rounded-3xl overflow-hidden shadow-sm comm-tool-card group`}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-3xl shadow-md flex-shrink-0`}>
                    {tool.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-black text-slate-900">{tool.title}</h3>
                      {isRecommended && (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" /> AI Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">{tool.desc}</p>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock className="w-3 h-3" /> {tool.time}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <Zap className="w-3 h-3" /> +{tool.xp} XP
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tool.skills.map(s => (
                        <span key={s} className={`text-[10px] font-bold ${tool.bg} ${tool.iconColor} border ${tool.border} px-2 py-0.5 rounded-full`}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors flex-shrink-0 mt-1" />
                </div>

                <div className={`mt-4 pt-4 border-t border-slate-100`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed italic">{tool.longDesc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
