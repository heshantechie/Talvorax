import React, { useState } from 'react';
import { AppSection } from './types';
import { ResumeAnalyzer } from './components/ResumeAnalyzer';
import { InterviewCoach } from './components/InterviewCoach';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);

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
                Land Your Dream Job with AI.
              </h1>
              <p className="text-xl text-slate-400">
                Optimize your resume for ATS and practice real-time technical interviews with our Gemini-powered career coach.
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

            <div className="grid md:grid-cols-3 gap-8 px-4 max-w-6xl mx-auto">
              {[
                { title: 'ATS Score', desc: 'Detailed breakdown of how well your resume matches the JD keywords.', icon: '📊' },
                { title: 'Real-time Voice', desc: 'Natural voice interaction simulate real pressure of technical interviews.', icon: '🎙️' },
                { title: 'Actionable Tips', desc: 'No generic advice. Get specific fixes for your projects and skills.', icon: '⚡' },
              ].map((feature, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-emerald-500/50 transition-all cursor-default group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            <div className="max-w-4xl mx-auto px-4">
              <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border border-emerald-500/20 rounded-3xl p-8 md:p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">Ready to level up?</h2>
                <p className="text-slate-400 mb-8">Used by thousands of students to prepare for companies like TCS, Google, and Amazon.</p>
                <button
                  onClick={() => setActiveSection(AppSection.INTERVIEW_COACH)}
                  className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:gap-4 transition-all"
                >
                  Get started now <span className="text-2xl">→</span>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
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
          <div className="hidden md:block">
            <div className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">
              Live Beta
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {renderSection()}
      </main>

      <footer className="border-t border-slate-900 py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="col-span-2 space-y-4">
            <h3 className="font-bold text-xl">HireReady AI</h3>
            <p className="text-slate-500 max-w-sm">The only job-prep companion that actually listens to your answers and scores your technical skills using state-of-the-art AI.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>ATS Checker</li>
              <li>Voice Interviews</li>
              <li>Skill Matrix</li>
              <li>Pricing</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Cookie Settings</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-900 flex justify-between items-center text-xs text-slate-600">
          <p>© 2024 HireReady AI. Empowering job seekers everywhere.</p>
          <div className="flex gap-4">
            <span>Twitter</span>
            <span>LinkedIn</span>
            <span>GitHub</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;