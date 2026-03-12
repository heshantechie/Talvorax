import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppSection } from '../../types';
import { ResumeAnalyzer } from '../../components/ResumeAnalyzer';
import { InterviewCoach } from '../../components/InterviewCoach';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const renderSection = () => {
    switch (activeSection) {
      case AppSection.RESUME_ANALYZER:
        return <ResumeAnalyzer />;
      case AppSection.INTERVIEW_COACH:
        return <InterviewCoach />;
      case AppSection.DASHBOARD:
      default:
        return (
          <div className="space-y-12 py-12">
            <div className="text-center space-y-6 max-w-3xl mx-auto px-4">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent leading-tight">
                Welcome to your Dashboard.
              </h1>
              <p className="text-xl text-slate-400">
                You are logged in as <span className="text-emerald-400">{user?.email}</span>
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button
                  onClick={() => setActiveSection(AppSection.RESUME_ANALYZER)}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-900/20"
                >
                  Analyze My Resume
                </button>
                <button
                  onClick={() => setActiveSection(AppSection.INTERVIEW_COACH)}
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                >
                  Start Mock Interview
                </button>
              </div>
            </div>
            {/* Feature Cards Here depending on requirements */}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setActiveSection(AppSection.DASHBOARD)}
        >
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-slate-950 text-xl">H</div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">HireReady <span className="text-emerald-500">AI</span></span>
        </div>

        <div className="flex items-center gap-1 sm:gap-6">
          <button
            onClick={() => setActiveSection(AppSection.RESUME_ANALYZER)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === AppSection.RESUME_ANALYZER ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Resume Analyzer
          </button>
          <button
            onClick={() => setActiveSection(AppSection.INTERVIEW_COACH)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === AppSection.INTERVIEW_COACH ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Interview Coach
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSignOut}
            className="text-sm text-slate-400 hover:text-white transition-colors border border-slate-700 px-4 py-2 rounded-lg hover:border-slate-500"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="flex-1">
        {renderSection()}
      </main>
    </div>
  );
};
