import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { LandingNav } from '../components/LandingNav';

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SEO 
        title="AI Speaking Practice Tool: Improve Communication | Talvorax"
        description="Improve communication skills with AI. Eliminate filler words and speak confidently."
        url="https://talvorax.com/minute-talk"
        schema={schema}
        faqSchema={faqSchema}
      />
      <LandingNav />
      
      <header className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight text-slate-900 leading-tight mb-6">
          Speak with Confidence Using Advanced AI Speaking Practice
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto font-medium">
          Whether you're prepping for a presentation or an interview, Minute Talk analyzes your voice in real-time. Catch your filler words, adjust your pace, and master the art of public speaking online.
        </p>
        <Link to="/signup" className="inline-block px-10 py-5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] text-xl hover:-translate-y-0.5">
          Record a Minute Talk Now
        </Link>
      </header>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">
            The Fastest Way to Improve Communication Skills with AI
          </h2>
          <div className="space-y-8 text-lg text-slate-600">
            <div className="flex gap-4 items-start">
              <div className="bg-purple-500/10 text-purple-500 p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Filler Word Detection</h3>
                <p>Automatically catch "ums," "likes," and "you knows." Our speaking practice tool highlights exactly when you lose your train of thought.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-purple-500/10 text-purple-500 p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pace and Tone Analysis</h3>
                <p>Ensure you aren't speaking too fast or sounding monotonous. The AI analyzes your words per minute to keep you in the "sweet spot" of communication.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="bg-purple-500/10 text-purple-500 p-3 rounded-lg"><span className="text-xl font-bold">✓</span></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Daily 60-Second Drills</h3>
                <p>Build the habit of articulate speech with bite-sized daily practice. Train your brain to speak smoothly and naturally without pressure.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-50 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Ready for the real thing?</h2>
          <p className="text-xl text-slate-600 mb-8">
            Confident in your speaking skills? Put them to the test in a high-pressure AI mock interview.
          </p>
          <Link to="/resume-analyzer" className="text-purple-500 font-bold text-lg hover:underline">
            Check your resume before you interview &rarr;
          </Link>
        </div>
      </section>

      <section className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">What is AI speaking practice?</h3>
              <p className="text-slate-600">AI speaking practice involves using artificial intelligence to analyze your voice in real-time. It detects filler words, measures speaking speed (words per minute), and evaluates clarity.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">How can an AI improve communication skills?</h3>
              <p className="text-slate-600">By performing daily 60-second drills, AI helps you build awareness of your vocal habits. You get instant feedback on crutch words and pacing, allowing you to train yourself for better public speaking online and in-person.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
