import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  ArrowLeft, Mic, Square, Shield, RefreshCw, ArrowRight,
  Trophy, ChevronRight, Star, Loader2, Sparkles, Zap,
  MessageSquare, HelpCircle, GraduationCap, Users, Briefcase, Handshake, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SpeechService } from '../../../services/speechService';
import { apiCall } from '../../lib/communicationApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const FILLER_WORDS = ['um', 'uh', 'ah', 'er', 'like', 'you know', 'basically', 'actually', 'literally'];


const scoreConfidence = (transcript: string, responseTime: number) => {
  if (!transcript.trim()) return 0;
  const words = transcript.trim().split(/\s+/);
  const wpm = Math.round((words.length / (responseTime || 30)) * 60);
  const fillerCount = FILLER_WORDS.filter(f => transcript.toLowerCase().includes(f)).length;
  const contentScore = Math.min(100, (words.length / 80) * 100);
  const fillerPenalty = Math.min(30, fillerCount * 8);
  const pacePenalty = wpm < 80 ? 15 : wpm > 220 ? 10 : 0;
  return Math.min(100, Math.max(20, Math.round(contentScore - fillerPenalty - pacePenalty)));
};

type Step = 'config' | 'generating' | 'countdown' | 'question' | 'recording' | 'scoring' | 'report';

interface AiQuestion { question: string; category: string; hint: string; duration: number; }
interface QuestionResult { question: string; type: string; score: number; transcript: string; fillerCount: number; wordCount: number; wpm: number; }

const SCENARIO_OPTIONS = [
  { key: 'hr_interview', label: 'HR Interview', icon: Briefcase, desc: 'Behavioral and strategic job interviews' },
  { key: 'college_discussion', label: 'College Discussion', icon: GraduationCap, desc: 'Academic debates and campus talks' },
  { key: 'presentation', label: 'Presentation Pitch', icon: Sparkles, desc: 'Product demos and project keynotes' },
  { key: 'group_discussion', label: 'Group Discussion', icon: Users, desc: 'Interactive group dynamics and panels' },
  { key: 'meeting', label: 'Meetings', icon: Handshake, desc: 'Professional updates and project synchs' },
  { key: 'networking', label: 'Networking Pitch', icon: ArrowRight, desc: 'Elevator pitches and meeting executives' },
  { key: 'leadership', label: 'Leadership Vision', icon: Shield, desc: 'Retention talks and team motivation' },
  { key: 'customer_interaction', label: 'Client Relations', icon: MessageSquare, desc: 'Customer retention and negotiation' },
  { key: 'impromptu', label: 'Impromptu Speaking', icon: HelpCircle, desc: 'Spontaneous topics on the spot' },
];

const DIFFICULTY_OPTIONS = [
  { key: 'beginner', label: 'Beginner', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'intermediate', label: 'Intermediate', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'advanced', label: 'Advanced', color: 'bg-green-50 text-green-700 border-green-200' },
];

