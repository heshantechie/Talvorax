import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CommNav } from './CommNav';
import {
  Mic, Square, Sparkles, CheckCircle, Trophy, ArrowRight,
  ChevronLeft, Volume2, VolumeX, Bot, User, Flame, Activity,
  RefreshCw, AlertCircle, Zap, Star, Clock, Target, MessageSquare,
  Globe, ChevronRight, X, Play
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SpeechService, speakText } from '../../../services/speechService';
import { WORLDS_DATA, MissionDef, ALL_MISSIONS } from './worldsConfig';
import { apiCall } from '../../lib/communicationApi';
import { Waveform } from './components/Waveform';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

type ConvStep = 'select' | 'brief' | 'chatting' | 'ending' | 'report';
interface Message { id: string; sender: 'ai' | 'user'; text: string; ts: number; }

const WORLDS = Object.values(WORLDS_DATA).map(w => ({
  id: w.id, label: w.title, emoji: w.emoji, gradient: w.gradient,
  missions: w.missions.map(m => ({ ...m, emoji: w.emoji, character: { ...m.character, avatar: m.character.avatar || '👩‍🏫', bg: m.character.bg || 'bg-emerald-100', text: m.character.text || 'text-emerald-700' } }))
}));

const DIFF_COLORS: Record<string, string> = {
  Beginner: 'text-emerald-700 bg-emerald-100 border-emerald-200',
  Intermediate: 'text-teal-700 bg-teal-100 border-teal-200',
  Advanced: 'text-green-750 bg-green-100 border-green-200',
};

const SKILL_COLORS = [
  { key: 'grammar_score', label: 'Grammar', color: '#10b981', bg: 'bg-emerald-500' },
  { key: 'fluency_score', label: 'Fluency', color: '#0d9488', bg: 'bg-teal-600' },
  { key: 'vocabulary_score', label: 'Vocabulary', color: '#059669', bg: 'bg-emerald-600' },
  { key: 'confidence_score', label: 'Confidence', color: '#16a34a', bg: 'bg-green-600' },
  { key: 'professional_tone_score', label: 'Prof. Tone', color: '#0f766e', bg: 'bg-teal-700' },
  { key: 'pronunciation_score', label: 'Pronunciation', color: '#15803d', bg: 'bg-green-700' },
];

