import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Activity, Award, BarChart2, CheckCircle2, Lightbulb } from 'lucide-react';
import { SpeechService } from '../services/speechService';
import { TopicGenerator, TopicDifficulty, TopicCategory } from '../src/lib/topicGenerator';
import { generateMinuteTalkFeedback } from '../src/lib/speechAnalysis';
import { MinuteTalkFeedback } from '../types';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';

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
  
  // Feedback State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<MinuteTalkFeedback | null>(null);
  
  // Gamification State
  const [stats, setStats] = useState<SessionStats>({ bestScore: 0, lastScore: 0, totalSessions: 0 });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechServiceRef = useRef<SpeechService>(new SpeechService());

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
        const allScores = data.map(s => s.final_score).filter((s): s is number => s != null);
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

    // Initial topic
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
    setTimeLeft(60);
  };

  const startSession = async () => {
    if (!topicObj || !user) return;
    setTranscript('');
    setFeedback(null);
    setIsRecording(true);
    setTimeLeft(60);
    setActiveSessionId(null);

    try {
      await speechServiceRef.current.startRecording(
        (text) => setTranscript(text),
        () => console.warn('Non-English speech detected (Minute Talk).')
      );
      
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
      
    } catch (err) {
      console.error('Failed to start speech service:', err);
      setIsRecording(false);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopSession(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopSession = async (analyze: boolean = true) => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    let finalTranscript = transcript;
    try {
      finalTranscript = await speechServiceRef.current.stopRecording();
      if (finalTranscript) setTranscript(finalTranscript);
    } catch (e) {
      console.error('Error stopping speech service:', e);
    }

    if (analyze && topicObj) {
      setIsAnalyzing(true);
      try {
        const timeSpent = 60 - timeLeft;
        const duration = timeSpent <= 0 ? 60 : timeSpent; // Default 60 if ran out
        const result = await generateMinuteTalkFeedback(topicObj.topic, finalTranscript, duration);
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
        console.error("Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
        setActiveSessionId(null);
      }
    }
  };

  const renderProgressBar = (label: string, value: number, max: number = 10, colorClass: string = 'bg-[#10B981]') => {
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm font-semibold mb-1.5">
          <span className="text-slate-700">{label}</span>
          <span className="text-slate-500">{value}/{max}</span>
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
            
            <h3 className="text-2xl font-[800] text-slate-800 text-center mb-10 px-2 tracking-tight leading-snug min-h-[5rem] flex items-center justify-center">
              "{topicObj?.topic || "Generating topic..."}"
            </h3>

            {/* Timer & Button */}
            <div className="flex flex-col items-center mb-4">
              <div className="text-5xl font-[900] text-slate-800 mb-6 tabular-nums">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                {String(timeLeft % 60).padStart(2, '0')}
              </div>

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
          </div>
        </div>

        {/* Right Column: Transcription & Feedback */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          
          {/* Live Transcription */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-all min-h-[300px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
              Live Transcription
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
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw size={40} className="mb-3 animate-spin text-[#10B981]" />
                      <p className="font-bold text-slate-600">Generating Feedback Report...</p>
                    </div>
                  ) : (
                    <>
                      <Mic size={32} className="mb-3 opacity-30" />
                      <p className="font-medium text-sm">
                        Speak clearly into your microphone.<br/>Text will stream here in real-time.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Feedback Report Card */}
          {feedback && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-emerald-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-[900] text-slate-800 flex items-center gap-2">
                  <Award className="text-[#10B981]" /> Performance Report
                </h3>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Overall Score</div>
                  <div className={`text-4xl font-[900] tabular-nums ${feedback.finalScore >= 80 ? 'text-emerald-500' : feedback.finalScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                    {feedback.finalScore}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
                <div>
                  {renderProgressBar('Content Quality', feedback.contentScore, 10, 'bg-emerald-500')}
                  {renderProgressBar('Structure', feedback.structureScore, 10, 'bg-blue-500')}
                  {renderProgressBar('Fluency', feedback.fluencyScore, 10, 'bg-indigo-500')}
                  {renderProgressBar('Confidence', feedback.confidenceScore, 10, 'bg-purple-500')}
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Speaking Speed</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-[900] text-slate-800">{feedback.wpm}</span>
                      <span className="text-sm font-bold text-slate-500">WPM</span>
                      <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-md ${
                        feedback.wpm >= 110 && feedback.wpm <= 160 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {feedback.wpm < 100 ? 'Too Slow' : feedback.wpm > 160 ? 'Too Fast' : 'Ideal Pace'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Filler Words Used</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-[900] text-slate-800">{feedback.fillerCount}</span>
                      <span className="text-sm font-bold text-slate-500">total</span>
                      {feedback.topFiller !== 'None' && (
                        <span className="ml-auto text-sm font-semibold text-slate-600">
                          Mostly: <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">"{feedback.topFiller}"</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Suggestions */}
              <div className="mt-8">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-500" /> Actionable Tips
                </h4>
                <div className="grid gap-3">
                  {feedback.suggestions.map((tip, idx) => (
                    <div key={idx} className="flex gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100/50">
                      <CheckCircle2 size={18} className="text-[#10B981] shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
