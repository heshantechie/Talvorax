import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  Mic, Square, RefreshCw, AlertTriangle, ArrowRight, ChevronLeft,
  AlertCircle, BarChart3, Clock, CheckCircle, XCircle, Lightbulb,
  Loader2, Sparkles, Shuffle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SpeechService } from '../../../services/speechService';
import { apiCall } from '../../lib/communicationApi';
import { Waveform } from './components/Waveform';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const FILLER_WORDS = [
  'um', 'uh', 'ah', 'er', 'like', 'you know', 'basically', 'actually',
  'literally', 'right', 'well', 'kind of', 'sort of', 'i mean',
  'you see', 'okay', 'ok', 'just', 'very', 'really'
];

// Highlight fillers in transcript
const HighlightedTranscript: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const words = text.split(/(\s+)/);
  return (
    <p className="text-sm leading-loose text-slate-700 font-medium">
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        const isFiller = FILLER_WORDS.includes(clean);
        return isFiller ? (
          <span key={i} className="bg-red-100 text-red-600 font-black border border-red-200 rounded px-0.5 mx-0.5 text-xs">{word}</span>
        ) : (
          <span key={i}>{word}</span>
        );
      })}
    </p>
  );
};

type Step = 'loading' | 'ready' | 'recording' | 'analyzing' | 'result';

interface AiTopic { topic: string; category: string; icon: string; hint: string; }

