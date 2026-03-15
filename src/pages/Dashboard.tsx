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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Mock state to toggle between "New Candidate" and "Returning Candidate" views
  const [isNewCandidate, setIsNewCandidate] = useState(true);

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
            
            {/* Toggle for demonstration purposes */}
            <div className="flex justify-center mb-8">
              <button 
                onClick={() => setIsNewCandidate(!isNewCandidate)}
                className="text-xs bg-white text-slate-500 px-4 py-2 rounded-full transition-colors border border-gray-200 shadow-sm hover:bg-gray-50 font-medium"
              >
                Toggle View: {isNewCandidate ? "New Candidate" : "Returning User"}
              </button>
            </div>

            <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
              <h1 className="text-5xl md:text-7xl font-[800] tracking-tight text-slate-900 leading-tight">
                Welcome to your<br />Dashboard.
              </h1>
              <p className="text-xl text-slate-500 font-medium">
                You are logged in as <span className="text-[#10B981] font-bold">{user?.email}</span>
              </p>
              
              {isNewCandidate ? (
                // New Candidate Layout: "Let's Skill Up"
                <div className="mt-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">Let's Skill Up!</h2>
                  <p className="text-slate-500 mb-8 max-w-xl mx-auto font-medium">Start by analyzing your resume to find your strong points, or jump straight into a mock interview to test your skills.</p>
                  <div className="flex flex-wrap justify-center gap-6">
                    <button
                      onClick={() => setActiveSection(AppSection.RESUME_ANALYZER)}
                      className="px-8 py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] text-lg hover:-translate-y-0.5"
                    >
                      Analyze My Resume
                    </button>
                    <button
                      onClick={() => setActiveSection(AppSection.INTERVIEW_COACH)}
                      className="px-8 py-4 bg-white border-2 border-[#10B981] hover:bg-[#10B981]/5 text-[#10B981] font-bold rounded-2xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.1)] text-lg hover:-translate-y-0.5"
                    >
                      Start Mock Interview
                    </button>
                  </div>
                </div>
              ) : (
                // Returning User Layout: "Past Interview Analysis"
                <div className="mt-16 text-left w-full max-w-5xl mx-auto">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-gray-200 pb-4">Recent Interview Performance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Overall Score */}
                    <div className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-[0_10px_40px_rgba(16,185,129,0.08)] flex flex-col items-center justify-center">
                      <h3 className="text-slate-500 font-bold mb-4 text-sm uppercase tracking-wider">Overall Score</h3>
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#10B981" strokeWidth="8" strokeDasharray="283" strokeDashoffset="56.6" className="drop-shadow-[0_4px_6px_rgba(16,185,129,0.3)]" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-4xl font-[800] text-slate-900">80<span className="text-lg text-slate-400 font-bold">%</span></span>
                        </div>
                      </div>
                      <p className="text-[#10B981] text-sm font-bold mt-4 bg-[#10B981]/10 px-4 py-1.5 rounded-full">Great Performance</p>
                    </div>

                    {/* Analysis Summary */}
                    <div className="bg-white border border-gray-100 p-8 rounded-[24px] shadow-[0_10px_40px_rgba(16,185,129,0.08)] col-span-1 md:col-span-2 flex flex-col">
                      <h3 className="text-slate-500 font-bold mb-6 text-sm uppercase tracking-wider">Analysis Summary</h3>
                      <div className="flex-1 space-y-5">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-700 font-bold flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> Communication Skills: <span className="text-slate-900 ml-1">Excellent (9/10)</span></p>
                          <p className="text-[13px] text-slate-500 mt-1 pl-5 font-medium">Clear delivery and good structure in responses.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-700 font-bold flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span> Technical Accuracy: <span className="text-slate-900 ml-1">Good (7.5/10)</span></p>
                          <p className="text-[13px] text-slate-500 mt-1 pl-5 font-medium">Strong core concepts, missed a few edge cases in system design.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-700 font-bold flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></span> Problem Solving: <span className="text-slate-900 ml-1">Moderate (6/10)</span></p>
                          <p className="text-[13px] text-slate-500 mt-1 pl-5 font-medium">Needs more structured approach to ambiguous requirements.</p>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[13px] text-slate-400 font-medium">Last attempt: 2 days ago</span>
                        <button onClick={() => setActiveSection(AppSection.INTERVIEW_COACH)} className="text-[13px] text-[#10B981] hover:text-[#059669] font-bold transition-colors">Take another interview &gt;</button>
                      </div>
                    </div>
                    
                  </div>
                </div>
              )}
              
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveSection(AppSection.DASHBOARD)}
        >
          <div className="w-10 h-10 bg-[#10B981] rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-[0_4px_10px_rgba(16,185,129,0.3)]">H</div>
          <span className="font-[800] text-2xl tracking-tight text-slate-900 hidden sm:block">HireReady<span className="text-[#10B981]">AI</span></span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 bg-slate-50 p-1.5 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveSection(AppSection.RESUME_ANALYZER)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === AppSection.RESUME_ANALYZER ? 'bg-white text-[#10B981] shadow-sm border border-gray-200' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
          >
            Resume Analyzer
          </button>
          <button
            onClick={() => setActiveSection(AppSection.INTERVIEW_COACH)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === AppSection.INTERVIEW_COACH ? 'bg-white text-[#10B981] shadow-sm border border-gray-200' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
          >
            Interview Coach
          </button>
        </div>

        <div className="flex items-center gap-4 relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 transition-all font-bold px-5 py-2.5 rounded-xl text-sm bg-white border-2 border-gray-200 hover:border-[#10B981] text-slate-700 shadow-sm"
          >
            Profile
          </button>
          
          {isProfileOpen && (
            <div className="absolute top-[120%] right-0 w-48 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-2xl bg-white border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-slate-50">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Logged in as</p>
                <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { setIsProfileOpen(false); /* open edit profile logic */ }}
                  className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-[#10B981]/10 hover:text-[#10B981] rounded-xl transition-colors"
                >
                  Edit Profile
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1">
        {renderSection()}
      </main>
    </div>
  );
};
