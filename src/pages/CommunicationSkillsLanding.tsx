import React from 'react';
import { Navbar } from '../components/Navbar';
import { MessageSquare, Mic, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CommunicationSkillsLanding: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-white pt-24 text-slate-900">
      <Navbar />
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-2xl mx-auto flex items-center justify-center mb-8">
           <MessageSquare className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight mb-6">Communication Skills</h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium">Master your verbal delivery. Get real-time feedback on tone, pacing, filler words, and clarity to speak with absolute confidence.</p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
           <Link to="/signup" className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg">Start Practicing</Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
           {[
             { title: "Tone Analysis", desc: "Ensure your voice projects confidence and enthusiasm.", icon: Activity },
             { title: "Speech Pacing", desc: "Learn to speak at an optimal speed for maximum impact.", icon: Mic },
             { title: "Filler Word Tracking", desc: "Eliminate 'um', 'ah', and 'like' from your vocabulary.", icon: MessageSquare }
           ].map((feature, i) => (
             <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
               <feature.icon className="w-8 h-8 text-blue-500 mb-4" />
               <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
               <p className="text-slate-500 text-sm font-medium">{feature.desc}</p>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
};
