import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  ArrowLeft, Volume2, Mic, Square, RefreshCw, ChevronRight,
  CheckCircle, AlertTriangle, Trophy, ArrowRight, Loader2, Sparkles, Shuffle, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SpeechService, speakText } from '../../../services/speechService';
import { apiCall } from '../../lib/communicationApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type Step = 'select' | 'generating' | 'drill' | 'report';

interface AiPhrase { text: string; phonetic: string; }
interface AiPhraseSet { label: string; emoji: string; phrases: AiPhrase[]; }
interface PhraseResult { phrase: string; score: number; transcript: string; }

const CATEGORY_OPTIONS = [
  { key: 'everyday_english', label: 'Everyday English', emoji: '💬', desc: 'Conversational phrases & idioms' },
  { key: 'interviews', label: 'Interview Prep', emoji: '🎯', desc: 'Behavioral & elevator speech drills' },
  { key: 'business', label: 'Business & Workplace', emoji: '💼', desc: 'Corporate jargon & strategic phrases' },
  { key: 'technical', label: 'Technical Terms', emoji: '⚙️', desc: 'Advanced engineering & computing terms' },
  { key: 'presentations', label: 'Presentation Openers', emoji: '🎤', desc: 'Keynote & speech transition lines' },
  { key: 'storytelling', label: 'Storytelling Phrases', emoji: '📖', desc: 'Engaging narrative hooks & lines' },
  { key: 'public_speaking', label: 'Public Speaking', emoji: '🏛️', desc: 'Distinguished rhetoric & addresses' },
  { key: 'tongue_twisters', label: 'Tongue Twisters', emoji: '👅', desc: 'Articulation & speed drills' },
];

