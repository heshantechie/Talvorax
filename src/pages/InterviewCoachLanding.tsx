import React from 'react';
import { Drama, Bot, Target, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';

import { Footer } from '../components/Footer';
export const InterviewCoachLanding: React.FC = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Talvorax AI Interview Coach",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Practice interviews with AI and get real-time feedback. Improve answers, tone, and confidence."
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What is an AI mock interview?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An AI mock interview simulates a real job interview using artificial intelligence. It asks you role-specific questions and evaluates your spoken answers, tone, and pacing just like a human interviewer would."
      }
    }, {
      "@type": "Question",
      "name": "How does the interview coach AI analyze my answers?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The AI records your voice, transcribes it, and evaluates it using the STAR method (Situation, Task, Action, Result). It checks if your answers are concise, relevant, and impactful, providing instant feedback on areas to improve."
      }
    }]
  };

  const features = [
    {
      icon: <Drama className="w-7 h-7" />,
      tag: "Tailored Scenarios",
      title: "Role-Specific Scenarios",
      desc: "From Software Engineering to Marketing to Sales, get asked the technical and behavioral questions that actually matter for your specific role.",
      color: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-100",
    },
    {
      icon: "⭐",
      tag: "Structured Answers",
      title: "STAR Method Analysis",
      desc: "Our AI interview coach ensures your answers are structured perfectly using the STAR framework so you sound clear, concise, and impactful.",
      color: "bg-emerald-50 border-emerald-100",
      iconBg: "bg-emerald-100",
    },
    {
      icon: <Bot className="w-7 h-7" />,
      tag: "Dynamic AI",
      title: "Real-Time Follow-Ups",
      desc: "Unlike basic prompt lists, our dynamic AI probes deeper into your answers, just like a real hiring manager would during a live conversation.",
      color: "bg-indigo-50 border-indigo-100",
      iconBg: "bg-indigo-100",
    },
  ];

  const faqs = [
    {
      q: "What is an AI mock interview?",
      a: "An AI mock interview simulates a real job interview using artificial intelligence. It asks you role-specific questions and evaluates your spoken answers, tone, and pacing just like a human interviewer would."
    },
    {
      q: "How does the interview coach AI analyze my answers?",
      a: "The AI records your voice, transcribes it, and evaluates it using the STAR method (Situation, Task, Action, Result). It checks if your answers are concise, relevant, and impactful, providing instant feedback on areas to improve."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <SEO 
        title="AI Mock Interview Online: Practice & Prepare | Talvorax"
        description="Practice interviews with AI and get real-time feedback. Improve answers, tone, and confidence."
        url="https://talvorax.com/interview-coach"
        schema={schema}
        faqSchema={faqSchema}
      />
      <Navbar />

      {/* ── Hero ── */}
      <header className="pt-32 pb-24 px-6 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 text-sm font-semibold px-4 py-1.5 rounded-full border border-blue-200/50 mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block"></span>
          Hyper-Realistic · Role-Adaptive AI
        </div>

        <h1 className="text-5xl md:text-[3.75rem] font-[800] tracking-tight text-slate-900 leading-[1.15] mb-6">
          Crush Your Next Round with Your{' '}
          <span style={{ color: '#3B82F6' }}>Personal AI Interview Coach</span>
        </h1>

        <p className="text-lg md:text-xl text-[#475569] mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
          Don't practice in the mirror. Experience hyper-realistic AI mock interviews tailored to your exact industry, role, and seniority level before the real thing.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/dashboard/interview-coach"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-[14px] transition-all shadow-[0_8px_24px_rgba(22,33,29,0.15)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.40)] text-lg hover:-translate-y-0.5"
          >
            <Target className="w-5 h-5" /> Start Your Mock Interview
          </Link>
          <span className="text-sm text-[#8a938d] font-medium">Free · No setup required</span>
        </div>

        {/* Trust strip */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[#5b645f] font-medium">
          {['✓ Role-Specific Questions', '✓ STAR Method Scoring', '✓ Real-Time Follow-Ups', '✓ Instant Feedback'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </header>

      {/* ── Feature Cards ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-[800] text-slate-900 tracking-tight mb-4">
              Smarter Interview Practice AI for{' '}
              <span style={{ color: 'oklch(0.68 0.14 163)' }}>Immediate Results</span>
            </h2>
            <p className="text-[#5b645f] text-lg font-medium max-w-xl mx-auto">
              Three capabilities that mirror what a real hiring manager actually evaluates.
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
                <span className="text-xs font-bold uppercase tracking-widest text-blue-500">{f.tag}</span>
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
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-[14px] mb-6 text-emerald-700"><Mic className="w-7 h-7" /></div>
          <h2 className="text-3xl font-[800] text-slate-900 tracking-tight mb-4">
            Struggling with <span style={{ color: 'oklch(0.62 0.13 163)' }}>"umms" and "ahhs"?</span>
          </h2>
          <p className="text-[#475569] text-lg font-medium mb-8 max-w-xl mx-auto leading-relaxed">
            Before jumping into another mock interview, refine your speaking delivery to eliminate filler words completely.
          </p>
          <Link
            to="/minute-talk"
            className="inline-flex items-center gap-2 text-blue-500 font-bold text-lg border-b-2 border-blue-200 hover:border-blue-500 pb-0.5 transition-all"
          >
            Try our Minute Talk Tool <span>→</span>
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
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">Q</span>
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
