import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  Mic, Square, Trophy, Zap,
  CheckCircle, Clock, Star, ArrowRight, Flame, Target, Sparkles, Bot
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SpeechService } from '../../../services/speechService';
import { Waveform } from './components/Waveform';
import { apiCall } from '../../lib/communicationApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Seeded by day of week (0=Sun, 1=Mon, ...)
const DAY_CHALLENGES: Record<number, { type: string; emoji: string; title: string; instructions: string; prompt: string; duration: number; xp: number; gradient: string }> = {
  0: { // Sunday
    type: '30_second_speech',
    emoji: '⏱️',
    title: '30 Second Speech',
    instructions: 'Speak on the given topic for exactly 30 seconds. Don\'t stop early and don\'t go too much over.',
    prompt: 'The topic is: "The one skill that will matter most in the next 10 years." Ready? Go!',
    duration: 30,
    xp: 60,
    gradient: 'from-emerald-500 to-teal-600',
  },
  1: { // Monday
    type: 'opinion_challenge',
    emoji: '💬',
    title: 'Opinion Challenge',
    instructions: 'Give your honest opinion on the topic below. Support it with at least 2 reasons. Be confident and direct.',
    prompt: '"Remote work should be the default mode for all knowledge workers." Give your opinion and back it up.',
    duration: 45,
    xp: 50,
    gradient: 'from-green-500 to-emerald-600',
  },
  2: { // Tuesday
    type: 'explain_concept',
    emoji: '💡',
    title: 'Explain a Concept',
    instructions: 'Explain the concept below as simply as possible, as if talking to a smart 12-year-old.',
    prompt: 'Explain how "compound interest" works and why it matters for someone starting their career.',
    duration: 60,
    xp: 55,
    gradient: 'from-teal-500 to-cyan-600',
  },
  3: { // Wednesday
    type: 'debate_challenge',
    emoji: '🥊',
    title: 'Debate Challenge',
    instructions: 'Argue FOR the given position, even if you personally disagree. Make the strongest possible case.',
    prompt: 'Argue for: "Failure is more valuable than success as a teacher. The best lessons only come from things going wrong."',
    duration: 60,
    xp: 70,
    gradient: 'from-emerald-600 to-green-600',
  },
  4: { // Thursday
    type: 'impromptu',
    emoji: '🎯',
    title: 'Impromptu Speaking',
    instructions: 'You have 5 seconds to read the topic, then speak immediately. No long pauses allowed!',
    prompt: '"If you could change one thing about how education works, what would it be and why?"',
    duration: 45,
    xp: 65,
    gradient: 'from-green-600 to-teal-700',
  },
  5: { // Friday
    type: 'story_completion',
    emoji: '📖',
    title: 'Story Completion',
    instructions: 'Continue the story opening below and give it a satisfying ending. Use vivid language.',
    prompt: 'Continue this: "The email arrived at 11:58 PM. Subject line: \'We need to talk — urgent\'. I stared at it for what felt like an hour..."',
    duration: 60,
    xp: 50,
    gradient: 'from-teal-600 to-emerald-700',
  },
  6: { // Saturday
    type: 'picture_description',
    emoji: '🖼️',
    title: 'Scene Description',
    instructions: 'Describe the scene below as vividly and in as much detail as possible. Imagine what\'s happening, who\'s there, and what it means.',
    prompt: 'Describe this scene: A small café at dawn. One person sits alone at a corner table with a laptop, a cold cup of coffee, and crumpled notes. The windows are fogged. Outside, it\'s raining.',
    duration: 45,
    xp: 55,
    gradient: 'from-emerald-700 to-green-700',
  },
};

type Step = 'loading' | 'intro' | 'countdown' | 'recording' | 'analyzing' | 'result';

