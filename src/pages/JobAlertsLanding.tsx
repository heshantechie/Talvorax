import React from 'react';
import { Navbar } from '../components/Navbar';
import { Search, MapPin, Briefcase, Bookmark, ChevronRight } from 'lucide-react';

export const JobAlertsLanding: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-white pt-24 text-slate-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight mb-6">Find Your Opportunities</h1>
        <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto">Discover the perfect role from top companies matching your skills and preferences. Setup job alerts to stay ahead.</p>
        
        {/* Search Bar */}
        <div className="bg-white p-3 md:p-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 w-full md:border-r border-gray-100">
            <Search className="text-slate-400 w-5 h-5" />
            <input type="text" placeholder="Job title, skills, or company" className="w-full bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 font-medium" />
          </div>
          <div className="flex-1 flex items-center gap-3 px-4 w-full">
            <MapPin className="text-slate-400 w-5 h-5" />
            <input type="text" placeholder="City, state, or remote" className="w-full bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 font-medium" />
          </div>
          <button className="w-full md:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full transition-all flexitems-center justify-center shadow-[0_4px_14px_rgba(16,185,129,0.3)]">
            Search Jobs
          </button>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Saved/Applied Jobs Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bookmark className="w-5 h-5 text-emerald-500"/> Saved Alerts</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer border border-transparent hover:border-emerald-100">
                  <p className="font-bold text-slate-800 text-sm">Frontend Developer</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Remote • $100k - $150k</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer border border-transparent hover:border-emerald-100">
                  <p className="font-bold text-slate-800 text-sm">Product Designer</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">New York, NY • Design</p>
                </div>
              </div>
            </div>
          </div>

          {/* Job Listings */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold mb-6">Recommended for you</h2>
            
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shadow-inner">
                        <Briefcase className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">Senior React Engineer</h3>
                        <p className="text-slate-500 text-sm font-medium">TechCorp Inc. • Remote</p>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-emerald-500 transition-colors p-2"><Bookmark className="w-5 h-5"/></button>
                 </div>
                 <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">React</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">TypeScript</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">$130k - $160k</span>
                 </div>
                 <button className="w-full py-2.5 border-2 border-emerald-500 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                   Apply Now
                 </button>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
};
