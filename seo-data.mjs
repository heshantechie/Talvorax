// seo-data.mjs
// Single source of truth for all per-route SEO data.
// Used by prerender.mjs at build-time to inject into static HTML files.
//
// IMPORTANT: When updating page titles/descriptions/schema in React components,
// also update the matching entry here so crawlers and users see the same content.

const BASE_URL = 'https://www.talvorax.com';
const OG_IMAGE = `${BASE_URL}/og-image.png`;

const NAV = `
<nav aria-label="Main navigation">
  <a href="/">Talvorax</a>
  <a href="/resume-analyzer">Resume Analyzer</a>
  <a href="/interview-coach">Interview Coach</a>
  <a href="/minute-talk">Minute Talk</a>
  <a href="/job-alerts">Job Alerts</a>
  <a href="/pricing">Pricing</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/auto-apply">Auto Apply</a>
  <a href="/upskill">Upskill</a>
  <a href="/login">Log In</a>
  <a href="/signup">Get Started Free</a>
</nav>`;

const FOOTER = `
<footer aria-label="Site footer">
  <nav aria-label="Footer navigation">
    <a href="/">Home</a>
    <a href="/resume-analyzer">Resume Analyzer</a>
    <a href="/interview-coach">Interview Coach</a>
    <a href="/minute-talk">Minute Talk</a>
    <a href="/auto-apply">Auto Apply</a>
    <a href="/communication-skills">Communication Skills</a>
    <a href="/upskill">Upskill</a>
    <a href="/job-alerts">Job Alerts</a>
    <a href="/pricing">Pricing</a>
    <a href="/about">About Us</a>
    <a href="/contact">Contact</a>
  </nav>
  <p>&#169; 2025 Talvorax. All rights reserved. AI career tools to help you land your dream job.</p>
</footer>`;

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Talvorax",
  "url": BASE_URL,
  "logo": OG_IMAGE,
  "description": "AI career tools to help job seekers beat ATS, ace interviews, and land their dream jobs faster.",
  "sameAs": []
};

function breadcrumb(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": `${BASE_URL}${item.path}`
    }))
  };
}

