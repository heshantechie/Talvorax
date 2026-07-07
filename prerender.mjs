import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, 'dist');

// Define static metadata for each route to inject into the HTML head
// This replaces the heavy Puppeteer rendering step during build, ensuring Vercel compatibility.
const routes = {
  '/': { title: 'AI Career Tools to Land Your Dream Job | Talvorax', description: 'Supercharge your job search with AI resume analyzer, mock interview coach, and speaking practice. Try Talvorax free.' },
  '/resume-analyzer': { title: 'AI Resume Analyzer & ATS Keyword Scanner | Talvorax', description: 'Beat the ATS with our AI Resume Analyzer. Get instant feedback, keyword optimization, and bullet point rewrites to land more interviews.' },
  '/interview-coach': { title: 'AI Mock Interview Coach | Practice Technical & Behavioral Questions', description: 'Practice real-world technical and behavioral interviews with our AI coach. Get live feedback on your STAR method delivery.' },
  '/minute-talk': { title: '1-Minute Speaking Practice & Elevator Pitch AI', description: 'Master your elevator pitch. AI analyzes your pacing and filler words in 60-second rapid practice modes.' },
  '/job-alerts': { title: 'Smart AI Job Alerts | Talvorax', description: 'Get notified instantly when jobs matching your exact skills and resume profile are posted.' },
  '/pricing': { title: 'Pricing & Plans | Talvorax AI Career Tools', description: 'Simple, transparent pricing for the ultimate AI career toolkit. Upgrade to land your next job faster.' },
  '/about': { title: 'About Talvorax | Our Mission to Democratize Hiring', description: 'Learn about the team behind Talvorax and our mission to give every candidate an AI-powered edge in the job market.' },
  '/contact': { title: 'Contact Support | Talvorax', description: 'Get in touch with the Talvorax support team for help with your AI career tools, billing, or general inquiries.' },
  '/auto-apply': { title: 'AI Auto Apply & Co-pilot | Talvorax', description: 'Automatically apply to jobs that match your resume. Track your applications and settings.' },
  '/communication-skills': { title: 'Improve Communication Skills | AI Practice', description: 'Master your verbal delivery with AI. Get real-time feedback on tone, pacing, filler words, and clarity.' },
  '/upskill': { title: 'Upskill & Career Tools | Talvorax', description: 'Access our entire suite of AI career upskilling tools, including resume analysis, interview prep, and auto-apply engines.' }
};

function injectMeta(html, metadata) {
  let injected = html;
  
  if (metadata.title) {
    if (injected.includes('<title>')) {
      injected = injected.replace(/<title>.*?<\/title>/i, `<title>${metadata.title}</title>`);
    } else {
      injected = injected.replace('</head>', `  <title>${metadata.title}</title>\n  </head>`);
    }
  }

  if (metadata.description) {
    const metaTag = `<meta name="description" content="${metadata.description}" />`;
    if (injected.includes('name="description"')) {
      injected = injected.replace(/<meta name="description".*?>/i, metaTag);
    } else {
      injected = injected.replace('</head>', `  ${metaTag}\n  </head>`);
    }
  }

  return injected;
}

function prerender() {
  console.log('Starting static metadata injection (Serverless friendly prerender)...');
  
  const indexHtmlPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('dist/index.html not found. Make sure to run `vite build` first.');
    process.exit(1);
  }
  
  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  for (const [route, metadata] of Object.entries(routes)) {
    console.log(`Injecting SEO metadata for ${route}...`);
    const injectedHtml = injectMeta(baseHtml, metadata);

    let filePath = path.join(distPath, route);
    if (route === '/') {
      filePath = path.join(distPath, 'index.html');
    } else {
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }
      filePath = path.join(filePath, 'index.html');
    }

    fs.writeFileSync(filePath, injectedHtml);
    console.log(`Saved ${filePath}`);
  }

  console.log('Static metadata injection complete.');
}

prerender();