export const FillerWordDetection: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const [step, setStep] = useState<Step>('loading');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState<AiTopic | null>(null);
  const [usedTopics, setUsedTopics] = useState<string[]>([]);

  const speechServiceRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTopic = useCallback(async (prevTopics: string[]) => {
    setStep('loading');
    try {
      const data = await apiCall('POST', '/api/communication/generate-prompt', token, { tool: 'filler_detection', previous_topics: prevTopics });
      const t: AiTopic = data.prompt;
      setAiTopic(t);
      setUsedTopics(prev => [...prev, t.topic.substring(0, 30)]);
    } catch { /* show whatever we have */ }
    setStep('ready');
  }, [token]);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    fetchTopic([]);
    return () => { clearInterval(timerRef.current); speechServiceRef.current?.stopRecording().catch(() => {}); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscript]);

  const startRecording = async () => {
    if (!speechServiceRef.current) return;
    setError(null);
    setLiveTranscript('');
    setIsRecording(true);
    setStep('recording');
    setRecordingSecs(0);
    timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    try {
      await speechServiceRef.current.startRecording(
        (interimText: string) => { setLiveTranscript(interimText); },
        () => {}
      );
    } catch { setLiveTranscript(''); }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    if (!speechServiceRef.current) return;
    let text = liveTranscript;
    try {
      const result = await speechServiceRef.current.stopRecording();
      if (result && result.length > text.length) text = result;
    } catch {}

    const isValid = text && text.trim().length >= 5 && recordingSecs >= 1.5 && /[a-zA-Z]/.test(text);
    if (!isValid) {
      setError("Looks like I didn't hear your response. Please try again.");
      setStep('ready');
      return;
    }
    setError(null);
    setFinalTranscript(text.trim());
    await analyzeFillers(text.trim());
  };

  const analyzeFillers = async (text: string) => {
    setStep('analyzing');
    try {
      const data = await apiCall('POST', '/api/communication/analyze-filler', token, { text });
      setReport(data.report);

      // Save tool session to backend and award XP
      try {
        await apiCall('POST', '/api/communication/save-tool-session', token, {
          tool: 'filler_detection',
          difficulty: 'intermediate',
          scores: {
            overall: data.report.fluencyScore || 75,
            grammar: 75,
            fluency: data.report.fluencyScore || 75,
            vocabulary: 75,
            confidence: 75,
            tone: 75,
            pronunciation: 75
          },
          feedback: {
            strengths: data.report.summary ? [data.report.summary] : ['Good speaking volume'],
            suggestions: data.report.suggestions || []
          }
        });
      } catch (err) {
        console.warn('Could not save tool session:', err);
      }

      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
      setStep('ready');
    }
  };

  const handleReset = () => {
    setReport(null);
    setFinalTranscript('');
    setLiveTranscript('');
    setRecordingSecs(0);
    setError(null);
    const current = [...usedTopics];
    setUsedTopics(current);
    fetchTopic(current);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-teal-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-teal-600';
    if (score >= 60) return 'from-green-500 to-emerald-600';
    return 'from-red-500 to-rose-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <CommNav compact backLabel="Practice" onBack={() => navigate('/communication/studio')} />
      <div className="max-w-3xl mx-auto px-4 pt-20">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3 pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emerald-600" /> Filler Word Detection
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time detection of "um", "uh", "like", and more</p>
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
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-4">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <p className="text-base font-black text-slate-800">AI is selecting your topic…</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Generating a unique speaking prompt</p>
          </div>
        )}

        {/* ── Ready ── */}
        {step === 'ready' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-black text-slate-900 mb-1">Your Speaking Topic</h2>
              <p className="text-sm text-slate-500 mb-5">Speak about this topic for 30-90 seconds. We'll detect and highlight every filler word in real-time.</p>

              {aiTopic && (
                <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{aiTopic.icon}</span>
                      <div>
                        <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">{aiTopic.category}</p>
                        <p className="text-[10px] text-emerald-500">AI-Generated Topic</p>
                      </div>
                    </div>
                    <button onClick={() => fetchTopic(usedTopics)} className="p-1.5 rounded-lg border border-emerald-250 hover:bg-emerald-100 transition-colors">
                      <Shuffle className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  </div>
                  <p className="text-base font-black text-slate-900 leading-relaxed">“{aiTopic.topic}”</p>
                  {aiTopic.hint && (
                    <p className="text-xs text-emerald-700 mt-3 italic flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Tip: {aiTopic.hint}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { step: '1', title: 'Press Record', desc: 'Click the mic and speak about the topic above.' },
                  { step: '2', title: 'Speak Freely', desc: 'Watch filler words highlighted in red in real-time.' },
                  { step: '3', title: 'Review Report', desc: 'Get a detailed filler score and improvement tips.' },
                ].map(s => (
                  <div key={s.step} className="p-4 bg-slate-50 rounded-2xl">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center mb-2">{s.step}</div>
                    <p className="text-xs font-black text-slate-800 mb-1">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-5">
                <p className="text-xs font-black text-emerald-700 mb-2">🎯 Detected Filler Words</p>
                <div className="flex flex-wrap gap-1.5">
                  {FILLER_WORDS.map(f => (
                    <span key={f} className="text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-bold">{f}</span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={startRecording} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Mic className="w-5 h-5" /> Start Speaking
                </button>
                <button onClick={() => fetchTopic(usedTopics)} className="py-4 px-5 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> New Topic
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Recording ── */}
        {step === 'recording' && (
          <div className="animate-in fade-in duration-200 space-y-4">
            {/* Live status */}
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-black text-red-600">Recording</span>
              </div>
              <div className="flex items-center gap-3">
                <Waveform active={true} heightClass="h-10" color="#ef4444" />
                <span className="font-mono text-sm font-black text-slate-900">0:{String(recordingSecs).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Live Transcript with highlights */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm min-h-[200px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live Transcript
              </p>
              {liveTranscript ? (
                <HighlightedTranscript text={liveTranscript} />
              ) : (
                <p className="text-sm text-slate-400 italic">Listening... start speaking now</p>
              )}
              <div ref={scrollRef} />
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 text-emerald-500" />
              Words highlighted in <span className="bg-red-100 text-red-600 border border-red-200 px-1 rounded font-black mx-1">red</span> are detected filler words.
            </div>

            <button onClick={stopRecording} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <Square className="w-5 h-5" /> Stop &amp; Generate Report
            </button>
          </div>
        )}

        {/* ── Step: Analyzing ── */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
              <BarChart3 className="w-16 h-16 text-emerald-500 animate-pulse relative z-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Building Your Filler Report</h2>
            <p className="text-sm text-slate-500">Counting fillers, mapping timeline, and generating insights...</p>
          </div>
        )}

        {/* ── Result ── */}
        {step === 'result' && report && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Hero score ring */}
            <div className={`bg-gradient-to-br ${getScoreBg(report.fluencyScore)} rounded-3xl p-6 text-white shadow-xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-white/70 uppercase tracking-wider mb-1">Fluency Score</p>
                  <p className="text-5xl font-black">{report.fluencyScore}<span className="text-xl text-white/60">/100</span></p>
                  <p className="text-sm text-white/80 mt-2 font-medium">{report.fluencyScore >= 80 ? 'Excellent — very few fillers!' : report.fluencyScore >= 60 ? 'Good — room to improve' : 'Needs work — too many fillers'}</p>
                </div>
                <div className="text-right space-y-2">
                  <div className="bg-white/20 rounded-2xl p-3">
                    <p className="text-2xl font-black">{report.totalFillers}</p>
                    <p className="text-xs text-white/70">Total Fillers</p>
                  </div>
                  <div className="bg-white/20 rounded-2xl p-3">
                    <p className="text-2xl font-black">{report.totalWords}</p>
                    <p className="text-xs text-white/70">Total Words</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Fillers / 100 Words', value: `${Math.round((report.totalFillers / report.totalWords) * 100)}`, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                { label: 'Most Repeated', value: report.mostRepeated?.word || 'None', icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-600 bg-red-50 border-red-100' },
                { label: 'Word Count', value: `${report.totalWords}`, icon: <BarChart3 className="w-3.5 h-3.5" />, color: 'text-teal-700 bg-teal-50 border-teal-100' },
                { label: 'Est. Duration', value: `${report.duration} min`, icon: <Clock className="w-3.5 h-3.5" />, color: 'text-slate-600 bg-slate-50 border-slate-100' },
              ].map(s => (
                <div key={s.label} className={`${s.color} border rounded-2xl p-3`}>
                  <div className="flex items-center gap-1 mb-1">{s.icon}<p className="text-[10px] font-black uppercase tracking-wider">{s.label}</p></div>
                  <p className="text-xl font-black">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filler word breakdown */}
            {Object.keys(report.fillerCounts || {}).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-500" /> Filler Word Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(report.fillerCounts as Record<string, number>)
                    .sort((a, b) => b[1] - a[1])
                    .map(([word, count]) => (
                      <div key={word} className="flex items-center gap-3">
                        <span className="w-24 text-xs font-black text-slate-700 text-right flex-shrink-0">"{word}"</span>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-red-400 flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${Math.min(100, (count / report.totalFillers) * 100)}%` }}>
                            <span className="text-[10px] font-black text-white">{count}×</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Transcript with highlights */}
            {finalTranscript && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">📝 Your Speech</h3>
                <HighlightedTranscript text={finalTranscript} />
              </div>
            )}

            {/* AI Summary & Tips */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white">
              <p className="text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" /> AI Coach Insights
              </p>
              <p className="text-sm font-medium text-slate-300 leading-relaxed mb-4">{report.summary}</p>
              <div className="space-y-2">
                {(report.suggestions || []).map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-slate-300">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Practice Again
              </button>
              <Link to="/communication/progress" className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition-all shadow-lg text-center flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" /> View Progress
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
