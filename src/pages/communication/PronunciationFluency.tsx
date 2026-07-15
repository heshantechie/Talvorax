import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  Mic, Square, RefreshCw, CheckCircle, AlertTriangle, ArrowRight,
  ChevronLeft, Sparkles, Activity, BookOpen, Star, TrendingUp, RotateCcw,
  Loader2, Shuffle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SpeechService } from '../../../services/speechService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AiScript { id: string; label: string; category: string; icon: string; text: string; }

const SCORE_CONFIG = [
  { key: 'grammar_score', label: 'Grammar', color: 'bg-emerald-500', desc: 'Accuracy of tense, subject-verb agreement, and sentence construction' },
  { key: 'fluency_score', label: 'Fluency', color: 'bg-teal-600', desc: 'Natural flow, absence of repetition, sentence variety' },
  { key: 'vocabulary_score', label: 'Vocabulary', color: 'bg-emerald-600', desc: 'Range and appropriateness of word choice' },
  { key: 'confidence_score', label: 'Confidence', color: 'bg-green-600', desc: 'Assertiveness, directness, avoidance of hedging' },
  { key: 'professional_tone_score', label: 'Tone', color: 'bg-teal-700', desc: 'Professionalism and context appropriateness' },
  { key: 'pronunciation_score', label: 'Pronunciation', color: 'bg-green-750', desc: 'Estimated clarity and articulation quality' },
];

import { apiCall } from '../../lib/communicationApi';

import { Waveform } from './components/Waveform';

type Step = 'pick' | 'generating' | 'record' | 'analyzing' | 'result';