export const SEO_DATA = {

  '/': {
    title: 'AI Career Tools to Land Your Dream Job | Talvorax',
    description: 'Supercharge your job search with AI resume analyzer, mock interview coach, and speaking practice. Try Talvorax free.',
    canonical: `${BASE_URL}/`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Talvorax",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Supercharge your job search with AI resume analyzer, mock interview coach, and speaking practice. Try Talvorax free.",
        "url": BASE_URL,
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "153" }
      },
      ORG_SCHEMA,
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What are AI career tools?",
            "acceptedAnswer": { "@type": "Answer", "text": "AI career tools are software applications that use artificial intelligence to help candidates prepare for job applications. They include features like AI resume analyzers to beat Applicant Tracking Systems (ATS) and AI mock interview platforms to practice speaking and behavioral questions." }
          },
          {
            "@type": "Question",
            "name": "Is Talvorax free to use?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, Talvorax offers a free tier to try out our AI Resume Analyzer, Interview Coach, and Minute Talk tools to immediately improve your job search." }
          }
        ]
      },
      breadcrumb([{ name: 'Home', path: '/' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Land Your Next Job Faster with the Ultimate AI Career Tools</h1>
    <p>Stop guessing what recruiters want. Talvorax gives you instant resume feedback, realistic mock interviews, and real-time speaking practice&#8212;all powered by advanced AI.</p>
    <a href="/signup">Start Your Free Prep</a>
  </header>
  <section aria-labelledby="features-heading">
    <h2 id="features-heading">From Application to Offer: How Our AI Helps You Win</h2>
    <article>
      <h3>Resume Analyzer</h3>
      <p>Instantly detect missing ATS keywords and get AI-driven bullet point rewrites tailored to your target job description. Our AI resume analyzer gives you an ATS match score so you know exactly where you stand before you apply.</p>
      <a href="/resume-analyzer">Explore Resume Analyzer</a>
    </article>
    <article>
      <h3>Interview Practice</h3>
      <p>Take hyper-realistic AI mock interviews tailored to your exact industry, role, and seniority level. Get live feedback on the STAR method so every answer is clear, concise, and impactful to real hiring managers.</p>
      <a href="/interview-coach">Explore Interview Coach</a>
    </article>
    <article>
      <h3>Speaking Practice AI</h3>
      <p>Eliminate filler words automatically. Our Minute Talk AI analyzes your voice in real-time, measuring your speaking pace and flagging crutch words so you can master the art of confident communication before the big day.</p>
      <a href="/minute-talk">Explore Minute Talk</a>
    </article>
    <article>
      <h3>Communication Skills</h3>
      <p>Get real-time feedback on your tone, pacing, and clarity. Our AI analyzes your speech patterns and helps you speak with absolute confidence in any interview or presentation setting.</p>
      <a href="/communication-skills">Explore Communication Skills</a>
    </article>
    <article>
      <h3>Auto Apply</h3>
      <p>Automatically apply to jobs that match your resume profile. Our Auto Apply engine tracks your applications in the background so you can focus on preparing instead of manually browsing job boards.</p>
      <a href="/auto-apply">Explore Auto Apply</a>
    </article>
  </section>
  <section aria-labelledby="testimonials-heading">
    <h2 id="testimonials-heading">Why Job Seekers Trust Talvorax</h2>
    <blockquote>
      <p>"The AI resume analyzer caught 5 critical ATS keywords I was missing. I got an interview the very next day. Brilliant career tool."</p>
      <cite>&#8212; Sarah J., Software Engineer</cite>
    </blockquote>
    <blockquote>
      <p>"Practicing with the AI Mock interview felt exactly like the real thing. It completely removed my anxiety."</p>
      <cite>&#8212; Michael T., Marketing Manager</cite>
    </blockquote>
  </section>
  <section aria-labelledby="faq-home-heading">
    <h2 id="faq-home-heading">Frequently Asked Questions</h2>
    <dl>
      <dt>What are AI career tools?</dt>
      <dd>AI career tools are software applications that use artificial intelligence to help candidates prepare for job applications. They include features like AI resume analyzers to beat Applicant Tracking Systems (ATS) and AI mock interview platforms to practice speaking and behavioral questions.</dd>
      <dt>Is Talvorax free to use?</dt>
      <dd>Yes! You can try out our core AI tools for free to instantly improve your job search strategy. Our free tier includes basic resume analysis, limited interview coaching, and standard job alerts to get you started on the right foot.</dd>
    </dl>
  </section>
</main>
${FOOTER}`
  },

  '/resume-analyzer': {
    title: 'AI Resume Analyzer: Pass the ATS & Get Hired | Talvorax',
    description: 'Use our AI resume analyzer to beat ATS, optimize keywords, and get more interviews instantly.',
    canonical: `${BASE_URL}/resume-analyzer`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Talvorax AI Resume Analyzer",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Use our AI resume analyzer to beat ATS, optimize keywords, and get more interviews instantly.",
        "url": `${BASE_URL}/resume-analyzer`
      },
      ORG_SCHEMA,
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is an ATS resume checker?",
            "acceptedAnswer": { "@type": "Answer", "text": "An ATS resume checker simulates how Applicant Tracking Systems read your resume. It identifies missing keywords, formatting errors, and ensures your application easily passes through to a human recruiter." }
          },
          {
            "@type": "Question",
            "name": "How does the AI resume analyzer work?",
            "acceptedAnswer": { "@type": "Answer", "text": "You simply upload your resume and paste your target job description. The AI analyzes both, gives you an ATS match score, and suggests bullet-point rewrites to highlight your impact." }
          }
        ]
      },
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Resume Analyzer', path: '/resume-analyzer' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>See If Your Resume Passes the Bot Test with Our AI Resume Analyzer</h1>
    <p>Upload your resume and paste your target job description. We'll instantly provide an ATS match score, identify missing keywords, and suggest line-by-line improvements to help you land more interviews.</p>
    <a href="/signup">Scan My Resume Now</a>
  </header>
  <section aria-labelledby="ats-features-heading">
    <h2 id="ats-features-heading">Stop Getting Ghosted. Start Beating the ATS.</h2>
    <div>
      <h3>ATS Keyword Matching</h3>
      <p>Instantly uncover the exact skills and keywords you're missing compared to the job description. Our AI cross-references your resume against the target role and identifies every critical gap so you can fill them before applying and dramatically increase your match score.</p>
    </div>
    <div>
      <h3>Action-Driven Feedback</h3>
      <p>Stop sending generic bullet points. Get AI-generated rewritten bullet points that highlight your measurable impact and achievements. Our analyzer transforms weak experience statements into powerful, results-oriented lines that catch recruiter attention and communicate your value clearly.</p>
    </div>
    <div>
      <h3>Formatting Checks</h3>
      <p>Ensure your layout is readable by modern Applicant Tracking Systems so you don't get auto-rejected by formatting errors. Our system checks your resume structure, font consistency, section headers, and file format compatibility to ensure clean parsing.</p>
    </div>
  </section>
  <section aria-labelledby="next-steps-resume-heading">
    <h2 id="next-steps-resume-heading">Passed the ATS? What's Next:</h2>
    <p>A great resume is only the first step. Once your resume gets you the interview, you need to be ready to articulate your experience perfectly. Practice your delivery with our AI tools, explore advanced communication techniques, or set up job alerts for your newly optimized profile.</p>
    <nav aria-label="Related tools">
      <a href="/interview-coach">Try the AI Mock Interview</a>
      <a href="/minute-talk">Improve Speaking Pace</a>
      <a href="/job-alerts">Set Up Job Alerts</a>
    </nav>
  </section>
  <section aria-labelledby="faq-resume-heading">
    <h2 id="faq-resume-heading">Frequently Asked Questions</h2>
    <dl>
      <dt>What is an ATS resume checker?</dt>
      <dd>An ATS resume checker simulates how Applicant Tracking Systems read your resume. It identifies missing keywords, formatting errors, and ensures your application easily passes through to a human recruiter.</dd>
      <dt>How does the AI resume analyzer work?</dt>
      <dd>You simply upload your resume and paste your target job description. The AI analyzes both, gives you an ATS match score, and suggests bullet-point rewrites to highlight your impact.</dd>
    </dl>
  </section>
</main>
${FOOTER}`
  },

  '/interview-coach': {
    title: 'AI Mock Interview Online: Practice & Prepare | Talvorax',
    description: 'Practice interviews with AI and get real-time feedback. Improve answers, tone, and confidence.',
    canonical: `${BASE_URL}/interview-coach`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Talvorax AI Interview Coach",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Practice interviews with AI and get real-time feedback. Improve answers, tone, and confidence.",
        "url": `${BASE_URL}/interview-coach`
      },
      ORG_SCHEMA,
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is an AI mock interview?",
            "acceptedAnswer": { "@type": "Answer", "text": "An AI mock interview simulates a real job interview using artificial intelligence. It asks you role-specific questions and evaluates your spoken answers, tone, and pacing just like a human interviewer would." }
          },
          {
            "@type": "Question",
            "name": "How does the interview coach AI analyze my answers?",
            "acceptedAnswer": { "@type": "Answer", "text": "The AI records your voice, transcribes it, and evaluates it using the STAR method (Situation, Task, Action, Result). It checks if your answers are concise, relevant, and impactful, providing instant feedback on areas to improve." }
          }
        ]
      },
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Interview Coach', path: '/interview-coach' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Crush Your Next Round with Your Personal AI Interview Coach</h1>
    <p>Don't practice in the mirror. Experience hyper-realistic AI mock interviews tailored to your exact industry, role, and seniority level before the real thing. Get scored on your answers and improve with every session.</p>
    <a href="/signup">Start Your Mock Interview</a>
  </header>
  <section aria-labelledby="interview-features-heading">
    <h2 id="interview-features-heading">Smarter Interview Practice AI for Immediate Results</h2>
    <div>
      <h3>Role-Specific Scenarios</h3>
      <p>From Software Engineering to Marketing to Sales, get asked the technical and behavioral questions that actually matter to your specific role and seniority. Our AI interview coach generates tailored scenarios based on thousands of real interview data points from top companies.</p>
    </div>
    <div>
      <h3>STAR Method Analysis</h3>
      <p>Our AI interview coach ensures your answers are structured perfectly using the STAR framework (Situation, Task, Action, Result) so you sound clear, concise, and impactful. Every response is scored on completeness and delivery quality with actionable improvement suggestions.</p>
    </div>
    <div>
      <h3>Real-Time Follow-Ups</h3>
      <p>Unlike basic prompt lists, our dynamic AI probes deeper into your answers, just like a real hiring manager would during a live conversation. This ensures you're prepared for unexpected follow-up questions, not just rehearsed surface-level responses.</p>
    </div>
  </section>
  <section aria-labelledby="next-steps-interview-heading">
    <h2 id="next-steps-interview-heading">Mastered the Interview? What's Next:</h2>
    <p>Before jumping into another mock interview, refine your speaking delivery to eliminate filler words completely. Or, if you want to make sure your profile is fully optimized for Applicant Tracking Systems before applying, use our other AI-driven career tools.</p>
    <nav aria-label="Related tools">
      <a href="/minute-talk">Try our Minute Talk Tool</a>
      <a href="/resume-analyzer">Analyze Your Resume</a>
      <a href="/communication-skills">Boost Communication</a>
    </nav>
  </section>
  <section aria-labelledby="faq-interview-heading">
    <h2 id="faq-interview-heading">Frequently Asked Questions</h2>
    <dl>
      <dt>What is an AI mock interview?</dt>
      <dd>An AI mock interview simulates a real job interview using artificial intelligence. It asks you role-specific questions and evaluates your spoken answers, tone, and pacing just like a human interviewer would.</dd>
      <dt>How does the interview coach AI analyze my answers?</dt>
      <dd>The AI records your voice, transcribes it, and evaluates it using the STAR method (Situation, Task, Action, Result). It checks if your answers are concise, relevant, and impactful, providing instant feedback on areas to improve.</dd>
    </dl>
  </section>
