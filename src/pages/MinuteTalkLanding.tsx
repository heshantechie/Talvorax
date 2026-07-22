import React from 'react';
import { Mic, BarChart3, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';

import { Footer } from '../components/Footer';
export const MinuteTalkLanding: React.FC = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Talvorax AI Minute Talk",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Improve communication skills with AI. Eliminate filler words and speak confidently."
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What is AI speaking practice?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AI speaking practice involves using artificial intelligence to analyze your voice in real-time. It detects filler words, measures speaking speed (words per minute), and evaluates clarity."
      }
    }, {
      "@type": "Question",
      "name": "How can an AI improve communication skills?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By performing daily 60-second drills, AI helps you build awareness of your vocal habits. You get instant feedback on crutch words and pacing, allowing you to train yourself for better public speaking online and in-person."
      }
    }]
  };

  const features = [
    {
      icon: <Mic className="w-7 h-7" />,
      tag: "Voice Intelligence",
      title: "Filler Word Detection",
      desc: "Automatically catch \"ums,\" \"likes,\" and \"you knows.\" Our speaking practice tool highlights exactly when you lose your train of thought.",
      color: "bg-purple-50 border-purple-100",
      iconBg: "bg-purple-100",
      tagColor: "text-purple-500",
    },
    {
      icon: <BarChart3 className="w-7 h-7" />,
      tag: "Pace Monitoring",
      title: "Pace and Tone Analysis",
      desc: "Ensure you aren't speaking too fast or sounding monotonous. The AI analyzes your words per minute to keep you in the \"sweet spot\" of communication.",
      color: "bg-indigo-50 border-indigo-100",
      iconBg: "bg-indigo-100",
      tagColor: "text-indigo-500",
    },
    {
      icon: "⏱️",
      tag: "Daily Habit",
      title: "Daily 60-Second Drills",
      desc: "Build the habit of articulate speech with bite-sized daily practice. Train your brain to speak smoothly and naturally without pressure.",
      color: "bg-emerald-50 border-emerald-100",
      iconBg: "bg-emerald-100",
      tagColor: "text-emerald-600",
    },
  ];

  const faqs = [
    {
      q: "What is AI speaking practice?",
      a: "AI speaking practice involves using artificial intelligence to analyze your voice in real-time. It detects filler words, measures speaking speed (words per minute), and evaluates clarity."
    },
    {
      q: "How can an AI improve communication skills?",
      a: "By performing daily 60-second drills, AI helps you build awareness of your vocal habits. You get instant feedback on crutch words and pacing, allowing you to train yourself for better public speaking online and in-person."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <SEO 
        title="AI Speaking Practice Tool: Improve Communication | Talvorax"
        description="Improve communication skills with AI. Eliminate filler words and speak confidently."
        url="https://talvorax.com/minute-talk"
        schema={schema}
        faqSchema={faqSchema}
      />
      <Navbar />

      {/* ── Hero ── */}
      <header className="pt-32 pb-24 px-6 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-600 text-sm font-semibold px-4 py-1.5 rounded-full border border-purple-200/50 mb-8">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse inline-block"></span>
          Real-Time Voice Analysis · 60-Second Drills
        </div>

        <h1 className="text-5xl md:text-[3.75rem] font-[800] tracking-tight text-slate-900 leading-[1.15] mb-6">
          Speak with Confidence Using{' '}
          <span style={{ color: '#8B5CF6' }}>Advanced AI Speaking Practice</span>
        </h1>

        <p className="text-lg md:text-xl text-[#475569] mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
          Whether you're prepping for a presentation or an interview, Minute Talk analyzes your voice in real-time. Catch your filler words, adjust your pace, and master the art of public speaking online.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/dashboard/minute-talk"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-[14px] transition-all shadow-[0_8px_24px_rgba(22,33,29,0.15)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.40)] text-lg hover:-translate-y-0.5"
          >
            <Mic className="w-5 h-5" /> Record a Minute Talk Now
          </Link>
          <span className="text-sm text-[#8a938d] font-medium">Free · 60 seconds only</span>
        </div>

        {/* Trust strip */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[#5b645f] font-medium">
          {['✓ Filler Word Detection', '✓ Pace & Tone Analysis', '✓ 60-Second Drills', '✓ Instant Playback'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </header>

      {/* ── Feature Cards ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-[800] text-slate-900 tracking-tight mb-4">
              The Fastest Way to Improve{' '}
              <span style={{ color: '#8B5CF6' }}>Communication Skills</span> with AI
            </h2>
            <p className="text-[#5b645f] text-lg font-medium max-w-xl mx-auto">
              Three powerful voice tools that transform how you speak in any high-stakes moment.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-[14px] p-8 border ${f.color} flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300`}
              >
                <div className={`w-12 h-12 ${f.iconBg} rounded-[14px] flex items-center justify-center text-2xl`}>
                  {f.icon}
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest ${f.tagColor}`}>{f.tag}</span>
                <h3 className="text-xl font-[800] text-slate-900 leading-tight">{f.title}</h3>
                <p className="text-[#475569] text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-link CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-[14px] border border-[#e4e6de] shadow-[0_8px_40px_rgba(22,33,29,0.05)] p-10 md:p-14 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-[14px] mb-6 text-emerald-700"><Rocket className="w-7 h-7" /></div>
          <h2 className="text-3xl font-[800] text-slate-900 tracking-tight mb-4">
            Ready for the <span style={{ color: 'oklch(0.68 0.14 163)' }}>real thing?</span>
          </h2>
          <p className="text-[#475569] text-lg font-medium mb-8 max-w-xl mx-auto leading-relaxed">
            Confident in your speaking skills? Put them to the test in a high-pressure AI mock interview.
          </p>
          <Link
            to="/resume-analyzer"
            className="inline-flex items-center gap-2 text-purple-500 font-bold text-lg border-b-2 border-purple-200 hover:border-purple-500 pb-0.5 transition-all"
          >
            Check your resume before you interview <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-[800] text-center text-slate-900 tracking-tight mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-[14px] border border-[#e4e6de] p-7 shadow-sm hover:shadow-md transition-shadow duration-200">
                <h3 className="text-lg font-[700] text-[#111827] mb-3 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">Q</span>
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
