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
      color: "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100",
      iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 shadow-sm",
      tagColor: "text-emerald-600",
      btnColor: "text-emerald-600 hover:text-emerald-500",
      features: ["Instantly detect missing ATS keywords", "Get AI-driven bullet point rewrites"]
    },
    {
      icon: "🎯",
      tag: "Interview Practice AI",
      title: "Hyper-Realistic Mocks",
      desc: "Take tailored mock interviews and get live feedback on your STAR method delivery from an AI hiring manager.",
      linkText: "Explore Interview Coach",
      linkUrl: "/interview-coach",
      color: "bg-blue-50/50 hover:bg-blue-50 border-blue-100",
      iconBg: "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 shadow-sm",
      tagColor: "text-blue-600",
      btnColor: "text-blue-600 hover:text-blue-500",
      features: ["Take hyper-realistic mock interviews", "Get live feedback on the STAR method"]
    },
    {
      icon: "🎙️",
      tag: "Speaking Practice AI",
      title: "Master Your Delivery",
      desc: "Eliminate filler words automatically and master your pacing before the big day with daily 60-second drills.",
      linkText: "Explore Minute Talk",
      linkUrl: "/minute-talk",
      color: "bg-purple-50/50 hover:bg-purple-50 border-purple-100",
      iconBg: "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 shadow-sm",
      tagColor: "text-purple-600",
      btnColor: "text-purple-600 hover:text-purple-500",
      features: ["Eliminate filler words automatically", "Master your pacing before the big day"]
    },
    {
      icon: "⚡",
      tag: "Auto Apply AI",
      title: "Automate Your Search",
      desc: "Automatically apply to jobs that match your resume. Set up your AI auto-apply preferences and let the system do the work.",
      linkText: "Explore Auto Apply",
      linkUrl: "/auto-apply",
      color: "bg-amber-50/50 hover:bg-amber-50 border-amber-100",
      iconBg: "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 shadow-sm",
      tagColor: "text-amber-600",
      btnColor: "text-amber-600 hover:text-amber-500",
      features: ["Set up custom job preferences", "Auto-submit to matching roles"]
    },
    {
      icon: "💬",
      tag: "Communication Skills",
      title: "Elevate Your Speech",
      desc: "Master your verbal delivery with real-time feedback on tone, pacing, filler words, and clarity.",
      linkText: "Explore Comm Skills",
      linkUrl: "/communication-skills",
      color: "bg-rose-50/50 hover:bg-rose-50 border-rose-100",
      iconBg: "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700 shadow-sm",
      tagColor: "text-rose-600",
      btnColor: "text-rose-600 hover:text-rose-500",
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-500/20">
      <SEO 
        title="AI Career Tools to Land Your Dream Job | Talvorax"
        description="Supercharge your job search with AI resume analyzer, mock interview coach, and speaking practice. Try Talvorax free."
        url="https://talvorax.com/"
        schema={mainSchema}
        faqSchema={faqSchema}
      />
      <Navbar />
      
      {/* ── Hero Section ── */}
      <header className="relative pt-36 pb-32 px-6 text-center overflow-hidden">
        {/* Soft glowing background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] opacity-60 pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-200/50 rounded-full blur-[100px] mix-blend-multiply"></div>
          <div className="absolute top-10 right-20 w-96 h-96 bg-blue-200/50 rounded-full blur-[100px] mix-blend-multiply"></div>
          <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-teal-100/60 rounded-full blur-[120px] mix-blend-multiply"></div>
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-emerald-700 text-sm font-semibold px-5 py-2 rounded-full border border-emerald-100 shadow-sm mb-10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            The Ultimate Job Search Co-Pilot
          </div>

          <h1 className="text-5xl md:text-[5rem] font-[800] tracking-tight text-slate-900 leading-[1.1] mb-8">
            Land Your Next Job Faster with the <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
              Ultimate AI Career Tools
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
            Stop guessing what recruiters want. Talvorax gives you instant resume feedback, realistic mock interviews, and real-time speaking practice—all powered by advanced AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link
              to="/signup"
              className="inline-flex items-center gap-3 px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-[0_8px_30px_rgba(16,185,129,0.25)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] text-lg hover:-translate-y-1"
            >
              <span className="text-2xl drop-shadow-sm">🚀</span> Start Your Free Prep
            </Link>
            <span className="text-sm text-slate-500 font-semibold tracking-wide">Free · No credit card needed</span>
          </div>
        </div>
      </header>

      {/* ── Feature Cards ── */}
      <section className="relative py-28 px-6 bg-white border-t border-slate-100 overflow-hidden">
        {/* Decorative background curve */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-50 to-transparent"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-[800] text-slate-900 tracking-tight mb-6">
              From Application to Offer: <br className="hidden md:block"/>
              <span className="text-emerald-500">How Our AI Helps You Win</span>
            </h2>
            <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
              Everything you need to secure the interview and ace it, in one unified platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className={`relative rounded-3xl p-10 border border-slate-100 ${tool.color} flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 group hover:-translate-y-2 bg-white`}
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 ${tool.iconBg} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300`}>
                    {tool.icon}
                  </div>
                  <span className={`text-xs font-[800] uppercase tracking-widest ${tool.tagColor}`}>
                    {tool.tag}
                  </span>
                </div>
                
                <h3 className="text-2xl font-[800] text-slate-900 mb-4 leading-tight group-hover:text-emerald-600 transition-colors">
                  {tool.title}
                </h3>
                
                <div className="space-y-4 mb-10 flex-1">
                  {tool.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-full ${tool.tagColor} bg-white border border-current flex items-center justify-center shrink-0`}>
                        <span className="text-[10px] font-bold">✓</span>
                      </div>
                      <span className="text-slate-600 font-medium text-sm leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={tool.linkUrl}
                  className={`inline-flex items-center self-start gap-2 font-[800] text-sm ${tool.btnColor} transition-all group-hover:gap-4`}
                >
                  {tool.linkText} <span className="text-xl leading-none">&rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="relative py-28 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-[800] text-slate-900 tracking-tight mb-16">
            Why Job Seekers <span className="text-emerald-500">Trust Talvorax</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            {/* Card 1 */}
            <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 group hover:-translate-y-1">
              <div className="flex gap-1 text-amber-400 mb-8">
                {"★★★★★".split('').map((star, i) => <span key={i} className="text-2xl drop-shadow-sm">{star}</span>)}
              </div>
              <p className="text-slate-600 text-lg font-medium italic mb-10 leading-relaxed">
                "The AI resume analyzer caught 5 critical ATS keywords I was missing. I got an interview the very next day. Brilliant career tool."
              </p>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center font-[800] text-emerald-700 shadow-sm group-hover:scale-110 transition-transform">SJ</div>
                <p className="font-[800] text-slate-900 text-lg">Sarah J. <span className="block text-sm font-medium text-slate-500 mt-1">Software Engineer</span></p>
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 group hover:-translate-y-1">
              <div className="flex gap-1 text-amber-400 mb-8">
                {"★★★★★".split('').map((star, i) => <span key={i} className="text-2xl drop-shadow-sm">{star}</span>)}
              </div>
              <p className="text-slate-600 text-lg font-medium italic mb-10 leading-relaxed">
                "Practicing with the AI Mock interview felt exactly like the real thing. It completely removed my anxiety."
              </p>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center font-[800] text-blue-700 shadow-sm group-hover:scale-110 transition-transform">MT</div>
                <p className="font-[800] text-slate-900 text-lg">Michael T. <span className="block text-sm font-medium text-slate-500 mt-1">Marketing Manager</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative py-28 px-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-[800] text-center text-slate-900 tracking-tight mb-16">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border border-slate-200 p-8 hover:bg-white hover:border-emerald-200 hover:shadow-[0_10px_30px_rgba(16,185,129,0.1)] transition-all duration-300 group">
                <h3 className="text-xl font-[800] text-slate-900 mb-4 flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition-colors">Q</span>
                  {faq.q}
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium text-base pl-12">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
