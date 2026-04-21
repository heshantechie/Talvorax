import React from 'react';
import { Navbar } from '../components/Navbar';
import { FileText, Timer, Users, Send, MessageSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UpskillLanding: React.FC = () => {
  const upskillItems = [
    { name: 'Resume Analyzer', path: '/resume-analyzer', icon: <FileText className="w-8 h-8 text-emerald-600" />, desc: 'AI-driven resume feedback and ATS optimization to help you land more interviews.' },
    { name: 'Interview Coach', path: '/interview-coach', icon: <Users className="w-8 h-8 text-emerald-600" />, desc: 'Simulated technical and behavioral interviews with real-time adaptive feedback.' },
    { name: 'Minute Talk', path: '/minute-talk', icon: <Timer className="w-8 h-8 text-emerald-600" />, desc: 'Perfect your elevator pitch with concise 60-second rapid practice modes.' },
    { name: 'Auto Apply', path: '/auto-apply', icon: <Send className="w-8 h-8 text-emerald-600" />, desc: 'Put your job hunt on autopilot. Our engine applies to matched roles automatically.' },
    { name: 'Communication Skills', path: '/communication-skills', icon: <MessageSquare className="w-8 h-8 text-emerald-600" />, desc: 'Analyze your vocal delivery, pacing, and eliminate filler words to speak confidently.' },
  ];

  return (
    <div className="min-h-screen font-sans bg-slate-50 pt-24 text-slate-900 pb-20">
      <Navbar />
      
      {/* Header */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight mb-6">Upskill Platform</h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-16">
          Everything you need to master your career transition. Choose a module below to start practicing and improving today.
        </p>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {upskillItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 border border-emerald-100 group-hover:bg-emerald-500 transition-colors">
                {React.cloneElement(item.icon as React.ReactElement, { className: "w-8 h-8 text-emerald-600 group-hover:text-white transition-colors" })}
              </div>
              <h3 className="text-2xl font-bold mb-3">{item.name}</h3>
              <p className="text-slate-500 font-medium mb-8 flex-1">{item.desc}</p>
              <div className="flex items-center text-emerald-600 font-bold gap-2 group-hover:gap-3 transition-all mt-auto">
                Explore Module <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
