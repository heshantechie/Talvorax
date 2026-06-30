import React from 'react';
import { Navbar } from '../components/Navbar';
import { Send, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AutoApplyLanding: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-white pt-24 text-slate-900">
      <Navbar />
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-2xl mx-auto flex items-center justify-center mb-8">
           <Send className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight mb-6">Auto Apply</h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium">Let our AI engine match your profile with top jobs and apply on your behalf. Save hours of manual work.</p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
           <Link to="/signup" className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg">Try Auto Apply</Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
           {[
             { title: "Smart Matching", desc: "Finds roles that perfectly fit your resume and criteria." },
             { title: "One-Click Setup", desc: "Configure your preferences once and let it run in the background." },
             { title: "Application Tracking", desc: "Monitor exactly where and when your resume was sent." }
           ].map((feature, i) => (
             <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
               <CheckCircle className="w-8 h-8 text-emerald-500 mb-4" />
               <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
               <p className="text-slate-500 text-sm font-medium">{feature.desc}</p>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
};