// ── Typing Dots ──────────────────────────────────────────────────────────────
const TypingDots: React.FC<{ avatar: string }> = ({ avatar }) => (
  <div className="flex items-end gap-2.5 mb-3 comm-bubble-ai">
    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">{avatar}</div>
    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1.5 items-center h-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

// ── Score Bar ────────────────────────────────────────────────────────────────
const ScoreBar: React.FC<{ label: string; score: number; bg: string; delay?: number }> = ({ label, score, bg, delay = 0 }) => (
  <div>
    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
      <span>{label}</span>
      <span className="font-black text-slate-900">{score}/100</span>
    </div>
    <div className="comm-score-bar">
      <div
        className={`comm-score-bar-fill ${bg}`}
        style={{ '--target-width': `${score}%`, animationDelay: `${delay}s` } as any}
      />
    </div>
  </div>
);

// ── Mission Brief Overlay ────────────────────────────────────────────────────
const MissionBriefOverlay: React.FC<{
  mission: MissionDef;
  worldGradient: string;
  onStart: () => void;
  onBack: () => void;
  isStarting: boolean;
  error: string | null;
}> = ({ mission, worldGradient, onStart, onBack, isStarting, error }) => (
  <div className="comm-session-overlay p-4">
    <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl comm-fade-scale">
      {/* Hero header */}
      <div className={`bg-gradient-to-br ${worldGradient} p-6 text-white text-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="text-5xl mb-3 comm-float inline-block">{mission.emoji}</div>
          <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Mission {mission.num}</p>
          <h2 className="text-xl font-black">{mission.title}</h2>
          <p className="text-white/75 text-xs mt-1.5 font-medium leading-relaxed">{mission.desc}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* AI Character */}
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl ${mission.character.bg}`}>
          <div className="text-3xl">{mission.character.avatar}</div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Your AI Partner</p>
            <p className="font-black text-slate-900 text-sm">{mission.character.name}</p>
            <p className="text-xs text-slate-500 font-medium">{mission.character.role}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <p className="text-xs font-black text-slate-700">{mission.duration}</p>
            <p className="text-[9px] text-slate-400 font-medium">Duration</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <Zap className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs font-black text-emerald-700">+{mission.xp} XP</p>
            <p className="text-[9px] text-emerald-400 font-medium">Reward</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${DIFF_COLORS[mission.difficulty]}`}>
            <Target className="w-4 h-4 mx-auto mb-1 opacity-60" />
            <p className="text-xs font-black">{mission.difficulty}</p>
            <p className="text-[9px] opacity-60 font-medium">Level</p>
          </div>
        </div>

        {/* Skills */}
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Skills You'll Practice</p>
          <div className="flex flex-wrap gap-1.5">
            {mission.skills.map(s => (
              <span key={s} className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5">
          <p className="text-[10px] font-black text-emerald-700 mb-1 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" /> How it works
          </p>
          <p className="text-[10px] text-emerald-600 font-medium leading-relaxed">
            {mission.character.name} will start the conversation. Respond naturally by voice — the AI adapts dynamically to everything you say.
          </p>
        </div>

        {error && <p className="text-xs text-red-500 font-semibold text-center">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onBack} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors">
            Back
          </button>
          <button onClick={onStart} disabled={isStarting}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-black text-sm rounded-2xl transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isStarting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Starting…</>
              : <><Play className="w-4 h-4" /> Begin Mission</>
            }
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
export const ConversationPractice: React.FC = () => {
  const { session, user: authUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routerState = (location.state as any) || {};

  // ── Synchronously resolve mission from router state so we start in the
  //    correct step immediately — no async useEffect race condition.
  const _initialMission = routerState.missionId
    ? ALL_MISSIONS.find(m => m.id === routerState.missionId) ?? null
    : null;

  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<ConvStep>(() => _initialMission ? 'brief' : 'select');
  const [selectedWorld, setSelectedWorld] = useState<string | null>(() => _initialMission?.worldId ?? null);
  const [selectedMission, setSelectedMission] = useState<MissionDef | null>(() => _initialMission);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [report, setReport] = useState<any>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const speechServiceRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    return () => {
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
      speechServiceRef.current?.stopRecording().catch(() => {});
    };
  }, []);

  useEffect(() => { setToken(session?.access_token || null); }, [session]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  const speakAI = useCallback((text: string) => {
    if (isMuted) return;
    setIsAiSpeaking(true);
    speakText(text, () => setIsAiSpeaking(false), speechServiceRef.current || undefined);
  }, [isMuted]);

  const handleStartSession = async () => {
    if (!selectedMission || !token) return;
    setIsStarting(true);
    setError(null);
    try {
      const data = await apiCall('POST', '/api/communication/session', token, {
        mission_id: selectedMission.id,
        world_id: selectedMission.worldId,
        difficulty: selectedMission.difficulty,
        title: selectedMission.title,
      });
      setActiveSession(data.session);
      const firstMsg: Message = { id: data.initial_message.id, sender: 'ai', text: data.initial_message.message_text, ts: Date.now() };
      setMessages([firstMsg]);
      setStep('chatting');
      speakAI(firstMsg.text);
    } catch (err: any) {
      setError(err.message || 'Failed to start. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const startRecording = async () => {
    if (!speechServiceRef.current || isRecording || isAiSpeaking) return;
    window.speechSynthesis?.cancel();
    setIsAiSpeaking(false);
    setCurrentTranscript('');
    setIsRecording(true);
    setRecordingSecs(0);
    timerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    try {
      await speechServiceRef.current.startRecording(
        (text) => setCurrentTranscript(text),
        () => {}
      );
    } catch {}
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    if (!speechServiceRef.current) return;
    let finalText = currentTranscript;
    try {
      const result = await speechServiceRef.current.stopRecording();
      if (result && result.length > 0) finalText = result;
    } catch {}

    const isValid = finalText && finalText.trim().length >= 4 && recordingSecs >= 1.2 && /[a-zA-Z]/.test(finalText);
    if (!isValid) {
      setError("Looks like I didn't hear your response. Please try again.");
      setCurrentTranscript('');
      return;
    }

    setError(null);
    await sendUserMessage(finalText.trim());
    setCurrentTranscript('');
  };

  const sendUserMessage = async (text: string) => {
    if (!activeSession || !token) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setAiTyping(true);
    try {
      const data = await apiCall('POST', `/api/communication/session/${activeSession.id}/message`, token, { message_text: text });
      const aiMsg: Message = { id: data.ai_message.id, sender: 'ai', text: data.ai_message.message_text, ts: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
      speakAI(aiMsg.text);
    } catch {
      setError('Failed to get AI response. Please try again.');
    } finally {
      setAiTyping(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession || !token) return;
    window.speechSynthesis?.cancel();
    setIsAiSpeaking(false);
    setIsEnding(true);
    setStep('ending');
    setShowEndConfirm(false);
    setError(null);
    try {
      const data = await apiCall('POST', `/api/communication/session/${activeSession.id}/end`, token);
      setReport(data.feedback);
      setXpEarned(data.xp_earned || 80);
      setStep('report');
    } catch (err: any) {
      setError('Failed to generate report. ' + (err.message || ''));
      setStep('chatting');
    } finally {
      setIsEnding(false);
    }
  };

  const handleRestart = () => {
    window.speechSynthesis?.cancel();
    setStep('select');
    setSelectedMission(null);
    setSelectedWorld(null);
    setMessages([]);
    setReport(null);
    setXpEarned(0);
    setActiveSession(null);
    setError(null);
    setCurrentTranscript('');
  };

  const userMsgCount = messages.filter(m => m.sender === 'user').length;
  const returnPath = routerState.returnPath || '/communication';
  const currentWorld = WORLDS.find(w => w.id === selectedWorld);
  const overallScore = report?.overall_score || 75;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">

      {/* Mission Brief Overlay */}
      {step === 'brief' && selectedMission && (
        <MissionBriefOverlay
          mission={selectedMission}
          worldGradient={currentWorld?.gradient || 'from-emerald-600 to-teal-700'}
          onStart={handleStartSession}
          onBack={() => { setStep('select'); setSelectedMission(null); }}
          isStarting={isStarting}
          error={error}
        />
      )}

      {/* End Session Confirm Modal */}
      {showEndConfirm && (
        <div className="comm-session-overlay p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl comm-fade-scale text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto text-2xl">🏁</div>
            <div>
              <h3 className="text-base font-black text-slate-900">End this session?</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Your conversation so far ({userMsgCount} responses) will be analyzed and scored.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">
                Keep Going
              </button>
              <button onClick={handleEndSession} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black text-sm rounded-xl transition-colors shadow">
                End & Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact nav during chatting, full nav otherwise */}
      {step === 'chatting' ? (
        <CommNav compact backLabel="Exit Session" onBack={() => setShowEndConfirm(true)} />
      ) : step === 'select' || step === 'brief' ? (
        <CommNav compact backLabel={selectedWorld ? 'Worlds' : 'Home'} onBack={() => selectedWorld ? setSelectedWorld(null) : navigate('/communication')} />
      ) : (
        <CommNav compact backLabel="Home" onBack={() => navigate('/communication')} />
      )}

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 pt-16 pb-12">

        {/* ── Error Banner ── */}
        {error && step !== 'brief' && (
          <div className="mt-4 mb-2 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ══ STEP: SELECT ══════════════════════════════════════════════════════ */}
        {step === 'select' && (
          <div className="pt-6 space-y-8 comm-slide-up">
            {!selectedWorld ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg comm-float">
                    🌍
                  </div>
                  <h1 className="text-2xl font-black text-slate-900">Choose Your World</h1>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Each world has unique scenarios and AI characters</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {WORLDS.map(w => (
                    <button key={w.id} onClick={() => setSelectedWorld(w.id)}
                      className="group text-left rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 comm-world-card"
                    >
                      <div className={`h-24 bg-gradient-to-br ${w.gradient} flex items-center justify-center relative`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        <span className="text-4xl relative z-10" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}>{w.emoji}</span>
                      </div>
                      <div className="bg-white p-4">
                        <p className="font-black text-slate-900 text-sm">{w.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">{w.missions.length} missions available</p>
                        <div className="flex items-center gap-1 mt-2.5 text-xs text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Pick a mission <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* World banner */}
                <div className={`rounded-2xl overflow-hidden bg-gradient-to-br ${currentWorld?.gradient}`}>
                  <div className="p-4 flex items-center gap-3">
                    <span className="text-3xl">{currentWorld?.emoji}</span>
                    <div>
                      <p className="text-white font-black text-base">{currentWorld?.label}</p>
                      <p className="text-white/60 text-xs font-medium">Select a mission to begin</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {currentWorld?.missions.map((mission, i) => (
                    <button key={mission.id}
                      onClick={() => { setSelectedMission(mission as MissionDef); setStep('brief'); }}
                      className="w-full group bg-white border border-slate-200 rounded-2xl hover:shadow-lg hover:border-emerald-200 transition-all duration-200 text-left flex items-center gap-4 p-4 comm-tool-card"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mission.gradient} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
                        {mission.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-slate-900 text-sm">Mission {i + 1} — {mission.title}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${DIFF_COLORS[mission.difficulty]}`}>
                            {mission.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">{mission.desc}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mission.duration}</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-500" />+{mission.xp} XP</span>
                          <span className="flex items-center gap-1">{mission.character.avatar} {mission.character.name}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ STEP: CHATTING ════════════════════════════════════════════════════ */}
        {step === 'chatting' && selectedMission && (
          <div className="flex flex-col gap-3 pt-6" style={{ height: 'calc(100vh - 100px)', minHeight: '500px' }}>

            {/* Session top bar */}
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${selectedMission.character.bg} flex items-center justify-center text-xl shadow-sm`}>
                  {selectedMission.character.avatar}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{selectedMission.character.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{selectedMission.character.role}</p>
                </div>
                {isAiSpeaking && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-full animate-pulse">
                    <Volume2 className="w-3 h-3 text-emerald-600" />
                    <span className="text-[9px] font-black text-emerald-700">Speaking…</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-full">
                  <MessageSquare className="w-3 h-3" /> {userMsgCount}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                  <Zap className="w-3 h-3" /> +{selectedMission.xp}
                </div>
                <button onClick={() => setIsMuted(m => !m)}
                  className={`p-1.5 rounded-xl border transition-colors ${isMuted ? 'bg-red-50 border-red-200 text-red-500' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setShowEndConfirm(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-red-600 text-white text-[10px] font-black rounded-xl transition-all"
                >
                  End Session
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse comm-bubble-user' : 'comm-bubble-ai'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-sm ${
                    msg.sender === 'ai' ? `${selectedMission.character.bg}` : 'bg-slate-900'
                  }`}>
                    {msg.sender === 'ai' ? selectedMission.character.avatar : <User className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'ai'
                      ? 'bg-white border border-slate-200 rounded-bl-sm text-slate-800'
                      : 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiTyping && <TypingDots avatar={selectedMission.character.avatar} />}
              <div ref={chatEndRef} />
            </div>

            {/* Voice input bar */}
            <div className={`bg-white border rounded-2xl p-4 flex-shrink-0 shadow-sm transition-all ${isRecording ? 'border-red-200 shadow-red-100' : 'border-slate-200'}`}>
              {isRecording ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="text-xs font-black text-red-600">Recording — 0:{String(recordingSecs).padStart(2, '0')}</span>
                    </div>
                    <Waveform active={true} />
                    {currentTranscript && (
                      <p className="text-[10px] text-slate-400 italic mt-1.5 truncate">"{currentTranscript}"</p>
                    )}
                  </div>
                  <button onClick={stopRecording}
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all comm-mic-btn flex-shrink-0"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      {isAiSpeaking
                        ? `${selectedMission.character.name} is speaking…`
                        : aiTyping ? 'AI is thinking…'
                        : 'Your turn to respond'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {isAiSpeaking
                        ? 'Wait for them to finish, then tap the mic'
                        : 'Tap the mic and speak your response by voice'}
                    </p>
                  </div>
                  <button onClick={startRecording} disabled={aiTyping || isAiSpeaking}
                    className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg transition-all comm-mic-btn flex-shrink-0 ${
                      aiTyping || isAiSpeaking
                        ? 'bg-slate-200 cursor-not-allowed'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:opacity-90 comm-pulse-ring'
                    }`}
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ STEP: ENDING ═════════════════════════════════════════════════════ */}
        {step === 'ending' && (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-5 comm-slide-up">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center relative z-10 shadow-xl comm-breath">
                <Activity className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900">Generating Your Report</h2>
            <p className="text-sm text-slate-500 font-medium">Analyzing {userMsgCount} responses…</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* ══ STEP: REPORT ═════════════════════════════════════════════════════ */}
        {step === 'report' && report && selectedMission && (
          <div className="pt-6 space-y-5 comm-reveal-up">

            {/* ── Score Hero ── */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentWorld?.gradient || 'from-emerald-600 to-teal-700'} text-white shadow-2xl p-6`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">{selectedMission.character.avatar}</div>
                  <div>
                    <p className="text-white/60 text-[9px] font-black uppercase tracking-widest">{selectedMission.title}</p>
                    <p className="text-white/80 text-xs font-bold">{selectedMission.character.name}</p>
                  </div>
                  <div className="ml-auto">
                    <div className="flex items-center gap-1.5 bg-white/20 border border-white/20 rounded-xl px-3 py-1.5">
                      <Trophy className="w-3.5 h-3.5 text-white/80" />
                      <span className="text-xs font-black text-white/90">Session Complete</span>
                    </div>
                  </div>
                </div>

                {/* Big score numbers */}
                <div className="flex items-center justify-around text-center">
                  <div className="comm-score-reveal">
                    <p className="text-5xl font-black tracking-tight">{overallScore}</p>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide mt-1">Overall Score</p>
                  </div>
                  <div className="w-px h-16 bg-white/20" />
                  <div className="comm-score-reveal-delay">
                    <p className="text-5xl font-black tracking-tight text-white">+{xpEarned}</p>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide mt-1">XP Earned</p>
                  </div>
                  <div className="w-px h-16 bg-white/20" />
                  <div className="comm-score-reveal-delay" style={{ animationDelay: '0.4s' }}>
                    <p className="text-5xl font-black tracking-tight">{userMsgCount}</p>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide mt-1">Responses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Score Breakdown ── */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> Skill Breakdown
              </h3>
              <div className="space-y-3">
                {SKILL_COLORS.map((s, i) => (
                  <ScoreBar key={s.key} label={s.label} score={report[s.key] || 75} bg={s.bg} delay={i * 0.1} />
                ))}
              </div>
            </div>

            {/* ── Strengths & Improvements ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <CheckCircle className="w-3.5 h-3.5" /> Strengths
                </p>
                <ul className="space-y-2">
                  {(report.strengths || ['Good communication attempt', 'Showed strong engagement']).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-700 font-semibold flex gap-2 leading-relaxed">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-[10px] font-black comm-check-reveal" style={{ animationDelay: `${i * 0.15 + 0.5}s` }}>✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Areas to Improve
                </p>
                <ul className="space-y-2">
                  {(report.areas_to_improve || ['Expand vocabulary', 'Reduce filler words']).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-700 font-semibold flex gap-2 leading-relaxed">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-[10px] font-black">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── AI Coaching Tips ── */}
            {report.suggestions?.length > 0 && (
              <div className="bg-slate-900 rounded-3xl p-5 text-white">
                <p className="text-xs font-black text-emerald-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <Bot className="w-3.5 h-3.5" /> AI Coach Tips
                </p>
                <ul className="space-y-2.5">
                  {report.suggestions.map((s: string, i: number) => (
                    <li key={i} className="text-xs font-medium text-slate-300 flex gap-2.5 leading-relaxed">
                      <Star className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('brief');
                  setMessages([]);
                  setReport(null);
                  setXpEarned(0);
                  setActiveSession(null);
                  setError(null);
                  setCurrentTranscript('');
                }}
                className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retry Mission
              </button>
              <button
                onClick={() => navigate(returnPath)}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" /> Next Mission
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
