import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SEO 
        title="AI Career Tools to Land Your Dream Job | Talvorax"
        description="Supercharge your job search with AI resume analyzer, mock interview coach, and speaking practice. Try Talvorax free."
        url="https://talvorax.com/"
        schema={mainSchema}
        faqSchema={faqSchema}
      />
      <Navbar />
      
      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-[800] tracking-tight text-slate-900 leading-tight mb-6">
          Land Your Next Job Faster with the Ultimate AI Career Tools
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto font-medium">
          Stop guessing what recruiters want. Talvorax gives you instant resume feedback, realistic mock interviews, and real-time speaking practice—all powered by advanced AI.
        </p>
        <Link to="/signup" className="inline-block px-10 py-5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] text-xl hover:-translate-y-0.5">
          Start Your Free Prep
        </Link>
      </header>

      {/* Feature Sections */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">
            From Application to Offer: How Our AI Helps You Win
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Resume Analyzer */}
            <article className="p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-[#10B981]/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Resume Analyzer AI</h3>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-[#10B981] font-bold">✓</span>
                  Instantly detect missing ATS keywords
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-[#10B981] font-bold">✓</span>
                  Get AI-driven bullet point rewrites
                </li>
              </ul>
              <Link to="/resume-analyzer" className="text-[#10B981] font-bold hover:underline">Explore Resume Analyzer &rarr;</Link>
            </article>

            {/* Interview Coach */}
            <article className="p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Interview Practice AI</h3>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-blue-500 font-bold">✓</span>
                  Take hyper-realistic mock interviews
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-blue-500 font-bold">✓</span>
                  Get live feedback on the STAR method
                </li>
              </ul>
              <Link to="/interview-coach" className="text-blue-500 font-bold hover:underline">Explore Interview Coach &rarr;</Link>
            </article>

            {/* Minute Talk */}
            <article className="p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">🎙️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Speaking Practice AI</h3>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-purple-500 font-bold">✓</span>
                  Eliminate filler words automatically
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-purple-500 font-bold">✓</span>
                  Master your pacing before the big day
                </li>
              </ul>
              <Link to="/minute-talk" className="text-purple-500 font-bold hover:underline">Explore Minute Talk &rarr;</Link>
            </article>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-10">Why Job Seekers Trust Talvorax</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-left">
              <div className="flex text-[#10B981] mb-4">★★★★★</div>
              <p className="text-slate-600 italic mb-4">"The AI resume analyzer caught 5 critical ATS keywords I was missing. I got an interview the very next day. Brilliant career tool."</p>
              <p className="font-bold text-slate-900">- Sarah J., Software Engineer</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-left">
              <div className="flex text-[#10B981] mb-4">★★★★★</div>
              <p className="text-slate-600 italic mb-4">"practicing with the AI Mock interview felt exactly like the real thing. It completely removed my anxiety."</p>
              <p className="font-bold text-slate-900">- Michael T., Marketing Manager</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">What are AI career tools?</h3>
              <p className="text-slate-600">AI career tools are software applications that use artificial intelligence to help candidates prepare for job applications. They include features like AI resume analyzers to beat Applicant Tracking Systems (ATS) and AI mock interview platforms to practice speaking and behavioral questions.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Is Talvorax free to use?</h3>
              <p className="text-slate-600">Yes! You can try out our core AI tools for free to instantly improve your job search strategy.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
