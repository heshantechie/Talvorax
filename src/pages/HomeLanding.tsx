import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';

import { Footer } from '../components/Footer';
export const HomeLanding: React.FC = () => {
  const mainSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Talvorax",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Supercharge your job search with AI resume analyzer, mock interview coach, and speaking practice. Try Talvorax free.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "153"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What are AI career tools?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AI career tools are software applications that use artificial intelligence to help candidates prepare for job applications. They include features like AI resume analyzers to beat Applicant Tracking Systems (ATS) and AI mock interview platforms to practice speaking and behavioral questions."
      }
    }, {
      "@type": "Question",
      "name": "Is Talvorax free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Talvorax offers a free tier to try out our AI Resume Analyzer, Interview Coach, and Minute Talk tools to immediately improve your job search."
      }
    }]
  };

  const tools = [
    {
      icon: "📄",
      tag: "Resume Analyzer AI",
      title: "Beat the ATS System",
      desc: "Instantly detect missing ATS keywords and get AI-driven bullet point rewrites to ensure your resume gets seen.",
      linkText: "Explore Resume Analyzer",
      linkUrl: "/resume-analyzer",
      color: "bg-emerald-50 border-emerald-100",
      iconBg: "bg-emerald-100",
      tagColor: "text-emerald-600",
      btnColor: "text-emerald-600 border-emerald-200 hover:border-emerald-500",
      features: ["Instantly detect missing ATS keywords", "Get AI-driven bullet point rewrites"]
    },
    {
      icon: "🎯",
      tag: "Interview Practice AI",
      title: "Hyper-Realistic Mocks",
      desc: "Take tailored mock interviews and get live feedback on your STAR method delivery from an AI hiring manager.",
      linkText: "Explore Interview Coach",
      linkUrl: "/interview-coach",
      color: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-100",
      tagColor: "text-blue-600",
      btnColor: "text-blue-600 border-blue-200 hover:border-blue-500",
      features: ["Take hyper-realistic mock interviews", "Get live feedback on the STAR method"]
    },
    {
      icon: "🎙️",
      tag: "Speaking Practice AI",
      title: "Master Your Delivery",
      desc: "Eliminate filler words automatically and master your pacing before the big day with daily 60-second drills.",
      linkText: "Explore Minute Talk",
      linkUrl: "/minute-talk",
      color: "bg-purple-50 border-purple-100",
      iconBg: "bg-purple-100",
      tagColor: "text-purple-600",
      btnColor: "text-purple-600 border-purple-200 hover:border-purple-500",
      features: ["Eliminate filler words automatically", "Master your pacing before the big day"]
    },
    {
      icon: "⚡",
      tag: "Auto Apply AI",
      title: "Automate Your Search",
      desc: "Automatically apply to jobs that match your resume. Set up your AI auto-apply preferences and let the system do the work.",
      linkText: "Explore Auto Apply",
      linkUrl: "/auto-apply",
      color: "bg-amber-50 border-amber-100",
      iconBg: "bg-amber-100",
      tagColor: "text-amber-600",
      btnColor: "text-amber-600 border-amber-200 hover:border-amber-500",
      features: ["Set up custom job preferences", "Auto-submit to matching roles"]
    },
    {
      icon: "💬",
      tag: "Communication Skills",
      title: "Elevate Your Speech",
      desc: "Master your verbal delivery with real-time feedback on tone, pacing, filler words, and clarity.",
      linkText: "Explore Comm Skills",
      linkUrl: "/communication-skills",
      color: "bg-rose-50 border-rose-100",
      iconBg: "bg-rose-100",
      tagColor: "text-rose-600",
      btnColor: "text-rose-600 border-rose-200 hover:border-rose-500",
      features: ["Real-time tone & pace analysis", "Track and eliminate filler words"]
    }
  ];

  const faqs = [
    {
      q: "What are AI career tools?",
      a: "AI career tools are software applications that use artificial intelligence to help candidates prepare for job applications. They include features like AI resume analyzers to beat Applicant Tracking Systems (ATS) and AI mock interview platforms to practice speaking and behavioral questions."
    },
    {
      q: "Is Talvorax free to use?",
      a: "Yes! You can try out our core AI tools for free to instantly improve your job search strategy."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <SEO 
        title="AI Career Tools to Land Your Dream Job | Talvorax"
        description="Supercharge your job search with AI resume analyzer, mock interview coach, and speaking practice. Try Talvorax free."
        url="https://talvorax.com/"
        schema={mainSchema}
        faqSchema={faqSchema}
      />
      <Navbar />
      
      {/* ── Hero ── */}
      <header className="pt-32 pb-24 px-6 text-center max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#10B981]/10 text-[#059669] text-sm font-semibold px-4 py-1.5 rounded-full border border-[#10B981]/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse inline-block"></span>
          The Ultimate Job Search Co-Pilot
        </div>

        <h1 className="text-5xl md:text-[4rem] font-[800] tracking-tight text-[#0F172A] leading-[1.15] mb-6">
          Land Your Next Job Faster with the <span style={{ color: '#10B981' }}>Ultimate AI Career Tools</span>
        </h1>

        <p className="text-lg md:text-xl text-[#475569] mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
          Stop guessing what recruiters want. Talvorax gives you instant resume feedback, realistic mock interviews, and real-time speaking practice—all powered by advanced AI.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_24px_rgba(16,185,129,0.30)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.40)] text-xl hover:-translate-y-0.5"
          >
            <span>🚀</span> Start Your Free Prep
          </Link>
          <span className="text-sm text-[#94A3B8] font-medium">Free · No credit card needed</span>
        </div>
      </header>

      {/* ── Feature Cards ── */}
      <section className="py-20 px-6 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-[800] text-[#0F172A] tracking-tight mb-4">
              From Application to Offer: <span style={{ color: '#10B981' }}>How Our AI Helps You Win</span>
            </h2>
            <p className="text-[#64748B] text-lg font-medium max-w-xl mx-auto">
              Everything you need to secure the interview and ace it, in one unified platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className={`rounded-[2rem] p-8 md:p-10 border ${tool.color} flex flex-col hover:shadow-xl transition-all duration-300 group bg-white`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 ${tool.iconBg} rounded-2xl flex items-center justify-center text-3xl`}>
                    {tool.icon}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${tool.tagColor}`}>
                    {tool.tag}
                  </span>
                </div>
                
                <h3 className="text-2xl font-[800] text-[#0F172A] mb-3 leading-tight">
                  {tool.title}
                </h3>
                
                <div className="space-y-3 mb-8 flex-1">
                  {tool.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`text-lg font-bold ${tool.tagColor}`}>✓</span>
                      <span className="text-[#475569] font-medium text-sm leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={tool.linkUrl}
                  className={`inline-flex items-center self-start gap-2 font-bold text-sm border-b-2 ${tool.btnColor} pb-1 transition-all group-hover:gap-3`}
                >
                  {tool.linkText} <span className="text-lg leading-none">&rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-[800] text-[#0F172A] tracking-tight mb-12">
            Why Job Seekers <span style={{ color: '#10B981' }}>Trust Talvorax</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="bg-[#F8FAFC] p-8 md:p-10 rounded-[2rem] shadow-sm border border-[#E5E7EB] hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-[#10B981] mb-6">
                {"★★★★★".split('').map((star, i) => <span key={i} className="text-xl">{star}</span>)}
              </div>
              <p className="text-[#475569] text-lg font-medium italic mb-6 leading-relaxed">
                "The AI resume analyzer caught 5 critical ATS keywords I was missing. I got an interview the very next day. Brilliant career tool."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">SJ</div>
                <p className="font-[800] text-[#0F172A]">Sarah J. <span className="block text-sm font-medium text-[#64748B]">Software Engineer</span></p>
              </div>
            </div>
            
            <div className="bg-[#F8FAFC] p-8 md:p-10 rounded-[2rem] shadow-sm border border-[#E5E7EB] hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-[#10B981] mb-6">
                {"★★★★★".split('').map((star, i) => <span key={i} className="text-xl">{star}</span>)}
              </div>
              <p className="text-[#475569] text-lg font-medium italic mb-6 leading-relaxed">
                "Practicing with the AI Mock interview felt exactly like the real thing. It completely removed my anxiety."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">MT</div>
                <p className="font-[800] text-[#0F172A]">Michael T. <span className="block text-sm font-medium text-[#64748B]">Marketing Manager</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 bg-[#F8FAFC] border-t border-[#E5E7EB]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-[800] text-center text-[#0F172A] tracking-tight mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm hover:shadow-md transition-shadow duration-200">
                <h3 className="text-lg font-[700] text-[#111827] mb-3 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">Q</span>
                  {faq.q}
                </h3>
                <p className="text-[#475569] leading-relaxed font-medium text-sm pl-9">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};
