import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const DEFAULT_MESSAGES = [
  "Analyzing Resume...",
  "Understanding Career Goals...",
  "Optimizing ATS Score...",
  "Evaluating Skills...",
  "Preparing Interview Questions...",
  "Improving Communication...",
  "Matching Opportunities...",
  "Generating Career Insights...",
  "Building Personalized Recommendations...",
  "Accelerating Your Career..."
];

interface AILoaderProps {
  fullScreen?: boolean;
  messages?: string[];
  inline?: boolean;
}

export const AILoader: React.FC<AILoaderProps> = ({ 
  fullScreen = false, 
  messages = DEFAULT_MESSAGES,
  inline = false
}) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [messages]);

  const content = (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {/* Advanced AI Core Visualizer */}
      <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
        
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-emerald-500/10 blur-[40px] rounded-full animate-pulse" />

        {/* Neural Network SVG connections */}
        <svg className="absolute inset-0 w-full h-full text-emerald-400/30 animate-[spin_20s_linear_infinite]" viewBox="0 0 100 100">
          <path d="M 50,50 L 20,30 L 10,60 L 50,50 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M 50,50 L 80,30 L 90,60 L 50,50 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M 50,50 L 50,90 L 20,70 L 50,50 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M 50,50 L 50,10 L 80,70 L 50,50 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>

        {/* Orbiting particles */}
        <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
          <div className="absolute top-[10%] left-[50%] w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,1)]" />
          <div className="absolute bottom-[20%] right-[10%] w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,1)]" />
        </div>
        <div className="absolute inset-0 animate-[spin_12s_linear_infinite_reverse]">
          <div className="absolute top-[30%] right-[10%] w-2.5 h-2.5 bg-teal-300 rounded-full shadow-[0_0_15px_rgba(94,234,212,1)]" />
          <div className="absolute bottom-[10%] left-[30%] w-1.5 h-1.5 bg-emerald-300 rounded-full shadow-[0_0_10px_rgba(110,231,183,1)]" />
        </div>

        {/* Inner Morphing Core */}
        <div className="relative z-10 w-20 h-20 bg-gradient-to-tr from-emerald-600 via-emerald-400 to-teal-300 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-[pulse_2s_ease-in-out_infinite]">
          <div className="absolute inset-1 bg-white/20 rounded-full backdrop-blur-md border border-white/40 flex items-center justify-center overflow-hidden">
             {/* Logo / Sparkles */}
             <Sparkles className="w-8 h-8 text-white" style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          </div>
        </div>
        
        {/* Expanding Rings */}
        <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute inset-4 rounded-full border border-teal-300/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
      </div>

      {/* Text Container */}
      <div className="text-center space-y-4 relative z-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center justify-center gap-2">
          Talvorax <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest">AI OS</span>
        </h2>
        
        <div className="h-8 relative overflow-hidden flex items-center justify-center min-w-[280px]">
          <p 
            key={msgIndex}
            className="text-sm font-semibold text-slate-500 dark:text-slate-400"
            style={{ 
              animation: 'aiTextSlide 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          >
            {messages[msgIndex]}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes aiTextSlide {
          0% {
            opacity: 0;
            transform: translateY(15px) scale(0.95);
            filter: blur(4px);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
          85% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: translateY(-15px) scale(1.05);
            filter: blur(4px);
          }
        }
      `}</style>
    </div>
  );

  if (inline) {
    return (
      <div className="w-full py-16 flex justify-center items-center animate-in fade-in duration-500">
        {content}
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
        {content}
      </div>
    );
  }

  // Container bounded
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/50 dark:border-slate-800/50 shadow-2xl animate-in zoom-in-95 duration-500">
      {content}
    </div>
  );
};
