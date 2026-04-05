import React from 'react';
import { Link } from 'react-router-dom';

export const LandingNav: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm bg-white/90">
      <Link to="/" className="flex items-center gap-3 cursor-pointer">
        <div className="w-10 h-10 bg-[#10B981] rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-[0_4px_10px_rgba(16,185,129,0.3)]">T</div>
        <span className="font-[800] text-2xl tracking-tight text-slate-900 hidden sm:block">Talvorax</span>
      </Link>

      <div className="hidden md:flex items-center gap-6">
        <Link to="/resume-analyzer" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Resume Analyzer</Link>
        <Link to="/interview-coach" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Interview Coach</Link>
        <Link to="/minute-talk" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Minute Talk</Link>
      </div>

      <div className="flex items-center gap-4">
        <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 hidden sm:block">Log in</Link>
        <Link to="/signup" className="flex items-center gap-2 transition-all font-bold px-5 py-2.5 rounded-xl text-sm bg-[#10B981] text-white hover:bg-[#059669] shadow-sm">
          Try for Free
        </Link>
      </div>
    </nav>
  );
};
