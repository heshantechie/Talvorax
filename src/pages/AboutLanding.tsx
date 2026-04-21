import React from 'react';
import { Navbar } from '../components/Navbar';
import { Target, Lightbulb, Users } from 'lucide-react';

export const AboutLanding: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-white pt-24 pb-20 text-slate-900">
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
         <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
             <Target className="w-8 h-8 text-emerald-600" />
           </div>
           <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
           <p className="text-slate-500 font-medium">To provide every job seeker with the tools they need to navigate the modern hiring landscape with confidence.</p>
         </div>
         <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
             <Lightbulb className="w-8 h-8 text-blue-600" />
           </div>
           <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
           <p className="text-slate-500 font-medium">A world where talent and opportunity meet frictionlessly, enabled by smart, unbiased technology.</p>
         </div>
         <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-6">
             <Users className="w-8 h-8 text-purple-600" />
           </div>
           <h3 className="text-2xl font-bold mb-4">Who We Are</h3>
           <p className="text-slate-500 font-medium">A passionate team of engineers, designers, and career experts dedicated to your success.</p>
         </div>
      </section>

      {/* Tools Section */}
      <section className="py-20 bg-slate-900 text-white text-center rounded-[3rem] mx-4 md:mx-10 mt-10">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-6">Empowering Your Journey</h2>
          <p className="text-slate-400 font-medium text-lg mb-12">Our suite of 'Upskill' tools covers every aspect of the interview lifecycle.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {['Resume Analyzer', 'Interview Coach', 'Minute Talk', 'Auto Apply'].map((tool) => (
               <div key={tool} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <p className="font-bold">{tool}</p>
               </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
};