</main>
${FOOTER}`
  },

  '/minute-talk': {
    title: 'AI Speaking Practice Tool: Improve Communication | Talvorax',
    description: 'Improve communication skills with AI. Eliminate filler words and speak confidently.',
    canonical: `${BASE_URL}/minute-talk`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Talvorax Minute Talk",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Improve communication skills with AI. Eliminate filler words and speak confidently.",
        "url": `${BASE_URL}/minute-talk`
      },
      ORG_SCHEMA,
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is AI speaking practice?",
            "acceptedAnswer": { "@type": "Answer", "text": "AI speaking practice involves using artificial intelligence to analyze your voice in real-time. It detects filler words, measures speaking speed (words per minute), and evaluates clarity." }
          },
          {
            "@type": "Question",
            "name": "How can an AI improve communication skills?",
            "acceptedAnswer": { "@type": "Answer", "text": "By performing daily 60-second drills, AI helps you build awareness of your vocal habits. You get instant feedback on crutch words and pacing, allowing you to train yourself for better public speaking online and in-person." }
          }
        ]
      },
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Minute Talk', path: '/minute-talk' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Speak with Confidence Using Advanced AI Speaking Practice</h1>
    <p>Whether you're prepping for a presentation or an interview, Minute Talk analyzes your voice in real-time. Catch your filler words, adjust your pace, and master the art of public speaking online with 60-second daily practice sessions.</p>
    <a href="/signup">Record a Minute Talk Now</a>
  </header>
  <section aria-labelledby="speaking-features-heading">
    <h2 id="speaking-features-heading">The Fastest Way to Improve Communication Skills with AI</h2>
    <div>
      <h3>Filler Word Detection</h3>
      <p>Automatically catch "ums," "likes," and "you knows." Our speaking practice tool highlights exactly when you lose your train of thought so you can consciously eliminate these habits from your vocabulary. Over time, this transforms your delivery into fluent, confident speech that commands attention.</p>
    </div>
    <div>
      <h3>Pace and Tone Analysis</h3>
      <p>Ensure you aren't speaking too fast or sounding monotonous. The AI analyzes your words per minute to keep you in the "sweet spot" of communication &#8212; fast enough to sound confident, slow enough to be understood clearly by any audience.</p>
    </div>
    <div>
      <h3>Daily 60-Second Drills</h3>
      <p>Build the habit of articulate speech with bite-sized daily practice. Train your brain to speak smoothly and naturally without pressure. Our rapid-fire session format builds muscle memory for confident speaking in real interviews and presentations alike.</p>
    </div>
  </section>
  <section aria-labelledby="next-steps-minute-heading">
    <h2 id="next-steps-minute-heading">Ready to Master Your Next Interview?</h2>
    <p>Once you have eliminated filler words and mastered your speaking pace, you're ready for the big leagues. Put your skills to the test in a high-pressure AI mock interview, or ensure your resume is ready to get you through the door in the first place.</p>
    <nav aria-label="Related tools">
      <a href="/interview-coach">Start AI Mock Interview</a>
      <a href="/resume-analyzer">Optimize Your Resume</a>
      <a href="/job-alerts">Find New Jobs</a>
    </nav>
  </section>
  <section aria-labelledby="faq-minute-heading">
    <h2 id="faq-minute-heading">Frequently Asked Questions</h2>
    <dl>
      <dt>What is AI speaking practice?</dt>
      <dd>AI speaking practice involves using artificial intelligence to analyze your voice in real-time. It detects filler words, measures speaking speed (words per minute), and evaluates clarity.</dd>
      <dt>How can an AI improve communication skills?</dt>
      <dd>By performing daily 60-second drills, AI helps you build awareness of your vocal habits. You get instant feedback on crutch words and pacing, allowing you to train yourself for better public speaking online and in-person.</dd>
    </dl>
  </section>
</main>
${FOOTER}`
  },

  '/job-alerts': {
    title: 'Smart AI Job Alerts | Talvorax',
    description: 'Get notified instantly when jobs matching your exact skills and resume profile are posted. AI-powered job matching for serious job seekers.',
    canonical: `${BASE_URL}/job-alerts`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Job Alerts & AI Matching &#8212; Talvorax",
        "description": "Get notified instantly when jobs matching your exact skills and resume profile are posted.",
        "url": `${BASE_URL}/job-alerts`
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Talvorax Job Alerts",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "AI-powered job matching and instant alerts for job seekers.",
        "url": `${BASE_URL}/job-alerts`
      },
      ORG_SCHEMA,
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Job Alerts', path: '/job-alerts' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Job Alerts &amp; AI Matching</h1>
    <p>Get AI-powered job recommendations tuned specifically to your resume. Stop manually searching job boards &#8212; let our intelligent matching engine surface the exact roles that fit your profile, skills, and career goals in real time.</p>
    <a href="/signup">Set Up Your Job Alerts</a>
  </header>
  <section aria-labelledby="job-alerts-features-heading">
    <h2 id="job-alerts-features-heading">How AI Job Matching Works</h2>
    <div>
      <h3>Resume-Matched Recommendations</h3>
      <p>Our AI analyzes your resume and identifies the roles you are most qualified for. Instead of broad keyword searches, you get precise matches based on your actual experience, skills, and career trajectory. Every recommendation is ranked by compatibility score so you know where to focus your energy.</p>
    </div>
    <div>
      <h3>Instant Alert Notifications</h3>
      <p>The moment a matching job is posted on major job boards, Talvorax surfaces it for you. Get real-time notifications so you can apply early &#8212; before hundreds of other candidates &#8212; maximizing your chances of standing out to recruiters and hiring managers.</p>
    </div>
    <div>
      <h3>Smart Filters &amp; Preferences</h3>
      <p>Customize your alerts by location, salary range, remote preference, company size, and industry. Our system learns your preferences over time and continuously refines your job recommendations for better accuracy and relevance with each session.</p>
    </div>
  </section>
  <section aria-labelledby="job-alerts-next-heading">
    <h2 id="job-alerts-next-heading">Once You Find the Right Role:</h2>
    <p>Finding the right opportunity is just the beginning. Make sure your resume is optimized to beat the ATS for each application, and prepare your interview responses using our AI coach so you're ready the moment the call comes.</p>
    <nav aria-label="Related tools">
      <a href="/resume-analyzer">Optimize Your Resume</a>
      <a href="/interview-coach">Prepare for Interviews</a>
      <a href="/auto-apply">Auto Apply to Jobs</a>
    </nav>
  </section>
