import React from 'react';
import { Navbar } from '../components/Navbar';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PricingLanding: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-slate-50 pt-24 text-slate-900 pb-20">
      <Navbar />
      
      {/* Header */}
      <section className="py-20 px-6 max-w-3xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight mb-6">Choose Your Plan</h1>
        <p className="text-xl text-slate-500 font-medium">Simple, transparent pricing to help you land your dream job faster.</p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Free Plan */}
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col h-full">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Free Plan</h3>
            <p className="text-slate-500 font-medium text-sm">Perfect for getting started</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-[800]">$0</span>
              <span className="text-slate-500 font-medium">/ forever</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start gap-3"><Check className="text-emerald-500 w-5 h-5 shrink-0" /><span className="font-medium text-slate-700">Basic Resume Analysis (3/month)</span></li>
            <li className="flex items-start gap-3"><Check className="text-emerald-500 w-5 h-5 shrink-0" /><span className="font-medium text-slate-700">Minute Talk Standard Practice</span></li>
            <li className="flex items-start gap-3"><Check className="text-emerald-500 w-5 h-5 shrink-0" /><span className="font-medium text-slate-700">Standard Job Alerts</span></li>
            <li className="flex items-start gap-3 text-slate-400"><Check className="text-slate-300 w-5 h-5 shrink-0" /><span>Limited Interview Coaching</span></li>
          </ul>

          <Link to="/signup" className="w-full block text-center py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-slate-300 hover:bg-slate-50 transition-colors">
            Get Started
          </Link>
        </div>

        {/* Pro Plan */}
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-[0_20px_60px_rgba(16,185,129,0.15)] flex flex-col h-full relative transform md:-translate-y-4">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-md">
            Most Popular
          </div>
          <div className="mb-8">
             <h3 className="text-2xl font-bold text-white mb-2">Pro Plan</h3>
             <p className="text-slate-400 font-medium text-sm">Supercharge your job hunt</p>
             <div className="mt-6 flex items-baseline gap-1 text-white">
                <span className="text-5xl font-[800]">$19</span>
                <span className="text-slate-400 font-medium">/ month</span>
             </div>
          </div>

          <ul className="space-y-4 mb-10 flex-1 text-slate-300">
            <li className="flex items-start gap-3"><Check className="text-emerald-400 w-5 h-5 shrink-0" /><span className="font-medium text-white">Unlimited Resume Analysis & Tracking</span></li>
            <li className="flex items-start gap-3"><Check className="text-emerald-400 w-5 h-5 shrink-0" /><span className="font-medium text-white">Advanced AI Interview Coach (All Roles)</span></li>
            <li className="flex items-start gap-3"><Check className="text-emerald-400 w-5 h-5 shrink-0" /><span className="font-medium text-white">Auto Apply Integration</span></li>
            <li className="flex items-start gap-3"><Check className="text-emerald-400 w-5 h-5 shrink-0" /><span className="font-medium text-white">Priority Support & Feedback</span></li>
          </ul>

          <Link to="/signup?plan=pro" className="w-full block text-center py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)]">
            Upgrade Now
          </Link>
        </div>

      </section>
    </div>
  );
};
