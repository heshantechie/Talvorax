import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { LandingNav } from '../components/LandingNav';

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SEO 
        title="AI Resume Analyzer: Pass the ATS & Get Hired | Talvorax"
        description="Use our AI resume analyzer to beat ATS, optimize keywords, and get more interviews instantly."
        url="https://talvorax.com/resume-analyzer"
        schema={schema}
        faqSchema={faqSchema}
      />
      <LandingNav />
      
      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight text-slate-900 leading-tight mb-6">
          See If Your Resume Passes the Bot Test with Our AI Resume Analyzer
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto font-medium">
          Upload your resume and paste your target job description. We’ll instantly provide an ATS match score, identify missing keywords, and suggest line-by-line improvements.
        </p>
        <Link to="/signup" className="inline-block px-10 py-5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] text-xl hover:-translate-y-0.5">
          Scan My Resume Now
        </Link>
      </header>

      {/* Feature Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">
            Stop Getting Ghosted. Start Beating the ATS.
          </h2>
          <div className="space-y-8 text-lg text-slate-600">
            <div className="flex gap-4 items-start">
              <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">ATS Keyword Matching</h3>
                <p>Instantly uncover the exact skills and keywords you're missing compared to the job description.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Action-Driven Feedback</h3>
                <p>Stop sending generic tasks. Get AI-generated rewritten bullet points that highlight your measurable impact and achievements.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Formatting Checks</h3>
                <p>Ensure your layout is readable by modern Applicant Tracking Systems so you don't get auto-rejected by formatting errors.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Linking */}
      <section className="py-20 px-6 bg-slate-50 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Passed the ATS? Next Step:</h2>
          <p className="text-xl text-slate-600 mb-8">
            Once your resume gets you the interview, you need to be ready. Practice your delivery with our AI Interview Coach.
          </p>
          <Link to="/interview-coach" className="text-[#10B981] font-bold text-lg hover:underline">
            Try the AI Mock Interview &rarr;
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">What is an ATS resume checker?</h3>
              <p className="text-slate-600">An ATS resume checker simulates how Applicant Tracking Systems read your resume. It identifies missing keywords, formatting errors, and ensures your application easily passes through to a human recruiter.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">How does the AI resume analyzer work?</h3>
              <p className="text-slate-600">You simply upload your resume and paste your target job description. The AI analyzes both, gives you an ATS match score, and suggests bullet-point rewrites to highlight your impact.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