export const DailyChallenge: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const today = new Date();
  const dayOfWeek = today.getDay();
  const dateKey = today.toISOString().split('T')[0];

  // AI-generated or fallback challenge
  const [challenge, setChallenge] = useState<{ type: string; emoji: string; title: string; instructions: string; prompt: string; duration: number; xp: number; gradient: string }>(DAY_CHALLENGES[dayOfWeek]);
  const [aiLoaded, setAiLoaded] = useState(false);

  const [step, setStep] = useState<Step>('loading');
  const [countdown, setCountdown] = useState(5);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const speechRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  useEffect(() => {
    speechRef.current = new SpeechService();
    const done = localStorage.getItem(`daily_challenge_${dateKey}`);
    if (done) setAlreadyCompleted(true);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      speechRef.current?.stopRecording().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (token) {
      fetchAIChallenge();
    }
  }, [token]);

  const fetchAIChallenge = async () => {
    if (!token) { setStep('intro'); return; }
    try {
      const data = await apiCall('POST', '/api/communication/generate-prompt', token, { tool: 'daily_challenge', difficulty: 'intermediate' });
      if (data.prompt?.prompt && data.prompt?.title) {
        const p = data.prompt;
        setChallenge(prev => ({
          ...prev,
          title: p.title || prev.title,
          prompt: p.prompt || prev.prompt,
          instructions: p.instructions || prev.instructions,
          emoji: p.emoji || prev.emoji,
          xp: p.xp || prev.xp,
        }));
        setAiLoaded(true);
      }
      setStep('intro');
    } catch {
      // Keep static default and go to intro
      setStep('intro');
    }
  };

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const startChallenge = () => {
    setStep('countdown');
    let c = challenge.type === 'impromptu' ? 5 : 3;
    setCountdown(c);
    countdownRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current);
        beginRecording();
      }
    }, 1000);
  };

  const beginRecording = async () => {
    if (!speechRef.current) return;
    setStep('recording');
    setRecordingSecs(0);
    timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    try {
      await speechRef.current.startRecording(
        (interim: string) => setTranscript(interim),
        () => {} // language warning callback
      );
    } catch {}
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    let text = transcript;
    try {
      const r = await speechRef.current!.stopRecording();
      if (r && r.length > text.length) text = r;
    } catch {}
    setTranscript(text);

    const isValid = text && text.trim().length >= 5 && recordingSecs >= 1.5 && /[a-zA-Z]/.test(text);
    if (!isValid) {
      setError("Looks like I didn't hear your response. Please try again.");
      setStep('intro');
      return;
    }

    setError(null);
    await submitChallenge(text);
  };

  const submitChallenge = async (text: string) => {
    setStep('analyzing');
    try {
      const data = await apiCall('POST', '/api/communication/daily-challenge/complete', token, {
        challenge_type: challenge.title,
        transcript: text,
        xp_earned: challenge.xp,
        date_key: dateKey,
      });
      setResult({ ...data, transcript: text });
      localStorage.setItem(`daily_challenge_${dateKey}`, 'true');
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
      setStep('intro');
    }
  };

  const timeLeft = Math.max(0, challenge.duration - recordingSecs);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <CommNav compact backLabel="Home" onBack={() => navigate('/communication')} />
      <div className="max-w-2xl mx-auto px-4 pt-20">
        <div className="mb-5 flex items-center justify-between pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-500" /> Daily Challenge
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
              {DAY_NAMES[dayOfWeek]} · +{challenge.xp} XP reward
              {aiLoaded && <span className="text-emerald-600 font-black flex items-center gap-0.5 ml-1"><Sparkles className="w-3 h-3" /> AI-powered</span>}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${challenge.gradient} flex items-center justify-center text-2xl shadow-lg`}>
            {challenge.emoji}
          </div>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700 font-semibold">{error}</div>}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-3xl mb-4 animate-pulse">⏳</div>
            <p className="text-lg font-black text-slate-800">Generating Today's Challenge...</p>
            <p className="text-sm text-slate-400 mt-1">AI is crafting a unique challenge just for you</p>
          </div>
        )}

        {/* ── Intro ── */}
        {step === 'intro' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Challenge Hero */}
            <div className={`bg-gradient-to-br ${challenge.gradient} rounded-3xl p-6 text-white shadow-xl`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-black text-white/60 uppercase tracking-wider mb-1">Today's Challenge</p>
                  <h2 className="text-2xl font-black">{challenge.emoji} {challenge.title}</h2>
                </div>
                <div className="text-right space-y-1.5">
                  <div className="bg-white/20 rounded-xl px-3 py-1.5">
                    <p className="text-lg font-black">+{challenge.xp}</p>
                    <p className="text-[10px] text-white/70">XP</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 mb-4">
                <p className="text-sm font-bold text-white/90 leading-relaxed">📋 {challenge.instructions}</p>
              </div>

              <div className="bg-white/20 rounded-2xl p-4">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-1.5">Your Prompt</p>
                <p className="text-sm font-bold text-white leading-relaxed">"{challenge.prompt}"</p>
              </div>
            </div>

            {/* Info row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Clock className="w-4 h-4" />, label: 'Duration', value: `${challenge.duration}s` },
                { icon: <Zap className="w-4 h-4" />, label: 'Reward', value: `+${challenge.xp} XP` },
                { icon: <Star className="w-4 h-4" />, label: 'Resets', value: 'Tomorrow' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm">
                  <div className="text-slate-400 flex justify-center mb-1">{s.icon}</div>
                  <p className="text-sm font-black text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {alreadyCompleted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-emerald-800">Already completed today!</p>
                  <p className="text-xs text-emerald-600 font-semibold">Come back tomorrow for a new challenge. Keep your streak alive! 🔥</p>
                </div>
              </div>
            ) : (
              <button onClick={startChallenge}
                className={`w-full py-4 bg-gradient-to-r ${challenge.gradient} text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2`}>
                <Target className="w-5 h-5" /> Accept Challenge
              </button>
            )}

            {/* Other challenges teaser */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4">
              <p className="text-xs font-black text-slate-500 mb-2">This Week's Challenges</p>
              <div className="space-y-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map(d => {
                  const c = DAY_CHALLENGES[d];
                  const isToday = d === dayOfWeek;
                  return (
                    <div key={d} className={`flex items-center gap-2 text-xs ${isToday ? 'text-slate-900 font-black' : 'text-slate-400 font-semibold'}`}>
                      <span>{c.emoji}</span>
                      <span>{DAY_NAMES[d]}:</span>
                      <span>{c.title}</span>
                      {isToday && <span className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">TODAY</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Countdown ── */}
        {step === 'countdown' && (
          <div className="flex flex-col items-center justify-center py-24 text-center comm-fade-scale">
            <p className="text-xs font-black text-slate-400 mb-8 uppercase tracking-widest">
              {challenge.type === 'impromptu' ? '⚡ Read your topic — begin immediately!' : '🎯 Get ready to speak…'}
            </p>
            <div className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${challenge.gradient} flex items-center justify-center shadow-2xl ring-8 ring-white mb-6`}>
              <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
              <span className="text-7xl font-black text-white relative z-10">{countdown}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Your Prompt</p>
              <p className="text-sm font-bold text-slate-800 leading-relaxed">"{challenge.prompt}"</p>
            </div>
          </div>
        )}

        {/* ── Recording ── */}
        {step === 'recording' && (
          <div className="space-y-4 comm-slide-up">
            {/* Status bar */}
            <div className={`rounded-2xl p-4 bg-gradient-to-r ${challenge.gradient} text-white`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  <span className="text-sm font-black">Recording…</span>
                </div>
                <span className={`font-mono text-lg font-black ${timeLeft <= 5 ? 'text-red-200' : 'text-white'}`}>{timeLeft}s</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/80 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(0, (timeLeft / challenge.duration) * 100)}%` }} />
              </div>
            </div>

            {/* Prompt + live transcript */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm min-h-[180px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{challenge.title} — Your Prompt</p>
              <p className="text-sm text-slate-500 italic mb-3 leading-relaxed">"{challenge.prompt}"</p>
              <div className="border-t border-slate-100 pt-3">
                <Waveform active={true} />
                {transcript && (
                  <p className="text-sm text-slate-700 leading-relaxed mt-2 italic">{transcript}</p>
                )}
              </div>
            </div>

            <button onClick={stopRecording}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <Square className="w-5 h-5" /> Finish & Submit
            </button>
          </div>
        )}

        {/* ── Analyzing ── */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${challenge.gradient} opacity-20 rounded-full blur-3xl animate-pulse`} />
              <div className="relative text-5xl mb-4">{challenge.emoji}</div>
            </div>
            <p className="text-xl font-black text-slate-900">Evaluating your response...</p>
            <p className="text-sm text-slate-400 font-semibold mt-1">AI coach is generating your feedback</p>
          </div>
        )}

        {/* ── Result ── */}
        {step === 'result' && result && (
          <div className="space-y-5 comm-reveal-up">
            {/* Celebration Hero */}
            <div className={`relative overflow-hidden rounded-3xl p-6 text-white text-center shadow-xl bg-gradient-to-br ${challenge.gradient}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-5xl mb-3 comm-bounce-in inline-block">🏆</div>
                <h2 className="text-2xl font-black mb-1">Challenge Complete!</h2>
                <p className="text-white/70 text-xs font-medium mb-4">{challenge.title} · {DAY_NAMES[dayOfWeek]}</p>
                <div className="flex items-center justify-center gap-6">
                  <div className="comm-score-reveal">
                    <p className="text-5xl font-black">{result.score || result.analysis?.overall_score || 72}</p>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide mt-1">Score</p>
                  </div>
                  <div className="w-px h-14 bg-white/20" />
                  <div className="comm-score-reveal-delay">
                    <p className="text-5xl font-black text-amber-300">+{challenge.xp}</p>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide mt-1">XP Earned</p>
                  </div>
                </div>
              </div>
            </div>

            {result.analysis?.strengths?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3">✅ Strengths</p>
                <ul className="space-y-1.5">
                  {result.analysis.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.analysis?.suggestions?.length > 0 && (
              <div className="bg-slate-900 rounded-3xl p-5 text-white">
                <p className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">💡 AI Coaching Tips</p>
                <ul className="space-y-1.5">
                  {result.analysis.suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300 font-semibold">
                      <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl flex-shrink-0">🔥</div>
              <div>
                <p className="text-xs font-black text-emerald-950">Streak Maintained!</p>
                <p className="text-xs text-emerald-700 font-medium">Come back tomorrow for a fresh challenge.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep('intro'); }} className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors">
                View Challenge
              </button>
              <Link to="/communication" className="flex-1 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                <ArrowRight className="w-4 h-4" /> Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
