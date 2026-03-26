import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw } from 'lucide-react';
import { SpeechService } from '../services/speechService';

const TOPICS = [
  "Is Social Media Good or Bad?",
  "The Future of Artificial Intelligence",
  "Should remote work be the standard?",
  "Climate Change: Individual vs Corporate Responsibility",
  "The impact of fast fashion on the environment",
  "Is college degree still necessary for success?",
  "Space exploration: Waste of money or necessary step?",
];

export const MinuteTalk: React.FC = () => {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [transcript, setTranscript] = useState<string>('');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechServiceRef = useRef<SpeechService>(new SpeechService());

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const handleNewTopic = () => {
    if (isRecording) stopSession();
    const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setTopic(randomTopic);
    setTranscript('');
  };

  const startSession = async () => {
    setTranscript('');
    setIsRecording(true);
    setTimeLeft(60);

    try {
      await speechServiceRef.current.startRecording(
        (text) => setTranscript(text),
        () => console.warn('Non-English speech detected (Minute Talk).')
      );
    } catch (err) {
      console.error('Failed to start speech service:', err);
      setIsRecording(false);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopSession = async () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    try {
      const finalTranscript = await speechServiceRef.current.stopRecording();
      if (finalTranscript) {
        setTranscript(finalTranscript);
      }
    } catch (e) {
      console.error('Error stopping speech service:', e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Minute Talk
          </h2>
          <p className="text-slate-500 font-medium">Just a Minute Speaking Practice.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Topic & Controls */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-full">
                Topic
              </span>
              <button 
                onClick={handleNewTopic}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={14} /> New Topic
              </button>
            </div>
            
            <h3 className="text-2xl font-[800] text-slate-800 text-center mb-8 px-2 tracking-tight">
              "{topic}"
            </h3>

            {/* Timer & Button */}
            <div className="flex flex-col items-center mb-4">
              <div className="text-5xl font-[900] text-slate-800 mb-6 tabular-nums">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                {String(timeLeft % 60).padStart(2, '0')}
              </div>

              {isRecording ? (
                <button
                  onClick={stopSession}
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.4)] text-white flex items-center justify-center transition-all animate-pulse"
                >
                  <Square size={28} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={startSession}
                  className="w-20 h-20 rounded-full bg-[#10B981] hover:bg-[#059669] shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <Mic size={32} />
                </button>
              )}
              
              <p className="text-sm font-bold text-slate-500 mt-4">
                {isRecording ? 'Listening...' : 'Tap to Start'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Transcription */}
        <div className="col-span-1 lg:col-span-7">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col">
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
                <p className="text-slate-700 font-medium text-lg leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Mic size={40} className="mb-3 opacity-20" />
                  <p className="font-medium">
                    {isRecording ? "Listening to your voice..." : "Your speech will appear here automatically."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
