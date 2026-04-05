import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { LandingNav } from '../components/LandingNav';

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SEO 
        title="AI Mock Interview Online: Practice & Prepare | Talvorax"
        description="Practice interviews with AI and get real-time feedback. Improve answers, tone, and confidence."
        url="https://talvorax.com/interview-coach"
        schema={schema}
        faqSchema={faqSchema}
      />
      <LandingNav />
      
      <header className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight text-slate-900 leading-tight mb-6">
          Crush Your Next Round with Your Personal AI Interview Coach
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto font-medium">
          Don't practice in the mirror. Experience hyper-realistic AI mock interviews tailored to your exact industry, role, and seniority level before the real thing.
        </p>
        <Link to="/signup" className="inline-block px-10 py-5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] text-xl hover:-translate-y-0.5">
          Start Your Mock Interview
        </Link>
      </header>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">
            Smarter Interview Practice AI for Immediate Results
          </h2>
          <div className="space-y-8 text-lg text-slate-600">
            <div className="flex gap-4 items-start">
              <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Role-Specific Scenarios</h3>
                <p>From Software Engineering to Marketing to Sales, get asked the technical and behavioral questions that actually matter to your specific role.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">STAR Method Analysis</h3>
                <p>Our AI interview coach ensures your answers are structured perfectly using the STAR frame so you sound clear, concise, and impactful.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Real-Time Follow-Ups</h3>
                <p>Unlike basic prompt lists, our dynamic AI probes deeper into your answers, just like a real hiring manager would during a live conversation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-50 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Struggling with "umms" and "ahhs"?</h2>
          <p className="text-xl text-slate-600 mb-8">
            Before jumping into another mock interview, refine your speaking delivery to eliminate filler words completely.
          </p>
          <Link to="/minute-talk" className="text-blue-500 font-bold text-lg hover:underline">
            Try our Minute Talk Tool &rarr;
          </Link>
        </div>
      </section>

      <section className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">What is an AI mock interview?</h3>
              <p className="text-slate-600">An AI mock interview simulates a real job interview using artificial intelligence. It asks you role-specific questions and evaluates your spoken answers, tone, and pacing just like a human interviewer would.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">How does the interview coach AI analyze my answers?</h3>
              <p className="text-slate-600">The AI records your voice, transcribes it, and evaluates it using the STAR method (Situation, Task, Action, Result). It checks if your answers are concise, relevant, and impactful, providing instant feedback on areas to improve.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
