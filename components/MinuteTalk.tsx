// components/MinuteTalk.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Square, RefreshCw, Activity, Award, BarChart2, CheckCircle2, 
  Lightbulb, AlertCircle, Volume2, BookOpen, Clock, AlertTriangle, 
  HelpCircle, ChevronRight, XCircle, FileText, Check, ArrowRight
} from 'lucide-react';
import { TopicGenerator, TopicDifficulty, TopicCategory } from '../src/lib/topicGenerator';
import { MinuteTalkFeedback } from '../types';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { AILoader } from '../src/components/AILoader';

// New Speech Pipeline Imports
import { SpeechRecorder, PauseEvent } from '../src/speech/recorder';
import { SpeechRecognitionService } from '../src/speech/speechRecognition';
import { MetricsTracker } from '../src/speech/metrics';
import { evaluateSpeech } from '../src/speech/evaluator';

interface SessionStats {
  bestScore: number;
  lastScore: number;
  totalSessions: number;
}

export const MinuteTalk: React.FC = () => {
  const { user } = useAuth();

  // Topic State
  const [topicObj, setTopicObj] = useState<{topic: string; category: TopicCategory; difficulty: TopicDifficulty} | null>(null);
  const [difficultySetting] = useState<TopicDifficulty | 'Mixed'>('Mixed');
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [transcript, setTranscript] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Real-time metrics
  const [runningWpm, setRunningWpm] = useState(0);
  const [runningWords, setRunningWords] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isWhisperActive, setIsWhisperActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Feedback State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<MinuteTalkFeedback | null>(null);
  const [activeTab, setActiveTab] = useState<'scores' | 'grammar' | 'vocabulary' | 'fillers' | 'pauses'>('scores');
  
  // Gamification State
  const [stats, setStats] = useState<SessionStats>({ bestScore: 0, lastScore: 0, totalSessions: 0 });

  // Pipeline Refs
  const recorderRef = useRef<SpeechRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);
  const metricsTrackerRef = useRef<MetricsTracker>(new MetricsTracker());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>('');

  const loadStats = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('minute_talk_sessions')
        .select('final_score')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const allScores = data.map((s: { final_score: number | null }) => s.final_score).filter((s: number | null): s is number => s != null);
        if (allScores.length > 0) {
          setStats({
            bestScore: Math.max(...allScores),
            lastScore: allScores[0],
            totalSessions: allScores.length
          });
        }
      }
    } catch (err) {
      console.error('Error loading stats from DB:', err);
      // Fallback to local storage
      try {
        const savedStats = localStorage.getItem('hireready_jam_stats');
        if (savedStats) setStats(JSON.parse(savedStats));
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadStats();
    handleNewTopic();

    return () => {
      stopSession(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateLocalStats = (newScore: number) => {
    const newStats = {
      bestScore: Math.max(stats.bestScore, newScore),
      lastScore: newScore,
      totalSessions: stats.totalSessions + 1
    };
    setStats(newStats);
    localStorage.setItem('hireready_jam_stats', JSON.stringify(newStats));
  };

  const handleNewTopic = () => {
    if (isRecording) stopSession(false);
    setFeedback(null);
    setTopicObj(TopicGenerator.generateTopic(difficultySetting));
    setTranscript('');
    transcriptRef.current = '';
    setTimeLeft(60);
    setRunningWpm(0);
    setRunningWords(0);
    setElapsedTime(0);
    setMicError(null);
    setIsWhisperActive(false);
  };

  const startSession = async () => {
    if (!topicObj || !user) return;
    setTranscript('');
    transcriptRef.current = '';
    setFeedback(null);
    setIsRecording(true);
    setTimeLeft(60);
    setRunningWpm(0);
    setRunningWords(0);
    setElapsedTime(0);
    setMicError(null);
    setIsWhisperActive(false);
    setActiveSessionId(null);

    // Initialize pipeline objects
    metricsTrackerRef.current.reset();
    metricsTrackerRef.current.start();

    // 1. Create Speech Recognition Service
    const recognition = new SpeechRecognitionService({
      onTranscriptUpdate: (text) => {
        setTranscript(text);
        transcriptRef.current = text;
        
        // Update real-time word count and WPM
        const metrics = metricsTrackerRef.current.getMetrics(text);
        setRunningWords(metrics.wordCount);
        setRunningWpm(metrics.wpm);
      },
      onError: (err) => {
        setMicError(err);
        stopSession(false);
      }
    });
    recognitionRef.current = recognition;
    setIsWhisperActive(recognition.getIsFallbackActive());

    // 2. Create Speech Recorder (Web Audio pause detection + MediaRecorder)
    const recorder = new SpeechRecorder({
      onVolumeChange: (vol) => {
        setVolume(vol);
      },
      onDataAvailable: async (blob) => {
        // If Whisper fallback is active, send slices for real-time transcription
        if (recognitionRef.current?.getIsFallbackActive()) {
          setIsWhisperActive(true);
          await recognitionRef.current.processAudioSlice(blob);
        }
      }
    });
    recorderRef.current = recorder;

    try {
      // Start recording
      await recorder.start();
      await recognition.start();

      // Database entry
      const { data, error } = await supabase
        .from('minute_talk_sessions')
        .insert({
          user_id: user.id,
          topic: topicObj.topic,
          category: topicObj.category,
          difficulty: topicObj.difficulty,
          status: 'active'
        })
        .select('id')
        .single();
        
      if (error) console.error("Could not start session in DB:", error);
      if (data?.id) setActiveSessionId(data.id);
      
    } catch (err: any) {
      console.error('Failed to start speech pipeline:', err);
      setMicError(err.message || 'Microphone error occurred.');
      setIsRecording(false);
      cleanupPipeline();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopSession(true);
          return 0;
        }
        
        const elapsed = metricsTrackerRef.current.updateElapsed();
        setElapsedTime(elapsed);

        // Update real-time WPM
        const metrics = metricsTrackerRef.current.getMetrics(transcriptRef.current);
        setRunningWpm(metrics.wpm);
        setRunningWords(metrics.wordCount);

        return prev - 1;
      });
    }, 1000);
  };

  const stopSession = async (analyze: boolean = true) => {
    setIsRecording(false);
    setVolume(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    let finalBlob: Blob | undefined;
    let pauseEvents: PauseEvent[] = [];
    let finalTranscript = transcriptRef.current;

    // Stop recorder
    if (recorderRef.current) {
      try {
        const recResult = await recorderRef.current.stop();
        finalBlob = recResult.blob;
        pauseEvents = recResult.pauseEvents;
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
    }

    // Stop recognition
    if (recognitionRef.current) {
      try {
        finalTranscript = await recognitionRef.current.stop(finalBlob);
        setTranscript(finalTranscript);
        transcriptRef.current = finalTranscript;
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }

    cleanupPipeline();

    if (analyze && topicObj) {
      setIsAnalyzing(true);
      try {
        const duration = Math.max(1, 60 - timeLeft);
        const result = await evaluateSpeech(topicObj.topic, finalTranscript, duration, pauseEvents);
        
        setFeedback(result);
        updateLocalStats(result.finalScore);
        
        if (activeSessionId && user) {
          const { error } = await supabase
            .from('minute_talk_sessions')
            .update({
              status: 'completed',
              transcript: finalTranscript,
              duration_seconds: duration,
              content_score: result.contentScore,
              fluency_score: result.fluencyScore,
              wpm: result.wpm,
              filler_count: result.fillerCount,
              top_filler: result.topFiller,
              structure_score: result.structureScore,
              confidence_score: result.confidenceScore,
              final_score: result.finalScore,
              suggestions: result.suggestions,
              completed_at: new Date().toISOString()
            })
            .eq('id', activeSessionId);
            
          if (error) console.error("Could not save session completion to DB:", error);
        }
      } catch (err) {
        console.error("Speech analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
        setActiveSessionId(null);
      }
    }
  };

  const cleanupPipeline = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current = null;
    recognitionRef.current = null;
  };

  const renderProgressBar = (label: string, value: number, max: number = 10, colorClass: string = 'bg-emerald-500') => {
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm font-semibold mb-1.5">
          <span className="text-slate-600">{label}</span>
          <span className="text-slate-800">{value}/{max}</span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClass} transition-all duration-1000 ease-out rounded-full`} 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 mt-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Gamification Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Best Score</p>
              <p className="text-xl font-[900] text-slate-800 tabular-nums">{stats.bestScore}/100</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Score</p>
              <p className="text-xl font-[900] text-slate-800 tabular-nums">{stats.lastScore}/100</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <BarChart2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sessions</p>
              <p className="text-xl font-[900] text-slate-800 tabular-nums">{stats.totalSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Topic & Controls */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center relative overflow-hidden">
            
            {/* Difficulty Badge */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r 
              ${topicObj?.difficulty === 'Easy' ? 'from-green-400 to-emerald-500' : 
                topicObj?.difficulty === 'Medium' ? 'from-yellow-400 to-amber-500' : 
                topicObj?.difficulty === 'Hard' ? 'from-orange-400 to-red-500' : 
                'from-rose-500 to-purple-600'}`} 
            />

            <div className="w-full flex justify-between items-center mb-6 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {topicObj?.category}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md
                  ${topicObj?.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 
                    topicObj?.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 
                    topicObj?.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 
                    'bg-purple-100 text-purple-700'}`}>
                  {topicObj?.difficulty}
                </span>
              </div>
              
              <button 
                onClick={handleNewTopic}
                disabled={isRecording || isAnalyzing}
                className="text-sm font-bold text-[#10B981] hover:text-[#059669] flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} /> Skip
              </button>
            </div>
            
            <h3 className="text-xl font-[800] text-slate-800 text-center mb-6 px-2 tracking-tight leading-snug min-h-[5rem] flex items-center justify-center">
              "{topicObj?.topic || "Generating topic..."}"
            </h3>

            {/* Mic Error Display */}
            {micError && (
              <div className="w-full flex gap-2 items-center bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 mb-4 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            {/* Whisper Status Display */}
            {isRecording && isWhisperActive && (
              <div className="w-full flex gap-2 items-center bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-100 mb-4 text-[11px] font-semibold animate-pulse">
                <Activity size={14} className="shrink-0" />
                <span>Whisper Cloud STT Active (Firefox fallback)</span>
              </div>
            )}

            {/* Visualizer & Timer */}
            <div className="flex flex-col items-center w-full mb-4">
              <div className="text-5xl font-[900] text-slate-800 mb-4 tabular-nums">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                {String(timeLeft % 60).padStart(2, '0')}
              </div>

              {/* Volume Visualizer Equalizer */}
              {isRecording && (
                <div className="flex items-center justify-center gap-1 h-8 mb-6">
                  {[...Array(9)].map((_, i) => {
                    const scale = Math.max(0.1, volume * (1 - Math.abs(i - 4) * 0.15) * 5);
                    return (
                      <div 
                        key={i} 
                        className="w-1 bg-[#10B981] rounded-full transition-all duration-75"
                        style={{ height: `${Math.min(100, scale * 100)}%` }}
                      />
                    );
                  })}
                </div>
              )}

              {isRecording ? (
                <button
                  onClick={() => stopSession(true)}
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.4)] text-white flex items-center justify-center transition-all animate-pulse"
                >
                  <Square size={28} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={startSession}
                  disabled={isAnalyzing}
                  className="w-20 h-20 rounded-full bg-[#10B981] hover:bg-[#059669] shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-white flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Mic size={32} />
                </button>
              )}
              
              <p className="text-sm font-bold text-slate-500 mt-4">
                {isRecording ? 'Listening... click square to stop' : isAnalyzing ? 'Analyzing your speech...' : 'Tap to Start Speaking'}
              </p>
            </div>

            {/* Real-time speech stats cards */}
            {isRecording && (
              <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                    <Clock size={10} /> Time
                  </div>
                  <div className="text-sm font-black text-slate-700">{elapsedTime}s</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                    <BookOpen size={10} /> Words
                  </div>
                  <div className="text-sm font-black text-slate-700">{runningWords}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                    <Volume2 size={10} /> WPM
                  </div>
                  <div className="text-sm font-black text-slate-700">{runningWpm}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transcription & Feedback */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          
          {/* Live Transcription */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-all min-h-[300px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
              Speech Transcript
              {isRecording && (
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Recording</span>
                </span>
              )}
            </h3>
            
            <div className="flex-1 overflow-y-auto w-full bg-slate-50 rounded-xl p-5 border border-slate-100">
              {transcript ? (
                <p className="text-slate-700 font-medium text-[1.05rem] leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                  {isAnalyzing ? (
                    <AILoader inline messages={[
                      "Linguistic analysis of transcript...",
                      "Evaluating paragraph structure...",
                      "Calculating lexical diversity & richness...",
                      "Detecting subject-verb grammar agreement...",
                      "Gauging pause rhythm and fillers..."
                    ]} />
                  ) : (
                    <>
                      <Mic size={32} className="mb-3 opacity-30" />
                      <p className="font-medium text-sm text-center">
                        Speak clearly into your microphone.<br/>Text will stream here in real-time.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Feedback Report Card */}
          {feedback && !isRecording && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-emerald-100 animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-xl font-[900] text-slate-800 flex items-center gap-2">
                  <Award className="text-[#10B981]" /> Speech Evaluation Report
                </h3>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Score</div>
                  <div className={`text-4xl font-[900] tabular-nums ${
                    feedback.finalScore >= 80 ? 'text-emerald-500' : feedback.finalScore >= 60 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {feedback.finalScore}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap border-b border-slate-100 gap-1">
                {(['scores', 'grammar', 'vocabulary', 'fillers', 'pauses'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 uppercase tracking-wider ${
                      activeTab === tab
                        ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content Panels */}
              <div className="pt-2">
                {activeTab === 'scores' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      {renderProgressBar('Content Quality', feedback.contentScore, 10, 'bg-emerald-500')}
                      {renderProgressBar('Structure', feedback.structureScore, 10, 'bg-blue-500')}
                      {renderProgressBar('Fluency', feedback.fluencyScore, 10, 'bg-indigo-500')}
                      {renderProgressBar('Confidence', feedback.confidenceScore, 10, 'bg-purple-500')}
                      {renderProgressBar('Grammar', feedback.grammarScore || 0, 10, 'bg-rose-500')}
                      {renderProgressBar('Vocabulary', feedback.vocabularyScore || 0, 10, 'bg-amber-500')}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Speaking Speed</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-[900] text-slate-800">{feedback.wpm}</span>
                          <span className="text-sm font-bold text-slate-500">WPM</span>
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            feedback.wpm >= 120 && feedback.wpm <= 150 
                              ? 'bg-green-100 text-green-700' 
                              : feedback.wpm >= 100 && feedback.wpm <= 180 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {feedback.wpm < 100 ? 'Very Slow' : feedback.wpm < 120 ? 'Slow' : feedback.wpm <= 150 ? 'Good Pace' : feedback.wpm <= 180 ? 'Fast' : 'Very Fast'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rhythm Pauses</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-[900] text-slate-800">{feedback.pauseAnalysis?.count || 0}</span>
                          <span className="text-sm font-bold text-slate-500">long pauses</span>
                          {feedback.pauseAnalysis && feedback.pauseAnalysis.count > 0 && (
                            <span className="ml-auto text-xs font-bold text-slate-500">
                              Avg: {feedback.pauseAnalysis.averagePause}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'grammar' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grammar Coach Rating</div>
                        <div className="text-2xl font-black text-slate-800">{feedback.grammarScore}/10</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        (feedback.grammarScore || 0) >= 8 ? 'bg-green-100 text-green-700' : (feedback.grammarScore || 0) >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {(feedback.grammarScore || 0) >= 8 ? 'Proficient' : (feedback.grammarScore || 0) >= 5 ? 'Intermediate' : 'Needs Improvement'}
                      </span>
                    </div>

                    {/* Mistakes Table */}
                    {feedback.grammarAnalysis?.mistakes && feedback.grammarAnalysis.mistakes.length > 0 ? (
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                              <th className="p-3">Spoken</th>
                              <th className="p-3">Corrected</th>
                              <th className="p-3">Rule/Explanation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {feedback.grammarAnalysis.mistakes.map((mistake, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-3 text-red-600 font-semibold align-top">{mistake.original}</td>
                                <td className="p-3 text-emerald-600 font-semibold align-top">{mistake.corrected}</td>
                                <td className="p-3 text-slate-600 align-top">
                                  <span className="inline-block bg-slate-100 text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-500 mr-1.5 uppercase">{mistake.type}</span>
                                  {mistake.explanation}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 text-emerald-800 text-xs font-medium items-center justify-center py-8">
                        <CheckCircle2 className="text-emerald-500" size={24} />
                        <span>Fantastic! No grammatical mistakes detected in your speech. Your sentences show correct structure and agreement.</span>
                      </div>
                    )}

                    {feedback.grammarAnalysis?.suggestions && feedback.grammarAnalysis.suggestions.length > 0 && (
                      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mt-4">
                        <div className="text-xs font-bold text-blue-800 uppercase mb-2">Grammar Tips</div>
                        <ul className="list-disc pl-4 text-xs font-medium text-slate-600 space-y-1.5">
                          {feedback.grammarAnalysis.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'vocabulary' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lexical Diversity</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-[900] text-slate-800">{Math.round((feedback.vocabularyAnalysis?.lexicalDiversity || 0) * 100)}%</span>
                          <span className="text-xs font-semibold text-slate-500">unique words</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 font-medium">
                          Lexical diversity measures how many unique words you used compared to the total words spoken.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Word Counts</div>
                        <div className="grid grid-cols-2 gap-2 text-center mt-1">
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Unique</div>
                            <div className="text-lg font-black text-slate-700">{feedback.vocabularyAnalysis?.uniqueCount || 0}</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Repeated</div>
                            <div className="text-lg font-black text-slate-700">{feedback.vocabularyAnalysis?.repeatedCount || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Words Detected */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Advanced Vocabulary Used</h4>
                      {feedback.vocabularyAnalysis?.advancedWords && feedback.vocabularyAnalysis.advancedWords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {feedback.vocabularyAnalysis.advancedWords.map((word, i) => (
                            <span key={i} className="bg-amber-50 text-amber-800 border border-amber-200/60 px-3 py-1 rounded-xl text-xs font-bold capitalize shadow-sm">
                              {word}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium italic">No advanced vocabulary keywords detected. Try incorporating richer adjectives, synonyms, or domain-specific verbs.</p>
                      )}
                    </div>

                    {/* Frequently Repeated Words list */}
                    {feedback.vocabularyAnalysis?.repeatedWordsDetail && feedback.vocabularyAnalysis.repeatedWordsDetail.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Most Repeated Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {feedback.vocabularyAnalysis.repeatedWordsDetail.slice(0, 5).map((item, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                              "{item.word}" ({item.count}x)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'fillers' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Filler Word Ratio</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-[900] text-slate-800">{feedback.fillerWordsAnalysis?.percentage || 0}%</span>
                          <span className="text-xs font-semibold text-slate-500">of total speech</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Fillers Used</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-[900] text-slate-800">{feedback.fillerWordsAnalysis?.totalCount || 0}</span>
                          <span className="text-xs font-semibold text-slate-500">fillers</span>
                          {feedback.topFiller !== 'None' && (
                            <span className="ml-auto text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                              Mostly: "{feedback.topFiller}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    {feedback.fillerWordsAnalysis?.counts && Object.keys(feedback.fillerWordsAnalysis.counts).length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Filler Words Breakdown</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(feedback.fillerWordsAnalysis.counts).map(([word, count]) => (
                            <div key={word} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-700 capitalize">"{word}"</span>
                              <span className="font-black text-red-500 bg-red-50 px-2 py-0.5 rounded">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {feedback.fillerWordsAnalysis?.suggestions && feedback.fillerWordsAnalysis.suggestions.length > 0 && (
                      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl mt-4">
                        <div className="text-xs font-bold text-amber-800 uppercase mb-2 flex items-center gap-1.5">
                          <AlertTriangle size={14} /> Filler Reduction Tip
                        </div>
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                          {feedback.fillerWordsAnalysis.suggestions[0]}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'pauses' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Long Pauses</div>
                        <div className="text-2xl font-black text-slate-800">{feedback.pauseAnalysis?.count || 0}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-1">&gt;1.5s duration</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Average Pause</div>
                        <div className="text-2xl font-black text-slate-800">{feedback.pauseAnalysis?.averagePause || 0}s</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-1">silence duration</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Longest Pause</div>
                        <div className="text-2xl font-black text-slate-800">{feedback.pauseAnalysis?.longestPause || 0}s</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-1">single pause duration</div>
                      </div>
                    </div>

                    {/* Timeline of pauses */}
                    {feedback.pauseAnalysis?.list && feedback.pauseAnalysis.list.length > 0 ? (
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Pause Events Timeline</h4>
                        <div className="space-y-2">
                          {feedback.pauseAnalysis.list.map((pause, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                              <span className="font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded">#{idx + 1}</span>
                              <span className="text-slate-500 font-medium">Paused at <span className="font-semibold text-slate-700">{pause.start}s</span></span>
                              <span className="ml-auto text-slate-500 font-medium">Duration: <span className="font-bold text-red-500">{pause.duration} seconds</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs font-medium italic">
                        Excellent rhythm! No long pauses exceeding 1.5 seconds were detected. Your speaking flow was stable and continuous.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actionable Suggestions */}
              {feedback.detailedActionableFeedback && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-500" /> Topic-Specific Feedback
                  </h4>
                  <div className="grid gap-3">
                    {feedback.detailedActionableFeedback.content && (
                      <div className="flex gap-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/50">
                        <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase shrink-0 mt-0.5">Content</div>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{feedback.detailedActionableFeedback.content}</p>
                      </div>
                    )}
                    {feedback.detailedActionableFeedback.structure && (
                      <div className="flex gap-3 bg-blue-50/40 p-3.5 rounded-xl border border-blue-100/50">
                        <div className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded uppercase shrink-0 mt-0.5">Structure</div>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{feedback.detailedActionableFeedback.structure}</p>
                      </div>
                    )}
                    {feedback.detailedActionableFeedback.grammar && (
                      <div className="flex gap-3 bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/50">
                        <div className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded uppercase shrink-0 mt-0.5">Grammar</div>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{feedback.detailedActionableFeedback.grammar}</p>
                      </div>
                    )}
                    {feedback.detailedActionableFeedback.vocabulary && (
                      <div className="flex gap-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/50">
                        <div className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase shrink-0 mt-0.5">Vocabulary</div>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{feedback.detailedActionableFeedback.vocabulary}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Suggestions bullets list */}
              {feedback.suggestions && feedback.suggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Overall Recommendations</h4>
                  <div className="grid gap-2">
                    {feedback.suggestions.map((tip, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