</main>
${FOOTER}`
  },

  '/pricing': {
    title: 'Talvorax Pricing: Simple Plans for Job Seekers',
    description: 'Choose a free or pro plan to supercharge your job search with our AI resume analyzer and interview coach.',
    canonical: `${BASE_URL}/pricing`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Talvorax Pricing",
        "description": "Simple, transparent pricing for the ultimate AI career toolkit. Upgrade to land your next job faster.",
        "url": `${BASE_URL}/pricing`
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Talvorax Plans",
        "itemListElement": [
          { "@type": "Offer", "position": 1, "name": "Free Plan", "description": "Basic Resume Analysis (3/month), Minute Talk Standard Practice, Standard Job Alerts, Limited Interview Coaching.", "price": "0", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": `${BASE_URL}/pricing` },
          { "@type": "Offer", "position": 2, "name": "Pro Plan", "description": "Unlimited Resume Analysis & Tracking, Advanced AI Interview Coach (All Roles), Auto Apply Integration, Priority Support & Feedback.", "price": "19", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": `${BASE_URL}/pricing` }
        ]
      },
      ORG_SCHEMA,
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Choose Your Plan</h1>
    <p>Simple, transparent pricing to help you land your dream job faster. Start free and upgrade when you're ready to accelerate your job search with the full power of Talvorax AI.</p>
  </header>
  <section aria-labelledby="pricing-plans-heading">
    <h2 id="pricing-plans-heading">Talvorax Plans &amp; Pricing</h2>
    <div>
      <h3>Free Plan &#8212; $0 / forever</h3>
      <p>Perfect for getting started with AI career tools. Everything you need to begin optimizing your job search at no cost.</p>
      <ul>
        <li>Basic Resume Analysis (3 per month)</li>
        <li>Minute Talk Standard Practice</li>
        <li>Standard Job Alerts</li>
        <li>Limited Interview Coaching</li>
      </ul>
      <a href="/signup">Get Started Free</a>
    </div>
    <div>
      <h3>Pro Plan &#8212; $19 / month</h3>
      <p>Supercharge your job hunt with unlimited access to every AI career tool Talvorax offers. The most popular choice for serious job seekers.</p>
      <ul>
        <li>Unlimited Resume Analysis &amp; Tracking</li>
        <li>Advanced AI Interview Coach (All Roles)</li>
        <li>Auto Apply Integration</li>
        <li>Priority Support &amp; Feedback</li>
      </ul>
      <a href="/signup?plan=pro">Upgrade Now</a>
    </div>
  </section>
  <section aria-labelledby="faq-pricing-heading">
    <h2 id="faq-pricing-heading">Frequently Asked Questions</h2>
    <dl>
      <dt>Can I really use the AI for free?</dt>
      <dd>Yes! Our Free Plan gives you access to basic resume analysis, limited interview coaching, and our standard job alerts. It's the perfect way to try out Talvorax and see how AI can accelerate your job search without any commitment.</dd>
      <dt>What happens when I upgrade to Pro?</dt>
      <dd>When you upgrade to the Pro Plan, you unlock unlimited resume analysis, advanced role-specific interview coaching, priority support, and access to our auto-apply integration. This allows you to scale your job application process and ensure every single application is perfectly tailored to beat the ATS.</dd>
      <dt>How does the interview coach work on the Pro plan?</dt>
      <dd>The Pro interview coach allows you to select highly specialized roles and simulates intense, realistic technical and behavioral rounds that push you to your limits, preparing you for the toughest hiring managers.</dd>
    </dl>
  </section>
  <nav aria-label="Explore tools">
    <h2>Explore Our Tools</h2>
    <a href="/resume-analyzer">Resume Analyzer</a>
    <a href="/interview-coach">Interview Coach</a>
    <a href="/minute-talk">Speaking Practice</a>
    <a href="/about">About Us</a>
  </nav>
</main>
${FOOTER}`
  },

  '/about': {
    title: 'About Talvorax | AI Career Tools',
    description: 'Learn about our mission to democratize career growth with advanced AI resume analyzers and interview coaching.',
    canonical: `${BASE_URL}/about`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "name": "About Talvorax",
        "description": "Learn about our mission to democratize career growth with advanced AI resume analyzers and interview coaching.",
        "url": `${BASE_URL}/about`
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Talvorax",
        "url": BASE_URL,
        "logo": OG_IMAGE,
        "description": "We are on a mission to democratize career growth. Talvorax leverages cutting-edge AI to provide personalized tools that help candidates stand out, upskill efficiently, and land their dream jobs.",
        "knowsAbout": ["AI Resume Analysis", "Mock Interview Coaching", "Job Search Automation", "Communication Skills Training"]
      },
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>About Us</h1>
    <p>We are on a mission to democratize career growth. Talvorax leverages cutting-edge AI to provide personalized tools that help candidates stand out, upskill efficiently, and land their dream jobs faster than ever before.</p>
  </header>
  <section aria-labelledby="mission-heading">
    <h2 id="mission-heading">Our Mission, Vision &amp; Values</h2>
    <div>
      <h3>Our Mission</h3>
      <p>To provide every job seeker with the tools they need to navigate the modern hiring landscape with confidence. We believe that talent should never be overlooked because of resume formatting or lack of interview preparation. AI levels the playing field for every candidate.</p>
    </div>
    <div>
      <h3>Our Vision</h3>
      <p>A world where talent and opportunity meet frictionlessly, enabled by smart, unbiased technology. We envision a future where every qualified candidate gets a fair shot at their dream job, regardless of their background or access to career coaching resources.</p>
    </div>
    <div>
      <h3>Who We Are</h3>
      <p>A passionate team of engineers, designers, and career experts dedicated to your success. Our team combines deep expertise in artificial intelligence, human resources, and product design to build tools that make a real, measurable difference in people's careers and lives.</p>
    </div>
  </section>
  <section aria-labelledby="tools-journey-heading">
    <h2 id="tools-journey-heading">Empowering Your Career Journey</h2>
    <p>Our suite of tools covers every aspect of the job search lifecycle &#8212; from optimizing your resume to land the interview, to practicing your responses, to automating your applications at scale. Every tool is designed with one goal: helping you get hired faster.</p>
    <nav aria-label="Our tools">
      <a href="/resume-analyzer">Resume Analyzer</a>
      <a href="/interview-coach">Interview Coach</a>
      <a href="/minute-talk">Minute Talk</a>
      <a href="/auto-apply">Auto Apply</a>
      <a href="/communication-skills">Communication Skills</a>
      <a href="/upskill">Upskill Platform</a>
    </nav>
  </section>
