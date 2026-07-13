import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';

import { Footer } from '../components/Footer';
export const ResumeAnalyzerLanding: React.FC = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Talvorax AI Resume Analyzer",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Use our AI resume analyzer to beat ATS, optimize keywords, and get more interviews instantly."
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What is an ATS resume checker?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An ATS resume checker simulates how Applicant Tracking Systems read your resume. It identifies missing keywords, formatting errors, and ensures your application easily passes through to a human recruiter."
      }
    }, {
      "@type": "Question",
      "name": "How does the AI resume analyzer work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You simply upload your resume and paste your target job description. The AI analyzes both, gives you an ATS match score, and suggests bullet-point rewrites to highlight your impact."
      }
    }]
  };

  const features = [
    {
      icon: "🎯",
      tag: "Keyword Intelligence",
      title: "ATS Keyword Matching",
      desc: "Instantly uncover the exact skills and keywords you're missing compared to the job description. Never lose to a bot again.",
      color: "bg-emerald-50 border-emerald-100",
      iconBg: "bg-emerald-100",
    },
    {
      icon: "✍️",
      tag: "AI Rewriting",
      title: "Action-Driven Feedback",
      desc: "Stop sending generic bullet points. Get AI-generated rewrites that highlight your measurable impact and achievements.",
      color: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-100",
    },
    {
      icon: "🧩",
      tag: "Layout Audit",
      title: "Formatting Checks",
      desc: "Ensure your layout is readable by modern Applicant Tracking Systems so you don't get auto-rejected by formatting errors.",
      color: "bg-purple-50 border-purple-100",
      iconBg: "bg-purple-100",
    },
  ];

  const faqs = [
    {
      q: "What is an ATS resume checker?",
      a: "An ATS resume checker simulates how Applicant Tracking Systems read your resume. It identifies missing keywords, formatting errors, and ensures your application easily passes through to a human recruiter."
    },
    {
      q: "How does the AI resume analyzer work?",
      a: "You simply upload your resume and paste your target job description. The AI analyzes both, gives you an ATS match score, and suggests bullet-point rewrites to highlight your impact."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <SEO 
        title="AI Resume Analyzer: Pass the ATS & Get Hired | Talvorax"
        description="Use our AI resume analyzer to beat ATS, optimize keywords, and get more interviews instantly."
        url="https://talvorax.com/resume-analyzer"
        schema={schema}
        faqSchema={faqSchema}
      />
      <Navbar />

      {/* ── Hero ── */}
      <header className="pt-32 pb-24 px-6 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#10B981]/10 text-[#059669] text-sm font-semibold px-4 py-1.5 rounded-full border border-[#10B981]/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse inline-block"></span>
          AI-Powered • Instant Results
        </div>

        <h1 className="text-5xl md:text-[3.75rem] font-[800] tracking-tight text-[#0F172A] leading-[1.15] mb-6">
          See If Your Resume{' '}
          <span style={{ color: '#10B981' }}>Passes the Bot Test</span>{' '}
          with Our AI Resume Analyzer
        </h1>

        <p className="text-lg md:text-xl text-[#475569] mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
          Upload your resume and paste your target job description. We'll instantly provide an ATS match score, identify missing keywords, and suggest line-by-line improvements.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/dashboard/resume-analyzer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_24px_rgba(16,185,129,0.30)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.40)] text-lg hover:-translate-y-0.5"
          >
            <span>📄</span> Scan My Resume Now
          </Link>
          <span className="text-sm text-[#94A3B8] font-medium">Free · No credit card needed</span>
        </div>

        {/* Trust strip */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[#64748B] font-medium">
          {['✅ ATS Match Score', '✅ Keyword Gap Analysis', '✅ AI Bullet Rewrites', '✅ Formatting Audit'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </header>

      {/* ── Feature Cards ── */}
      <section className="py-20 px-6 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-[800] text-[#0F172A] tracking-tight mb-4">
              Stop Getting Ghosted.{' '}
              <span style={{ color: '#10B981' }}>Start Beating the ATS.</span>
            </h2>
            <p className="text-[#64748B] text-lg font-medium max-w-xl mx-auto">
              Three powerful tools in one scan — so your resume reaches human eyes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-3xl p-8 border ${f.color} flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300`}
              >
                <div className={`w-12 h-12 ${f.iconBg} rounded-2xl flex items-center justify-center text-2xl`}>
                  {f.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#10B981]">{f.tag}</span>
                <h3 className="text-xl font-[800] text-[#0F172A] leading-tight">{f.title}</h3>
                <p className="text-[#475569] text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Next Step CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-[#E5E7EB] shadow-[0_8px_40px_rgba(16,185,129,0.08)] p-10 md:p-14 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#10B981]/10 rounded-2xl mb-6 text-2xl">🏆</div>
          <h2 className="text-3xl font-[800] text-[#0F172A] tracking-tight mb-4">
            Passed the ATS? <span style={{ color: '#10B981' }}>Next Step:</span>
          </h2>
          <p className="text-[#475569] text-lg font-medium mb-8 max-w-xl mx-auto leading-relaxed">
            Once your resume gets you the interview, you need to be ready. Practice your delivery with our AI Interview Coach.
          </p>
          <Link
            to="/interview-coach"
            className="inline-flex items-center gap-2 text-[#10B981] font-bold text-lg border-b-2 border-[#10B981]/30 hover:border-[#10B981] pb-0.5 transition-all"
          >
            Try the AI Mock Interview <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 bg-[#F8FAFC]">
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
