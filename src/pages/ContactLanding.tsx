import React from 'react';
import { Navbar } from '../components/Navbar';
import { Mail, MessageSquare, MapPin } from 'lucide-react';

export const ContactLanding: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-slate-50 pt-24 pb-20 text-slate-900">
      <Navbar />
      
      <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div className="space-y-8 lg:pr-10">
          <div>
            <h1 className="text-5xl font-[800] tracking-tight mb-4">Get in Touch</h1>
            <p className="text-lg text-slate-500 font-medium">Have questions about our tools, pricing, or need support? Our team is here to help you succeed.</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
               <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                 <Mail className="w-6 h-6 text-emerald-600" />
               </div>
               <div>
                 <h4 className="font-bold text-lg">Email Us</h4>
                 <p className="text-slate-500 font-medium">support@talvorax.com</p>
               </div>
            </div>
            <div className="flex gap-4 items-start">
               <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                 <MessageSquare className="w-6 h-6 text-emerald-600" />
               </div>
               <div>
                 <h4 className="font-bold text-lg">Chat Support</h4>
                 <p className="text-slate-500 font-medium">Available Mon-Fri, 9am - 5pm EST</p>
               </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.04)] border border-gray-100">
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Full Name</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input type="email" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Message</label>
              <textarea rows={4} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium resize-none" placeholder="How can we help?"></textarea>
            </div>
            <button type="button" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)]">
              Send Message
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