</main>
${FOOTER}`
  },

  '/contact': {
    title: 'Contact Talvorax | AI Career Tools Support',
    description: 'Have questions about our AI resume analyzer or interview coach? Contact the Talvorax support team today.',
    canonical: `${BASE_URL}/contact`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "Contact Talvorax",
        "description": "Have questions about our AI resume analyzer or interview coach? Contact the Talvorax support team today.",
        "url": `${BASE_URL}/contact`
      },
      ORG_SCHEMA,
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Get in Touch</h1>
    <p>Have questions about our tools, pricing, or need support? Our team is here to help you succeed in your job search. Reach out and we'll get back to you as soon as possible with everything you need.</p>
  </header>
  <section aria-labelledby="contact-info-heading">
    <h2 id="contact-info-heading">Contact Information</h2>
    <div>
      <h3>Email Us</h3>
      <p><a href="mailto:support@talvorax.com">support@talvorax.com</a></p>
      <p>We aim to respond to all inquiries within 24 hours on business days. For urgent billing or account issues, please include your account email in the subject line for faster routing to the right team member.</p>
    </div>
    <div>
      <h3>Chat Support</h3>
      <p>Available Monday to Friday, 9am to 5pm EST. Use the chat widget in the bottom-right corner of any page to speak with our support team in real time about your AI resume analyzer, interview coach, or any other Talvorax tool.</p>
    </div>
  </section>
  <section aria-labelledby="contact-tools-heading">
    <h2 id="contact-tools-heading">Explore Our Tools</h2>
    <p>While you wait for a response, explore what Talvorax has to offer. Our AI-powered career tools are designed to help you land interviews faster and perform better once you're in the room with a hiring manager.</p>
    <nav aria-label="Tools navigation">
      <a href="/resume-analyzer">Resume Analyzer</a>
      <a href="/interview-coach">Interview Coach</a>
      <a href="/pricing">Pricing Plans</a>
      <a href="/about">About Us</a>
    </nav>
  </section>
</main>
${FOOTER}`
  },

  '/auto-apply': {
    title: 'AI Auto Apply & Co-pilot | Talvorax',
    description: 'Automatically apply to jobs that match your resume. Track your applications and settings with Talvorax\'s AI-powered Auto Apply engine.',
    canonical: `${BASE_URL}/auto-apply`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Talvorax Auto Apply",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Automatically apply to jobs that match your resume. Track your applications and let AI handle the volume of your job search.",
        "url": `${BASE_URL}/auto-apply`
      },
      ORG_SCHEMA,
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Auto Apply', path: '/auto-apply' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>AI Auto Apply &amp; Co-pilot</h1>
    <p>Put your job hunt on autopilot. Talvorax's Auto Apply engine automatically finds jobs that match your resume profile and submits applications on your behalf &#8212; so you can focus on preparing for interviews instead of grinding through job boards.</p>
    <a href="/signup">Start Auto Applying</a>
  </header>
  <section aria-labelledby="auto-apply-features-heading">
    <h2 id="auto-apply-features-heading">How the AI Auto Apply Engine Works</h2>
    <div>
      <h3>Smart Job Matching</h3>
      <p>Our AI analyzes your resume, experience, skills, and preferences to identify the jobs you're most likely to be considered for. It sources roles from major job boards in real time and ranks them by compatibility with your profile, so you're only applying to jobs where you have a genuine shot.</p>
    </div>
    <div>
      <h3>Automatic Application Submission</h3>
      <p>Once you set your preferences and enable Auto Apply, our co-pilot handles the repetitive submission work. Applications are sent with your resume and tailored cover letter suggestions, ensuring each submission is personalized, professional, and optimized for each specific role.</p>
    </div>
    <div>
      <h3>Application Tracking Dashboard</h3>
      <p>Track every application in one centralized dashboard. See which roles you've applied to, monitor response rates, and identify patterns in which types of applications get callbacks. Use this data to continuously refine your targeting strategy and improve results over time.</p>
    </div>
  </section>
  <section aria-labelledby="auto-apply-next-heading">
    <h2 id="auto-apply-next-heading">Maximize Your Auto Apply Results</h2>
    <p>Auto Apply is most effective when combined with a strong, ATS-optimized resume and sharp interview skills. Make sure your profile is ready before enabling high-volume applications to maximize your response rate.</p>
    <nav aria-label="Related tools">
      <a href="/resume-analyzer">Optimize Your Resume First</a>
      <a href="/interview-coach">Practice Interview Responses</a>
      <a href="/job-alerts">Set Up Job Alerts</a>
    </nav>
  </section>
