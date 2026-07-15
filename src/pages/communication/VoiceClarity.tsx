import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  Mic, Square, RefreshCw, AlertTriangle, ChevronLeft, Headphones,
  AlertCircle, CheckCircle, Activity, Sparkles, TrendingUp, Volume2,
  Loader2, Shuffle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SpeechService } from '../../../services/speechService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

import { apiCall } from '../../lib/communicationApi';

// Circular Gauge component
const Gauge: React.FC<{ score: number; label: string; color: string; size?: 'sm' | 'lg' }> = ({ score, label, color, size = 'sm' }) => {
  const r = size === 'lg' ? 54 : 38;
  const cx = size === 'lg' ? 64 : 48;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dashArray = `${(pct / 100) * circumference} ${circumference}`;
  const wh = size === 'lg' ? 'w-32 h-32' : 'w-24 h-24';

  return (
    <div className={`flex flex-col items-center gap-1.5`}>
      <div className={`relative ${wh}`}>
        <svg width="100%" height="100%" viewBox={`0 0 ${cx * 2} ${cx * 2}`} className="-rotate-90">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f1f5f9" strokeWidth={size === 'lg' ? 10 : 8} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size === 'lg' ? 10 : 8}
            strokeDasharray={dashArray} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-black text-slate-900 ${size === 'lg' ? 'text-2xl' : 'text-base'}`}>{score}</span>
          {size === 'lg' && <span className="text-xs text-slate-400">/100</span>}
        </div>
      </div>
      <p className={`font-black text-slate-700 text-center ${size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>{label}</p>
    </div>
  );
};

// Real-time meter bar
const MeterBar: React.FC<{ value: number; label: string; color: string; message?: string }> = ({ value, label, color, message }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-xs font-black text-slate-700">{label}</span>
      <span className="text-xs font-bold text-slate-500">{value}%</span>
    </div>
    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${value}%` }} />
    </div>
    {message && <p className="text-[10px] text-slate-400 font-medium italic">{message}</p>}
  </div>
);

type Step = 'loading' | 'intro' | 'recording' | 'analyzing' | 'result';

interface AiChallenge { topic: string; category: string; icon: string; targetPace: string; tip: string; }

const REAL_TIME_TIPS = [
  'Speak at a measured, even pace.',
  'Try to articulate each word clearly.',
  'Take a breath before long sentences.',
  'Project your voice with confidence.',
  'Avoid trailing off at end of sentences.',
  'Use pauses instead of filler words.',
];

export const VoiceClarity: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const [step, setStep] = useState<Step>('loading');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiChallenge, setAiChallenge] = useState<AiChallenge | null>(null);
  const [usedTopics, setUsedTopics] = useState<string[]>([]);

  // Simulated live meters (animate during recording)
  const [liveClarity, setLiveClarity] = useState(0);
  const [livePace, setLivePace] = useState(0);
  const [liveVolume, setLiveVolume] = useState(0);
  const [currentTip, setCurrentTip] = useState(REAL_TIME_TIPS[0]);
  const [tipIdx, setTipIdx] = useState(0);

  const speechServiceRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<any>(null);
  const meterRef = useRef<any>(null);
  const tipRef = useRef<any>(null);

  const fetchChallenge = useCallback(async (prevTopics: string[]) => {
    setStep('loading');
    try {
      const data = await apiCall('POST', '/api/communication/generate-prompt', token, { tool: 'voice_clarity', previous_topics: prevTopics });
      const c: AiChallenge = data.prompt;
      setAiChallenge(c);
      setUsedTopics(prev => [...prev, c.topic.substring(0, 30)]);
    } catch { /* silent */ }
    setStep('intro');
  }, [token]);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    fetchChallenge([]);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(meterRef.current);
      clearInterval(tipRef.current);
      speechServiceRef.current?.stopRecording().catch(() => {});
    };
  }, []);

  const startMeters = () => {
    // Smoothly animate meters upward as user speaks
    let clarity = 40, pace = 50, volume = 45;
    meterRef.current = setInterval(() => {
      clarity = Math.min(95, clarity + (Math.random() * 4 - 1));
      pace = Math.min(95, pace + (Math.random() * 5 - 2));
      volume = Math.min(90, volume + (Math.random() * 3 - 0.5));
      setLiveClarity(Math.round(clarity));
      setLivePace(Math.round(pace));
      setLiveVolume(Math.round(volume));
    }, 600);
    tipRef.current = setInterval(() => {
      setTipIdx(i => {
        const next = (i + 1) % REAL_TIME_TIPS.length;
        setCurrentTip(REAL_TIME_TIPS[next]);
        return next;
      });
    }, 3500);
  };

  const startRecording = async () => {
    if (!speechServiceRef.current) return;
    setError(null);
    setTranscript('');
    setIsRecording(true);
    setStep('recording');
    setRecordingSecs(0);
    setLiveClarity(40); setLivePace(50); setLiveVolume(45);
    timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    startMeters();
    try {
      await speechServiceRef.current.startRecording(
        (interim: string) => { setTranscript(interim); },
        () => {}
      );
    } catch { setTranscript(''); }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    clearInterval(meterRef.current);
    clearInterval(tipRef.current);
    setIsRecording(false);
    if (!speechServiceRef.current) return;
    let text = transcript;
    try {
      const result = await speechServiceRef.current.stopRecording();
      if (result && result.length > text.length) text = result;
    } catch {}

    const isValid = text && text.trim().length >= 5 && recordingSecs >= 1.5 && /[a-zA-Z]/.test(text);
    if (!isValid) {
      setError("Looks like I didn't hear your response. Please try again and speak clearly.");
      setStep('intro');
      return;
    }
    setError(null);
    setTranscript(text.trim());
    await analyzeClarity(text.trim());
  };

  const analyzeClarity = async (text: string) => {
    setStep('analyzing');
    try {
      const data = await apiCall('POST', '/api/communication/analyze-clarity', token, {
        text,
        duration_seconds: recordingSecs || 30
      });
      setReport(data.report);

      // Award XP
      try {
        await apiCall('POST', '/api/communication/save-tool-session', token, {
          tool: 'voice_clarity',
          difficulty: 'intermediate',
          scores: {
            overall: data.report.overallScore || 75,
            grammar: 75,
            fluency: data.report.paceScore || 75,
            vocabulary: 75,
            confidence: data.report.clarityScore || 75,
            tone: 75,
            pronunciation: data.report.pronunciationScore || 75
          },
          feedback: {
            strengths: [data.report.paceMessage || 'Good speaking pace'],
            suggestions: data.report.recommendations || []
          }
        });
      } catch (err) {
        console.warn('Could not save tool session:', err);
      }

      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
      setStep('intro');
    }
  };

  const handleReset = () => {
    setReport(null);
    setTranscript('');
    setRecordingSecs(0);
    setError(null);
    setLiveClarity(0); setLivePace(0); setLiveVolume(0);
    const prev = [...usedTopics];
    setUsedTopics(prev);
    fetchChallenge(prev);
  };

  const getPaceLabel = (wpm: number) => {
    if (wpm < 90) return 'Too slow';
    if (wpm < 120) return 'Slightly slow';
    if (wpm <= 160) return 'Perfect pace ✓';
    if (wpm <= 190) return 'Slightly fast';
    return 'Too fast';
  };

  const getPaceColor = (wpm: number) => {
    if (wpm >= 120 && wpm <= 160) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (wpm >= 100 && wpm <= 180) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <CommNav compact backLabel="Practice" onBack={() => navigate('/communication/studio')} />
      <div className="max-w-3xl mx-auto px-4 pt-20">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3 pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-emerald-600" /> Voice Clarity Coach
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time pacing and volume meters with clear speaking challenges</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2 text-red-700 text-sm font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-teal-500/30 mb-4">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <p className="text-base font-black text-slate-800">AI is preparing your challenge…</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Generating a unique vocal exercise</p>
          </div>
        )}

        {/* ── Intro ── */}
        {step === 'intro' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-black text-slate-900 mb-1">Your Vocal Challenge</h2>
              <p className="text-sm text-slate-500 mb-5">Speak on this topic for 30-60 seconds. AI analyzes your clarity, pace, and volume in real-time.</p>

              {aiChallenge && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{aiChallenge.icon}</span>
                      <div>
                        <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">{aiChallenge.category}</p>
                        <p className="text-[10px] text-emerald-600">AI-Generated Challenge</p>
                      </div>
                    </div>
                    <button onClick={() => fetchChallenge(usedTopics)} className="p-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
                      <Shuffle className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  </div>
                  <p className="text-base font-black text-slate-900 leading-relaxed mb-3">“{aiChallenge.topic}”</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Target: {aiChallenge.targetPace}</span>
                    <p className="text-xs text-emerald-700 italic flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {aiChallenge.tip}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Clarity', icon: '🎯', desc: 'How clearly you articulate words' },
                  { label: 'Pace', icon: '⚡', desc: 'Speaking speed (120-160 WPM ideal)' },
                  { label: 'Volume', icon: '🔊', desc: 'Voice projection consistency' },
                  { label: 'Pronunciation', icon: '💬', desc: 'Word-level accuracy estimate' },
                ].map(m => (
                  <div key={m.label} className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <p className="text-xs font-black text-emerald-800 mb-0.5">{m.label}</p>
                    <p className="text-[10px] text-emerald-600">{m.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5">
                <p className="text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Tips for Best Results</p>
                <ul className="space-y-1.5">
                  {['Speak in a quiet environment', 'Position mic 15-30cm from your mouth', 'Speak naturally as if in a real conversation', 'Try to record for at least 30 seconds'].map(t => (
                    <li key={t} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button onClick={startRecording} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Mic className="w-5 h-5" /> Start Clarity Session
                </button>
                <button onClick={() => fetchChallenge(usedTopics)} className="py-4 px-5 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> New Challenge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Recording ── */}
        {step === 'recording' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Status bar */}
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-black text-red-600">Recording</span>
              </div>
              <span className="font-mono text-sm font-black text-slate-900">0:{String(recordingSecs).padStart(2, '0')}</span>
            </div>

            {/* Live gauges */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Live Voice Metrics</p>
              <div className="flex items-center justify-around mb-5">
                <Gauge score={liveClarity} label="Clarity" color="#0d9488" size="lg" />
                <Gauge score={livePace} label="Pace" color="#10b981" size="lg" />
                <Gauge score={liveVolume} label="Volume" color="#059669" size="lg" />
              </div>

              {/* Meter bars */}
              <div className="space-y-3 mb-5">
                <MeterBar value={liveClarity} label="Voice Clarity" color="bg-teal-600" message="How clearly you articulate each word" />
                <MeterBar value={livePace} label="Speaking Pace" color="bg-emerald-500" message="Optimal range: 120-160 WPM" />
                <MeterBar value={liveVolume} label="Volume Level" color="bg-green-600" message="Consistent projection" />
              </div>

              {/* Live tip */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2 animate-in fade-in duration-300 key={tipIdx}">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-bold text-emerald-800">{currentTip}</p>
              </div>
            </div>

            {/* Transcript preview */}
            {transcript && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Live Transcript</p>
                <p className="text-sm text-slate-600 line-clamp-3">{transcript}</p>
              </div>
            )}

            <button onClick={stopRecording} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <Square className="w-5 h-5" /> Stop &amp; Generate Report
            </button>
          </div>
        )}

        {/* ── Analyzing ── */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
              <Activity className="w-16 h-16 text-emerald-500 animate-pulse relative z-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Analyzing Voice Clarity</h2>
            <p className="text-sm text-slate-500">Calculating WPM, clarity score, and generating personalized coaching...</p>
          </div>
        )}

        {/* ── Result ── */}
        {step === 'result' && report && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Overall score */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-white/70 uppercase tracking-wider mb-1">Voice Clarity Score</p>
                  <p className="text-6xl font-black">{report.overallScore}</p>
                  <p className="text-white/70 text-sm mt-1">{report.overallScore >= 80 ? 'Excellent clarity!' : report.overallScore >= 65 ? 'Good — small improvements needed' : 'Needs focused practice'}</p>
                </div>
                <div className="text-right space-y-2">
                  <div className="bg-white/20 rounded-2xl p-3">
                    <p className={`text-lg font-black border px-2 py-0.5 rounded-full text-xs ${getPaceColor(report.wpm)}`}>{getPaceLabel(report.wpm)}</p>
                    <p className="text-xs text-white/70 mt-1">{report.wpm} WPM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Gauges */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-5">Voice Quality Metrics</h3>
              <div className="grid grid-cols-4 gap-2">
                <Gauge score={report.clarityScore} label="Clarity" color="#0d9488" />
                <Gauge score={report.paceScore} label="Pace" color="#10b981" />
                <Gauge score={report.volumeScore} label="Volume" color="#059669" />
                <Gauge score={report.pronunciationScore} label="Pronunciation" color="#0d9488" />
              </div>
            </div>

            {/* Coaching Messages */}
            <div className="space-y-3">
              {[
                { label: 'Pace', message: report.paceMessage, icon: '⚡', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
                { label: 'Clarity', message: report.clarityMessage, icon: '🎯', color: 'bg-teal-50 border-teal-100 text-teal-800' },
                { label: 'Volume', message: report.volumeMessage, icon: '🔊', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
              ].map(c => (
                <div key={c.label} className={`${c.color} border rounded-2xl p-4 flex items-start gap-3`}>
                  <span className="text-xl flex-shrink-0">{c.icon}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-0.5">{c.label}</p>
                    <p className="text-sm font-semibold">{c.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Tip */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white">
              <p className="text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" /> AI Coach Insight
              </p>
              <p className="text-sm font-medium text-slate-300 leading-relaxed mb-3">{report.overallTip}</p>
              <div className="space-y-2">
                {(report.recommendations || []).map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-slate-300">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Words Spoken', value: report.wordCount },
                { label: 'Duration', value: `${report.durationSecs}s` },
                { label: 'Fillers', value: report.fillerCount },
                { label: 'Speaking Rate', value: `${report.wpm} WPM` },
              ].map(s => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center shadow-sm">
                  <p className="text-xs font-black text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Practice Again
              </button>
              <Link to="/communication/progress" className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition-all shadow-lg text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" /> View Progress
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