export const PronunciationFluency: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const [step, setStep] = useState<Step>('pick');
  const [aiScript, setAiScript] = useState<AiScript | null>(null);
  const [customText, setCustomText] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [attempt1, setAttempt1] = useState<any>(null);
  const [attempt2, setAttempt2] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedScripts, setUsedScripts] = useState<string[]>([]);

  const speechServiceRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    return () => { clearInterval(timerRef.current); speechServiceRef.current?.stopRecording().catch(() => {}); };
  }, []);

  const fetchAiScript = useCallback(async () => {
    setStep('generating');
    setError(null);
    try {
      const data = await apiCall('POST', '/api/communication/generate-prompt', token, { tool: 'speech_analyzer', previous_topics: usedScripts });
      const script: AiScript = data.prompt;
      setAiScript(script);
      setUsedScripts(prev => [...prev, script.id]);
      setStep('pick');
    } catch {
      setError('Could not generate a script. Please try again.');
      setStep('pick');
    }
  }, [token, usedScripts]);

  const scriptText = useCustom ? customText : (aiScript?.text || '');

  const startRecording = async () => {
    if (!speechServiceRef.current) return;
    setError(null);
    setIsRecording(true);
    setRecordingSecs(0);
    setTranscriptText('');
    timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    try {
      await speechServiceRef.current.startRecording(
        (text) => setTranscriptText(text),
        () => console.warn('Language warning')
      );
    } catch { setTranscriptText(''); }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    if (!speechServiceRef.current) return;
    let finalText = transcriptText;
    try {
      const result = await speechServiceRef.current.stopRecording();
      if (result && result.length > finalText.length) finalText = result;
    } catch {}

    if (finalText.trim().length < 5) {
      setError('No speech detected. Please try again and speak clearly into your microphone.');
      return;
    }
    await analyzeText(finalText.trim());
  };

  const analyzeText = async (text: string) => {
    setStep('analyzing');
    try {
      const data = await apiCall('POST', '/api/communication/analyze-speech', token, { text });
      const analysis = data.analysis;
      if (attempt1) {
        setAttempt2({ ...analysis, transcript: text });
      } else {
        setAttempt1({ ...analysis, transcript: text });
      }

      // Save tool session to backend and award XP
      try {
        await apiCall('POST', '/api/communication/save-tool-session', token, {
          tool: 'speech_analyzer',
          difficulty: 'intermediate',
          scores: {
            overall: analysis.overall_score || 75,
            grammar: analysis.grammar_score || 75,
            fluency: analysis.fluency_score || 75,
            vocabulary: analysis.vocabulary_score || 75,
            confidence: analysis.confidence_score || 75,
            tone: analysis.professional_tone_score || 75,
            pronunciation: analysis.pronunciation_score || 75
          },
          feedback: {
            strengths: analysis.strengths || [],
            improvements: analysis.areas_to_improve || [],
            suggestions: analysis.suggestions || []
          }
        });
      } catch (e) {
        console.warn('Could not save tool session:', e);
      }
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
      setStep('record');
    }
  };

  const handleRetry = () => {
    setStep('record');
  };

  const handleReset = () => {
    setAttempt1(null);
    setAttempt2(null);
    setAiScript(null);
    setStep('pick');
  };

  const current = attempt2 || attempt1;
  const previous = attempt2 ? attempt1 : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <CommNav compact backLabel="Studio" onBack={() => navigate('/communication/studio')} />

      <div className="max-w-4xl mx-auto px-4 pt-20">
        <div className="mb-6 flex items-center justify-between pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">🎙️ Speech Analyzer</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Grammar · Fluency · Vocabulary · Confidence · Tone</p>
          </div>
          <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl">🎙️ Speech Analyzer</span>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2 text-red-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-4">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <p className="text-base font-black text-slate-800">AI is writing your script…</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Generating a unique reading passage</p>
          </div>
        )}

        {step === 'pick' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-black text-slate-900 mb-1">Your AI-Generated Script</h2>
              <p className="text-xs text-slate-500 mb-4">Read aloud naturally — we analyze your grammar, fluency, vocabulary, confidence & tone</p>

              {/* AI Script display */}
              {!useCustom && (
                <>
                  {aiScript ? (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{aiScript.icon}</span>
                        <div>
                          <p className="text-sm font-black text-emerald-800">{aiScript.label}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{aiScript.category}</p>
                        </div>
                        <div className="ml-auto flex gap-2">
                          <button onClick={fetchAiScript} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors" title="Generate new script">
                            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Read this script aloud</p>
                        <p className="text-sm text-emerald-950 leading-relaxed font-medium italic">"{aiScript.text}"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                      <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                      <p className="text-sm font-black text-slate-700 mb-1">Generate an AI Script</p>
                      <p className="text-xs text-slate-400">Click below to get a unique reading passage created just for you</p>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-slate-100 pt-4">
                <button onClick={() => setUseCustom(u => !u)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${useCustom ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  ✏️ Use Custom Text Instead
                </button>
                {useCustom && (
                  <textarea value={customText} onChange={e => setCustomText(e.target.value)} rows={4}
                    placeholder="Type the text you want to practice reading aloud..."
                    className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-emerald-300 focus:outline-none resize-none" />
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {!aiScript && !useCustom && (
                <button onClick={fetchAiScript}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" /> Generate AI Script
                </button>
              )}
              {(aiScript || useCustom) && (
                <button onClick={() => setStep('record')} disabled={useCustom && customText.trim().length < 10}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Mic className="w-5 h-5" /> Ready to Record
                </button>
              )}
              {aiScript && !useCustom && (
                <button onClick={fetchAiScript}
                  className="py-4 px-5 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Shuffle className="w-4 h-4" /> New Script
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step: Record ── */}
        {step === 'record' && (
          <div className="animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mb-4">
              {/* Script to read */}
              <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-5 mb-8">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Read this script aloud</p>
                <p className="text-base text-emerald-950 leading-relaxed font-medium italic">"{scriptText}"</p>
              </div>

              {/* Recording UI */}
              <div className="flex flex-col items-center space-y-6">
                <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500 ring-8 ring-red-500/20' : 'bg-emerald-600'}`}>
                  {isRecording ? <Square className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                  {isRecording && <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-30" />}
                </div>

                {isRecording ? (
                  <div className="text-center space-y-2">
                    <span className="font-mono text-3xl font-black text-slate-900">0:{String(recordingSecs).padStart(2, '0')}</span>
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest animate-pulse">● Recording...</p>
                    <Waveform active={true} heightClass="h-12" barWidthClass="w-1.5" gradient={true} />
                    {transcriptText && <p className="text-xs text-slate-400 italic mt-1">"{transcriptText.substring(0, 80)}..."</p>}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-600">{attempt1 ? 'Ready to retry? Your 2nd attempt will be compared.' : 'Press the button to start recording'}</p>
                    <p className="text-xs text-slate-400 mt-1">Speak clearly and read the script above</p>
                  </div>
                )}

                <div className="flex gap-3 w-full max-w-xs">
                  {!isRecording ? (
                    <button onClick={startRecording} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                      <Mic className="w-5 h-5" /> Start Recording
                    </button>
                  ) : (
                    <button onClick={stopRecording} className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                      <Square className="w-5 h-5" /> Stop &amp; Analyze
                    </button>
                  )}
                </div>
                {attempt1 && !isRecording && (
                  <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 mt-2">
                    <RotateCcw className="w-3 h-3" /> Start from scratch
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Analyzing ── */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
              <Activity className="w-16 h-16 text-emerald-500 animate-pulse relative z-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Analyzing Your Speech</h2>
            <p className="text-sm text-slate-500">Evaluating grammar, fluency, vocabulary, confidence &amp; tone...</p>
          </div>
        )}

        {/* ── Step: Result ── */}
        {step === 'result' && current && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Hero score */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white text-center shadow-xl">
              <div className="text-5xl font-black mb-1">{current.overall_score}</div>
              <p className="text-white/70 text-sm font-bold">Overall Speech Score</p>
              {previous && (
                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-black ${current.overall_score > previous.overall_score ? 'bg-emerald-500/30 text-emerald-250' : current.overall_score < previous.overall_score ? 'bg-red-500/30 text-red-205' : 'bg-white/20 text-white'}`}>
                  <TrendingUp className="w-3 h-3" />
                  {current.overall_score > previous.overall_score ? `+${current.overall_score - previous.overall_score} pts improvement!` : current.overall_score < previous.overall_score ? `${current.overall_score - previous.overall_score} pts from attempt 1` : 'Same score as attempt 1'}
                </div>
              )}
            </div>

            {/* If 2 attempts: comparison bar */}
            {previous && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Attempt Comparison</h3>
                <div className="space-y-3">
                  {SCORE_CONFIG.map(sc => {
                    const s1 = previous[sc.key] || 0;
                    const s2 = current[sc.key] || 0;
                    const diff = s2 - s1;
                    return (
                      <div key={sc.key}>
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>{sc.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Attempt 1: {s1}</span>
                            <span className="font-black text-slate-900">Attempt 2: {s2}</span>
                            {diff !== 0 && <span className={`text-[10px] font-black ${diff > 0 ? 'text-emerald-500' : 'text-red-400'}`}>{diff > 0 ? `+${diff}` : diff}</span>}
                          </div>
                        </div>
                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-slate-200" style={{ width: `${s1}%` }} />
                          <div className={`absolute top-0 h-full rounded-full ${sc.color}`} style={{ width: `${s2}%`, opacity: 0.85 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single attempt scores */}
            {!previous && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  {SCORE_CONFIG.map(sc => (
                    <div key={sc.key}>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>{sc.label}</span>
                        <span className="font-black text-slate-900">{current[sc.key] || 0}/100</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${sc.color} transition-all duration-500`} style={{ width: `${current[sc.key] || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {current.strengths?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 mb-3"><CheckCircle className="w-3.5 h-3.5" /> Strengths</p>
                  <ul className="space-y-2">{current.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-slate-600 font-semibold flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />{s}</li>)}</ul>
                </div>
              )}
              {current.areas_to_improve?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5 mb-3"><AlertTriangle className="w-3.5 h-3.5" /> Improve</p>
                  <ul className="space-y-2">{current.areas_to_improve.map((s: string, i: number) => <li key={i} className="text-xs text-slate-600 font-semibold flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />{s}</li>)}</ul>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            {current.suggestions?.length > 0 && (
              <div className="bg-slate-900 rounded-3xl p-5 text-white">
                <p className="text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider"><Sparkles className="w-3.5 h-3.5" /> AI Coach Suggestions</p>
                <ul className="space-y-1.5">{current.suggestions.map((s: string, i: number) => <li key={i} className="text-xs font-semibold text-slate-300 flex gap-2"><Star className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />{s}</li>)}</ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!attempt2 ? (
                <button onClick={handleRetry} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Retry &amp; Compare
                </button>
              ) : (
                <button onClick={handleReset} className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> New Script
                </button>
              )}
              <Link to="/communication" className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors text-center flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" /> Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