export const ConfidenceBuilder: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const [step, setStep] = useState<Step>('config');
  const [selectedScenario, setSelectedScenario] = useState('impromptu');
  const [selectedDifficulty, setSelectedDifficulty] = useState('intermediate');
  const [currentQ, setCurrentQ] = useState<AiQuestion | null>(null);
  const [roundIdx, setRoundIdx] = useState(1); // 1 to 3 rounds
  const [countdown, setCountdown] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [usedTopics, setUsedTopics] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speechRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  useEffect(() => {
    speechRef.current = new SpeechService();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      speechRef.current?.stopRecording().catch(() => {});
    };
  }, []);

  const fetchQuestion = useCallback(async () => {
    setStep('generating');
    setGenError(null);
    try {
      const data = await apiCall('POST', '/api/communication/generate-prompt', token, {
        tool: 'confidence_builder',
        scenario: selectedScenario,
        difficulty: selectedDifficulty,
        previous_topics: usedTopics,
      });
      const q: AiQuestion = data.prompt;
      setCurrentQ(q);
      setUsedTopics(prev => [...prev, q.question]);
      setTranscript('');
      setCurrentScore(null);
      setStep('countdown');
      setCountdown(3);
      let c = 3;
      countdownRef.current = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(countdownRef.current);
          setStep('question');
          setTimeout(() => startRecording(), 1500);
        }
      }, 1000);
    } catch (err: any) {
      setGenError('Could not generate scenario. Please try again.');
      setStep('config');
    }
  }, [token, selectedScenario, selectedDifficulty, usedTopics]);

  const fetchFollowUp = useCallback(async () => {
    setStep('generating');
    setGenError(null);
    const lastResult = results[results.length - 1];
    try {
      const data = await apiCall('POST', '/api/communication/generate-followup', token, {
        scenario: selectedScenario,
        difficulty: selectedDifficulty,
        originalQuestion: lastResult.question,
        userAnswer: lastResult.transcript,
        questionNumber: roundIdx + 1,
      });
      const q: AiQuestion = data.prompt;
      setCurrentQ(q);
      setRoundIdx(prev => prev + 1);
      setTranscript('');
      setCurrentScore(null);
      setStep('countdown');
      setCountdown(3);
      let c = 3;
      countdownRef.current = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(countdownRef.current);
          setStep('question');
          setTimeout(() => startRecording(), 1500);
        }
      }, 1000);
    } catch (err: any) {
      setGenError('Could not generate follow-up question. Proceeding to report.');
      setStep('report');
    }
  }, [token, selectedScenario, selectedDifficulty, results, roundIdx]);

  const startRecording = async () => {
    if (!speechRef.current) return;
    setIsRecording(true);
    setRecordingSecs(0);
    setStep('recording');
    timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    try {
      await speechRef.current.startRecording(
        (interim: string) => setTranscript(interim),
        () => {} // onLanguageWarning no-op
      );
    } catch { setTranscript(''); }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    let text = transcript;
    try {
      const result = await speechRef.current!.stopRecording();
      if (result && result.length > text.length) text = result;
    } catch {}

    const isValid = text && text.trim().length >= 4 && recordingSecs >= 1.2 && /[a-zA-Z]{2,}/.test(text);
    if (!isValid) {
      setError("Looks like I didn't catch that. Please try again and speak clearly.");
      setStep('question');
      return;
    }
    setError(null);
    setTranscript(text);
    await scoreResponse(text);
  };

  const scoreResponse = async (text: string) => {
    setStep('scoring');
    const localScore = scoreConfidence(text, recordingSecs);
    const words = text.trim().split(/\s+/);
    const wpm = Math.round((words.length / (recordingSecs || 1)) * 60);
    const fillerCount = FILLER_WORDS.filter(f => text.toLowerCase().includes(f)).length;

    let finalScore = localScore;
    try {
      const data = await apiCall('POST', '/api/communication/analyze-speech', token, { text: text || 'No response recorded.' });
      if (data.analysis?.confidence_score) {
        finalScore = Math.round((localScore + data.analysis.confidence_score) / 2);
      }
    } catch {}

    setCurrentScore(finalScore);
    setResults(prev => [...prev, {
      question: currentQ?.question || '',
      type: roundIdx === 1 ? 'Initial Question' : `Follow-up ${roundIdx - 1}`,
      score: finalScore, transcript: text,
      fillerCount, wordCount: words.filter(Boolean).length, wpm,
    }]);
  };

  const handleNext = async () => {
    if (roundIdx >= 3) {
      setStep('report');
      try {
        const computedAvg = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 75;
        await apiCall('POST', '/api/communication/save-tool-session', token, {
          tool: 'confidence_builder',
          difficulty: selectedDifficulty,
          scores: {
            overall: computedAvg,
            grammar: computedAvg,
            fluency: computedAvg,
            vocabulary: computedAvg,
            confidence: computedAvg,
            tone: computedAvg,
            pronunciation: computedAvg
          },
          feedback: {
            strengths: ['Great impromptu response consistency', 'Strong vocabulary under pressure'],
            suggestions: ['Minimize hesitation pauses to sound even more confident']
          }
        });
      } catch (err) {
        console.warn('Could not save tool session:', err);
      }
    } else {
      fetchFollowUp();
    }
  };

  const handleRestart = () => {
    setStep('config');
    setRoundIdx(1);
    setResults([]);
    setCurrentQ(null);
    setCurrentScore(null);
    setTranscript('');
    setUsedTopics([]);
    setGenError(null);
  };

  const avgScore = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0;
  const getScoreLabel = (s: number) =>
    s >= 85 ? 'Highly Confident' : s >= 70 ? 'Confident' : s >= 55 ? 'Developing' : 'Needs Practice';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <CommNav compact backLabel="Practice" onBack={() => navigate('/communication/studio')} />
      <div className="max-w-3xl mx-auto px-4 pt-20">

        <div className="mb-6 flex items-center gap-3 pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">💪 Confidence Builder</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Real-time coaching conversation with context-aware follow-ups</p>
          </div>
        </div>

        {genError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 text-red-700 text-sm font-semibold">{genError}</div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 text-red-700 text-sm font-semibold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Config Step ── */}
        {step === 'config' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" /> Set Up Your Coaching Session
              </h2>

              {/* Difficulty Selection */}
              <div className="mb-6">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Select Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedDifficulty(opt.key)}
                      className={`py-3 px-4 rounded-xl border text-center transition-all text-xs font-black flex items-center justify-center gap-2 ${
                        selectedDifficulty === opt.key
                          ? 'border-emerald-500 ring-2 ring-emerald-200 text-emerald-905 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {opt.label}
                      {selectedDifficulty === opt.key && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenario Selection */}
              <div className="mb-6">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Select Scenario</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SCENARIO_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setSelectedScenario(opt.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                          selectedScenario === opt.key
                            ? 'border-emerald-450 bg-emerald-50/50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 ${
                          selectedScenario === opt.key ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-black ${selectedScenario === opt.key ? 'text-emerald-950' : 'text-slate-800'}`}>{opt.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={fetchQuestion}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" /> Start Conversation Practice
              </button>
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-4">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <p className="text-base font-black text-slate-800">
              {roundIdx === 1 ? 'AI is creating your coaching scenario…' : 'AI is listening and formulating a follow-up…'}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {roundIdx === 1 ? 'Tailoring challenge to selected settings' : `Round ${roundIdx} completed`}
            </p>
          </div>
        )}

        {/* ── Countdown ── */}
        {step === 'countdown' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-200">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Get Ready to Speak…</p>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 ring-8 ring-emerald-100">
              <span className="text-6xl font-black text-white animate-pulse">{countdown}</span>
            </div>
            <p className="text-sm text-slate-500 font-bold mt-6">Round {roundIdx} of 3</p>
          </div>
        )}

        {/* ── Question shown ── */}
        {step === 'question' && currentQ && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
              <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <Zap className="w-3 h-3" /> Round {roundIdx} of 3
              </span>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 my-5">
                <p className="text-xl font-black text-slate-900 leading-relaxed">"{currentQ.question}"</p>
              </div>
              {currentQ.hint && (
                <p className="text-xs text-slate-400 italic mb-3">💡 Tip: {currentQ.hint}</p>
              )}
              <p className="text-xs text-slate-400 font-semibold animate-pulse">Microphone starting automatically...</p>
            </div>
          </div>
        )}

        {/* ── Recording ── */}
        {step === 'recording' && currentQ && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-emerald-50 border border-emerald-250 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-black text-red-650">Recording Round {roundIdx}/3</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-slate-800">0:{String(recordingSecs).padStart(2, '0')}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-base font-black text-slate-900 mb-4 leading-relaxed">"{currentQ.question}"</p>
              {transcript && <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-3">"{transcript}"</p>}
            </div>

            <button onClick={stopRecording}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <Square className="w-5 h-5" /> Finish Answer
            </button>
          </div>
        )}

        {/* ── Scoring spinner ── */}
        {step === 'scoring' && currentScore === null && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-lg font-black text-slate-900">AI is evaluating your confidence level...</p>
          </div>
        )}

        {/* ── Score reveal ── */}
        {step === 'scoring' && currentScore !== null && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className={`rounded-3xl p-6 text-white text-center shadow-xl ${currentScore >= 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : currentScore >= 60 ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
              <p className="text-xs font-black text-white/70 uppercase tracking-wider mb-2">Round {roundIdx} Confidence Score</p>
              <p className="text-6xl font-black">{currentScore}</p>
              <p className="text-white/80 text-sm mt-1 font-bold">{getScoreLabel(currentScore)}</p>
            </div>
            {results[results.length - 1] && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Words Spoken', value: results[results.length - 1].wordCount },
                  { label: 'Pace (WPM)', value: results[results.length - 1].wpm },
                  { label: 'Fillers Used', value: results[results.length - 1].fillerCount },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-black text-slate-900">{s.value}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleNext}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
              {roundIdx >= 3 ? <><Trophy className="w-4 h-4" /> See Final Report</> : <>Generate AI Follow-up <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* ── Report ── */}
        {step === 'report' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className={`rounded-3xl p-6 text-white text-center shadow-xl ${avgScore >= 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : avgScore >= 65 ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-80" />
              <h2 className="text-2xl font-black">Confidence Report</h2>
              <p className="text-white/80 text-xs font-semibold capitalize mb-3">{selectedScenario.replace(/_/g, ' ')} · {selectedDifficulty}</p>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div><p className="text-4xl font-black">{avgScore}</p><p className="text-white/70 text-xs font-bold">Avg Score</p></div>
                <div className="w-px h-10 bg-white/20" />
                <div><p className="text-4xl font-black">{results.length}</p><p className="text-white/70 text-xs font-bold">Rounds</p></div>
                <div className="w-px h-10 bg-white/20" />
                <div><p className="text-lg font-black">{getScoreLabel(avgScore)}</p><p className="text-white/70 text-xs font-bold">Overall Level</p></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4">Conversation Progression</h3>
              <div className="space-y-4">
                {results.map((r, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black bg-emerald-105 text-emerald-700 px-2 py-0.5 rounded-full">{r.type}</span>
                      <span className={`text-xs font-black ${r.score >= 80 ? 'text-emerald-600' : r.score >= 60 ? 'text-teal-600' : 'text-red-500'}`}>Score: {r.score}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">Q: "{r.question}"</p>
                    <p className="text-xs text-slate-500 italic">A: "{r.transcript || 'No answer recorded.'}"</p>
                    <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
                      <span>{r.wordCount} words</span>
                      <span>{r.wpm} WPM</span>
                      <span>{r.fillerCount} fillers</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleRestart} className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try New Scenario
              </button>
              <Link to="/communication/studio" className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition-all shadow-lg text-center flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" /> More Tools
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
