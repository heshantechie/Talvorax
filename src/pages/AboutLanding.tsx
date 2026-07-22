import React from 'react';
import { Navbar } from '../components/Navbar';
import { Target, Lightbulb, Users } from 'lucide-react';

import { Footer } from '../components/Footer';
export const AboutLanding: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-white pt-24 text-slate-900">
      <Navbar />
      
      {/* Header */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight mb-8">About Us</h1>
        <p className="text-xl text-slate-500 leading-relaxed font-medium">
          We are on a mission to democratize career growth. Talvorax leverages cutting-edge AI 
          to provide personalized tools that help candidates stand out, upskill efficiently, 
          and land their dream jobs.
        </p>
      </section>

      {/* Mission & Vision */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="p-8 rounded-[14px] bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-[14px] bg-emerald-100 flex items-center justify-center mb-6">
             <Target className="w-8 h-8 text-emerald-600" />
           </div>
           <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
           <p className="text-slate-500 font-medium">To provide every job seeker with the tools they need to navigate the modern hiring landscape with confidence.</p>
         </div>
         <div className="p-8 rounded-[14px] bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-[14px] bg-blue-100 flex items-center justify-center mb-6">
             <Lightbulb className="w-8 h-8 text-blue-600" />
           </div>
           <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
           <p className="text-slate-500 font-medium">A world where talent and opportunity meet frictionlessly, enabled by smart, unbiased technology.</p>
         </div>
         <div className="p-8 rounded-[14px] bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-[14px] bg-purple-100 flex items-center justify-center mb-6">
             <Users className="w-8 h-8 text-purple-600" />
           </div>
           <h3 className="text-2xl font-bold mb-4">Who We Are</h3>
           <p className="text-slate-500 font-medium">A passionate team of engineers, designers, and career experts dedicated to your success.</p>
         </div>
      </section>

      {/* Tools Section */}
      <section className="py-16 px-4 md:px-10 mt-10 pb-20">
        <div className="max-w-5xl mx-auto bg-white rounded-[3rem] border border-[#E5E7EB] shadow-[0_8px_40px_rgba(16,185,129,0.07)] px-8 md:px-16 py-16 text-center">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-[14px] flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-4xl font-[800] text-[#111827] tracking-tight mb-4">Empowering Your Journey</h2>
          <p className="text-[#6B7280] font-medium text-lg mb-12 max-w-2xl mx-auto">Our suite of 'Upskill' tools covers every aspect of the interview lifecycle.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ name: 'Resume Analyzer', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              { name: 'Interview Coach', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { name: 'Minute Talk', color: 'bg-purple-50 border-purple-200 text-purple-700' },
              { name: 'Auto Apply', color: 'bg-amber-50 border-amber-200 text-amber-700' }].map((tool) => (
               <div key={tool.name} className={`p-4 rounded-[14px] border ${tool.color} hover:shadow-md transition-all duration-200 cursor-default`}>
                  <p className="font-bold text-sm">{tool.name}</p>
               </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};