const DIFFICULTY_OPTIONS = [
  { key: 'beginner', label: 'Beginner', desc: 'Short, common words with simple syllables' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Standard business terms & compound sentences' },
  { key: 'advanced', label: 'Advanced', desc: 'High-density technical prose & tongue twisters' },
];

export const PronunciationCoach: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token || null;

  const [step, setStep] = useState<Step>('select');
  const [selectedCategory, setSelectedCategory] = useState('everyday_english');
  const [selectedDifficulty, setSelectedDifficulty] = useState('intermediate');
  const [phraseSet, setPhraseSet] = useState<AiPhraseSet | null>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [drillPhase, setDrillPhase] = useState<'listen' | 'prepare' | 'record' | 'scoring'>('listen');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<PhraseResult[]>([]);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedSets, setUsedSets] = useState<string[]>([]);

  const speechRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    speechRef.current = new SpeechService();
    return () => { clearInterval(timerRef.current); speechRef.current?.stopRecording().catch(() => {}); };
  }, []);

  const fetchPhraseSet = useCallback(async (category: string, difficulty: string) => {
    setStep('generating');
    setError(null);
    try {
      const data = await apiCall('POST', '/api/communication/generate-prompt', token, {
        tool: 'pronunciation_coach',
        contentType: category,
        difficulty,
        previous_topics: usedSets,
      });
      const set: AiPhraseSet = data.prompt;
      if (!set?.phrases || set.phrases.length < 5) throw new Error('Invalid response');
      setPhraseSet(set);
      setUsedSets(prev => [...prev, `${category}_${difficulty}`]);
      setPhraseIdx(0);
      setResults([]);
      setDrillPhase('listen');
      setCurrentScore(null);
      setTranscript('');
      setStep('drill');
    } catch (err: any) {
      setError('Could not generate phrases. Please try again.');
      setStep('select');
    }
  }, [token, usedSets]);

  const currentPhrase = phraseSet?.phrases[phraseIdx];

  const handleListen = () => {
    if (!currentPhrase) return;
    setIsPlaying(true);
    speakText(
      currentPhrase.text,
      () => {
        setIsPlaying(false);
        setDrillPhase('prepare');
      },
      speechRef.current || undefined
    );
  };

  const handleRecord = async () => {
    if (!speechRef.current) return;
    setIsRecording(true);
    setTranscript('');
    setRecordingSecs(0);
    timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    setDrillPhase('record');
    try {
      await speechRef.current.startRecording(
        (text) => setTranscript(text),
        () => console.warn('Language warning')
      );
    } catch {}
  };

  const handleStopAndScore = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    let text = transcript;
    try {
      const result = await speechRef.current!.stopRecording();
      if (result && result.length > text.length) text = result;
    } catch {}

    const isValid = text && text.trim().length >= 3 && /[a-zA-Z]/.test(text);
    if (!isValid) {
      setError("Looks like I didn't hear your response. Please try again.");
      setDrillPhase('prepare');
      return;
    }
    setError(null);
    setDrillPhase('scoring');
    setTranscript(text);

    let score = 65;
    if (text.trim() && currentPhrase) {
      const targetWords = currentPhrase.text.toLowerCase().split(/\s+/);
      const spokenWords = text.toLowerCase().split(/\s+/);
      const matches = targetWords.filter(w => spokenWords.some(sw => sw.includes(w.slice(0, Math.max(3, w.length - 1))))).length;
      score = Math.min(100, Math.max(40, Math.round((matches / targetWords.length) * 100)));
      try {
        const data = await apiCall('POST', '/api/communication/analyze-speech', token, { text });
        if (data.analysis?.pronunciation_score) {
          score = Math.round((score + data.analysis.pronunciation_score) / 2);
        }
      } catch {}
    }

    setCurrentScore(score);
    setResults(prev => [...prev, { phrase: currentPhrase?.text || '', score, transcript: text }]);
  };

  const handleNext = async () => {
    setCurrentScore(null);
    setTranscript('');
    setRecordingSecs(0);
    const next = phraseIdx + 1;
    if (!phraseSet || next >= phraseSet.phrases.length) {
      // Save tool session before showing report
      const avgScore = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 70;
      try {
        await apiCall('POST', '/api/communication/save-tool-session', token, {
          tool: 'pronunciation_coach',
          difficulty: selectedDifficulty,
          scores: {
            overall: avgScore,
            grammar: 75,
            fluency: 75,
            vocabulary: 75,
            confidence: 75,
            tone: 75,
            pronunciation: avgScore
          },
          feedback: {
            strengths: avgScore >= 75 ? ['Consistent pronunciation effort', 'Good phrase coverage'] : ['Completed the drill session'],
            suggestions: avgScore < 75 ? ['Practice each phrase multiple times', 'Listen to the audio before recording'] : ['Try advanced difficulty next']
          }
        });
      } catch (err) {
        console.warn('Could not save tool session:', err);
      }
      setStep('report');
    } else {
      setPhraseIdx(next);
      setDrillPhase('listen');
    }
  };

  const handleRestart = () => {
    setStep('select');
    setPhraseIdx(0);
    setResults([]);
    setCurrentScore(null);
    setTranscript('');
    setDrillPhase('listen');
    setPhraseSet(null);
  };

  const avgScore = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <CommNav compact backLabel="Practice" onBack={() => navigate('/communication/studio')} />
      <div className="max-w-3xl mx-auto px-4 pt-20">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3 pt-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">📖 Pronunciation Coach</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Listen → Repeat → AI speech analysis comparison</p>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700 font-semibold">{error}</div>}

        {/* ── Select Category & Difficulty ── */}
        {step === 'select' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" /> Configure Drills
              </h2>

              {/* Difficulty Selector */}
              <div className="mb-5">
                <label className="text-xs font-black text-slate-400 uppercase block mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedDifficulty(opt.key)}
                      className={`p-3.5 rounded-xl border text-center transition-all text-xs font-black flex items-center justify-center gap-1.5 ${
                        selectedDifficulty === opt.key
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {opt.label}
                      {selectedDifficulty === opt.key && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector */}
              <div className="mb-5">
                <label className="text-xs font-black text-slate-400 uppercase block mb-2">Category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedCategory(opt.key)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 relative ${
                        selectedCategory === opt.key
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0 mt-0.5">{opt.emoji}</span>
                      <div className="pr-6">
                        <p className={`text-xs font-black ${selectedCategory === opt.key ? 'text-emerald-900' : 'text-slate-800'}`}>{opt.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                      {selectedCategory === opt.key && (
                        <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fetchPhraseSet(selectedCategory, selectedDifficulty)}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-5 h-5" /> Start Session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const randomCat = CATEGORY_OPTIONS[Math.floor(Math.random() * CATEGORY_OPTIONS.length)].key;
                    const randomDiff = DIFFICULTY_OPTIONS[Math.floor(Math.random() * DIFFICULTY_OPTIONS.length)].key;
                    setSelectedCategory(randomCat);
                    setSelectedDifficulty(randomDiff);
                    fetchPhraseSet(randomCat, randomDiff);
                  }}
                  className="py-4 px-5 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <Shuffle className="w-4 h-4" /> Random Set
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-4">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <p className="text-base font-black text-slate-800">AI is generating your pronunciation set…</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Creating unique phonetically-mapped expressions</p>
          </div>
        )}

        {/* ── Drill ── */}
        {step === 'drill' && phraseSet && currentPhrase && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
              <span className="text-xs font-black text-slate-500">{phraseSet.emoji} {phraseSet.label} — Phrase {phraseIdx + 1} of {phraseSet.phrases.length}</span>
              <div className="flex gap-1">
                {phraseSet.phrases.map((_, i) => (
                  <div key={i} className={`w-6 h-1.5 rounded-full ${i < results.length ? 'bg-emerald-500' : i === phraseIdx ? 'bg-amber-400' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">AI-Generated Phrase</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-4 text-center">
                <p className="text-2xl font-black text-emerald-900 leading-relaxed">"{currentPhrase.text}"</p>
                <p className="text-xs text-emerald-600 mt-2 font-mono">{currentPhrase.phonetic}</p>
              </div>

              {drillPhase === 'listen' && (
                <div className="text-center space-y-3">
                  <p className="text-sm font-bold text-slate-600">Step 1: Listen to the model pronunciation</p>
                  <button onClick={handleListen} disabled={isPlaying}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-60">
                    <Volume2 className="w-5 h-5" />
                    {isPlaying ? 'Playing...' : 'Listen (AI Voice)'}
                  </button>
                </div>
              )}

              {drillPhase === 'prepare' && (
                <div className="text-center space-y-3">
                  <p className="text-sm font-bold text-slate-600">Step 2: Now you try! Press the mic and repeat the phrase</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={handleListen} disabled={isPlaying}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4" /> Replay
                    </button>
                    <button onClick={handleRecord}
                      className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 text-sm">
                      <Mic className="w-4 h-4" /> Start Recording
                    </button>
                  </div>
                </div>
              )}

              {drillPhase === 'record' && (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-black text-red-600">Recording — 0:{String(recordingSecs).padStart(2, '0')}</span>
                  </div>
                  <p className="text-xs text-slate-400 italic">Say the phrase clearly and naturally</p>
                  {transcript && <p className="text-xs text-slate-500 italic">"{transcript}"</p>}
                  <button onClick={handleStopAndScore}
                    className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 mx-auto">
                    <Square className="w-4 h-4" /> Stop & Score
                  </button>
                </div>
              )}

              {drillPhase === 'scoring' && currentScore === null && (
                <div className="text-center py-4">
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">Analyzing pronunciation...</p>
                </div>
              )}

              {drillPhase === 'scoring' && currentScore !== null && (
                <div className="text-center space-y-4">
                  <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-xl ${currentScore >= 80 ? 'bg-emerald-500' : currentScore >= 60 ? 'bg-teal-600' : 'bg-red-500'}`}>
                    <span className="text-2xl font-black text-white">{currentScore}</span>
                  </div>
                  <p className="text-sm font-black text-slate-700">
                    {currentScore >= 80 ? '🎉 Excellent pronunciation!' : currentScore >= 60 ? '👍 Good attempt! Keep practicing.' : '💪 Keep trying — practice makes perfect!'}
                  </p>
                  {transcript && <p className="text-xs text-slate-400 italic">You said: "{transcript}"</p>}
                  <button onClick={handleNext}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 mx-auto">
                    {phraseIdx + 1 >= phraseSet.phrases.length ? <><Trophy className="w-4 h-4" /> Finish Session</> : <>Next Phrase <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Report ── */}
        {step === 'report' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className={`rounded-3xl p-6 text-white text-center shadow-xl ${avgScore >= 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : avgScore >= 60 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-80" />
              <h2 className="text-2xl font-black">Session Complete!</h2>
              <p className="text-white/80 text-xs font-semibold capitalize mt-1">{selectedCategory.replace(/_/g, ' ')} · {selectedDifficulty}</p>
              <div className="text-5xl font-black mt-3">{avgScore}<span className="text-2xl text-white/60">/100</span></div>
              <p className="text-white/70 text-xs mt-1">Average Pronunciation Score</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900">Phrase Results</h3>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 ${r.score >= 80 ? 'bg-emerald-500' : r.score >= 60 ? 'bg-teal-600' : 'bg-red-500'}`}>{r.score}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">"{r.phrase}"</p>
                    {r.transcript && <p className="text-[10px] text-slate-400 italic truncate">You: "{r.transcript}"</p>}
                  </div>
                  {r.score >= 80 ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={handleRestart} className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try New Setup
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