</main>
${FOOTER}`
  },

  '/communication-skills': {
    title: 'Improve Communication Skills | AI Practice',
    description: 'Master your verbal delivery with AI. Get real-time feedback on tone, pacing, filler words, and clarity to speak with absolute confidence.',
    canonical: `${BASE_URL}/communication-skills`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Communication Skills &#8212; Talvorax",
        "description": "Master your verbal delivery with AI. Get real-time feedback on tone, pacing, filler words, and clarity.",
        "url": `${BASE_URL}/communication-skills`
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Talvorax Communication Skills Trainer",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "AI-powered communication skills training with real-time feedback on tone, pacing, and filler words.",
        "url": `${BASE_URL}/communication-skills`
      },
      ORG_SCHEMA,
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Communication Skills', path: '/communication-skills' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Communication Skills</h1>
    <p>Master your verbal delivery. Get real-time feedback on tone, pacing, filler words, and clarity to speak with absolute confidence in every interview, presentation, and professional conversation you have.</p>
    <a href="/signup">Start Practicing</a>
  </header>
  <section aria-labelledby="comm-features-heading">
    <h2 id="comm-features-heading">AI-Powered Communication Training Features</h2>
    <div>
      <h3>Tone Analysis</h3>
      <p>Ensure your voice projects confidence and enthusiasm. Our AI analyzes your vocal tone and identifies when you sound uncertain, monotonous, or disengaged. With guided practice, you'll learn to modulate your tone naturally to engage any audience and communicate authority effectively.</p>
    </div>
    <div>
      <h3>Speech Pacing</h3>
      <p>Learn to speak at an optimal speed for maximum impact. Speaking too fast loses your audience; too slow loses their attention. Our AI measures your words per minute and gives you actionable feedback to find your ideal speaking cadence for different contexts and audiences.</p>
    </div>
    <div>
      <h3>Filler Word Tracking</h3>
      <p>Eliminate "um," "ah," and "like" from your vocabulary permanently. Our system detects filler words in real-time and tracks them across multiple sessions so you can monitor your improvement over time and build lasting awareness of your verbal habits.</p>
    </div>
  </section>
  <section aria-labelledby="comm-tools-heading">
    <h2 id="comm-tools-heading">Explore Our Tools</h2>
    <p>Strong communication skills work best when combined with excellent interview preparation and a polished resume. Explore the full Talvorax suite to cover every aspect of your job search from application to offer.</p>
    <nav aria-label="Explore tools">
      <a href="/resume-analyzer">Resume Analyzer</a>
      <a href="/interview-coach">Interview Coach</a>
      <a href="/pricing">Pricing Plans</a>
      <a href="/about">About Us</a>
    </nav>
  </section>
</main>
${FOOTER}`
  },

  '/upskill': {
    title: 'Upskill & Career Tools | Talvorax',
    description: 'Access our entire suite of AI career upskilling tools, including resume analysis, interview prep, and auto-apply engines.',
    canonical: `${BASE_URL}/upskill`,
    ogImage: OG_IMAGE,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Upskill Platform &#8212; Talvorax",
        "description": "Access our entire suite of AI career upskilling tools, including resume analysis, interview prep, and auto-apply engines.",
        "url": `${BASE_URL}/upskill`
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Talvorax Upskill Tools",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Resume Analyzer", "url": `${BASE_URL}/resume-analyzer` },
          { "@type": "ListItem", "position": 2, "name": "Interview Coach", "url": `${BASE_URL}/interview-coach` },
          { "@type": "ListItem", "position": 3, "name": "Minute Talk", "url": `${BASE_URL}/minute-talk` },
          { "@type": "ListItem", "position": 4, "name": "Auto Apply", "url": `${BASE_URL}/auto-apply` },
          { "@type": "ListItem", "position": 5, "name": "Communication Skills", "url": `${BASE_URL}/communication-skills` }
        ]
      },
      ORG_SCHEMA,
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Upskill', path: '/upskill' }])
    ],
    body: `${NAV}
<main>
  <header>
    <h1>Upskill Platform</h1>
    <p>Everything you need to master your career transition. The modern job market requires more than just a good resume &#8212; you need pristine interview skills, crisp communication, and volume to stand out. Let our AI platform guide your journey from application to offer.</p>
  </header>
  <section aria-labelledby="upskill-modules-heading">
    <h2 id="upskill-modules-heading">AI Career Upskilling Modules</h2>
    <article>
      <h3><a href="/resume-analyzer">Resume Analyzer</a></h3>
      <p>AI-driven resume feedback and ATS optimization to help you land more interviews. Upload your resume, paste the job description, and receive an instant ATS compatibility score with actionable rewrites for every bullet point.</p>
    </article>
    <article>
      <h3><a href="/interview-coach">Interview Coach</a></h3>
      <p>Simulated technical and behavioral interviews with real-time adaptive feedback. Practice role-specific questions and get scored on the STAR method so every answer is polished and confident before the real interview.</p>
    </article>
    <article>
      <h3><a href="/minute-talk">Minute Talk</a></h3>
      <p>Perfect your elevator pitch with concise 60-second rapid practice modes. Build the habit of confident, filler-free speech with daily drills that develop your vocal delivery and communication clarity under pressure.</p>
    </article>
    <article>
      <h3><a href="/auto-apply">Auto Apply</a></h3>
      <p>Put your job hunt on autopilot. Our engine applies to matched roles automatically, tracks your applications, and surfaces insights on which applications are getting the most traction and generating interview requests.</p>
    </article>
    <article>
      <h3><a href="/communication-skills">Communication Skills</a></h3>
      <p>Analyze your vocal delivery, pacing, and eliminate filler words to speak confidently in any situation. Our AI gives you real-time feedback on every dimension of your verbal communication performance.</p>
    </article>
  </section>
  <section aria-labelledby="upskill-more-heading">
    <h2 id="upskill-more-heading">More from Talvorax</h2>
    <nav aria-label="More tools">
      <a href="/pricing">View Pricing</a>
      <a href="/about">About Us</a>
      <a href="/contact">Contact Support</a>
      <a href="/signup">Create Free Account</a>
    </nav>
  </section>
</main>
${FOOTER}`
  }

};
