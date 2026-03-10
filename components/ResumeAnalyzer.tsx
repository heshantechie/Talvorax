
import React, { useState, useRef } from 'react';
import { analyzeResume, rewriteResume, getRequiredSkillsForRole } from '../services/gemini';
import { AnalysisResult, ResumeRewrite } from '../types';

const DOMAINS = ['Software Engineering', 'Data Science', 'Product Management', 'Marketing', 'Sales', 'Finance', 'General'];

const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '📜',
    color: '#64748b', // Changed to slate
    desc: 'Traditional layout with serif-style headings, bordered sections. Ideal for corporate & enterprise roles.',
    preview: 'Formal • Bordered • Traditional'
  },
  {
    id: 'modern',
    name: 'Modern',
    icon: '🎨',
    color: '#10b981',
    desc: 'Clean sans-serif design with color accents and a two-column skills bar. Great for tech roles.',
    preview: 'Colorful • Two-Column • Bold'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    icon: '✨',
    color: '#334155', // Changed to slate/official
    desc: 'Simple, spacious layout focusing on content with elegant typography. Perfect for startups.',
    preview: 'Clean • Spacious • Elegant'
  }
];

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
};

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

// ─── PDF generation per template ───
const generatePDFClassic = (doc: any, content: string, margin: number, maxLineWidth: number, pageHeight: number) => {
  let y = margin;
  const lineHeight = 7;
  // Title bar
  doc.setFillColor(30, 30, 30); // Pure gray/black
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUME', margin, 18);
  doc.setTextColor(50, 50, 50);
  y = 40;

  const sections = content.split(/\n(?=[A-Z]{2,})/);
  for (const section of sections) {
    const lines = section.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) { y += 4; continue; }
      // Section heading
      if (/^[A-Z]{2,}/.test(line) && li === 0) {
        y += 6;
        doc.setDrawColor(0, 0, 0); // Black line
        doc.setLineWidth(0.8);
        doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
        y += 6;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0); // Black text
        const headLines = doc.splitTextToSize(line, maxLineWidth);
        for (const hl of headLines) {
          if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.text(hl, margin, y);
          y += lineHeight;
        }
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
      } else {
        const wrapped = doc.splitTextToSize(line, maxLineWidth);
        for (const wl of wrapped) {
          if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.text(wl, margin, y);
          y += lineHeight;
        }
      }
    }
  }
};

const generatePDFModern = (doc: any, content: string, margin: number, maxLineWidth: number, pageHeight: number) => {
  let y = margin;
  const lineHeight = 7;
  const accentColor = [16, 185, 129]; // emerald
  // Accent side bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, 6, pageHeight, 'F');
  // Title area
  doc.setFillColor(15, 23, 42);
  doc.rect(6, 0, doc.internal.pageSize.getWidth() - 6, 32, 'F');
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUME', margin + 6, 20);
  doc.setTextColor(50, 50, 50);
  y = 44;

  const sections = content.split(/\n(?=[A-Z]{2,})/);
  for (const section of sections) {
    const lines = section.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) { y += 4; continue; }
      if (/^[A-Z]{2,}/.test(line) && li === 0) {
        y += 8;
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.roundedRect(margin, y - 5, maxLineWidth, 10, 2, 2, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(line, margin + 4, y + 2);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        y += 14;
      } else {
        const wrapped = doc.splitTextToSize(line, maxLineWidth);
        for (const wl of wrapped) {
          if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]); doc.rect(0, 0, 6, pageHeight, 'F'); }
          doc.text(wl, margin, y);
          y += lineHeight;
        }
      }
    }
  }
};

const generatePDFMinimal = (doc: any, content: string, margin: number, maxLineWidth: number, pageHeight: number) => {
  let y = margin + 10;
  const lineHeight = 7;
  const bigMargin = margin + 5;
  const bigMaxWidth = maxLineWidth - 10;
  // Thin top line
  doc.setDrawColor(71, 85, 105); // slate-600
  doc.setLineWidth(1.5);
  doc.line(margin, margin, doc.internal.pageSize.getWidth() - margin, margin);
  doc.setTextColor(40, 40, 40);

  const sections = content.split(/\n(?=[A-Z]{2,})/);
  for (const section of sections) {
    const lines = section.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) { y += 5; continue; }
      if (/^[A-Z]{2,}/.test(line) && li === 0) {
        y += 8;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85); // slate-700
        const headLines = doc.splitTextToSize(line, bigMaxWidth);
        for (const hl of headLines) {
          if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.text(hl, bigMargin, y);
          y += lineHeight;
        }
        y += 2;
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal'); // Changed from courier to helvetica (sans-serif)
        doc.setFontSize(11);
      } else {
        const wrapped = doc.splitTextToSize(line, bigMaxWidth);
        for (const wl of wrapped) {
          if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.text(wl, bigMargin, y);
          y += lineHeight;
        }
      }
    }
  }
};

const ScoreGauge = ({ score }: { score: number }) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (240 / 360) * circumference;
  const dashOffset = circumference - (clampedScore / 100) * arcLength;
  const bgDashOffset = circumference - arcLength;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#0B1724] rounded-[2.5rem] shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden" style={{ width: '380px' }}>
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[50px]" />
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px]" />

      <div className="relative w-[300px] h-[300px]">
        {/* We keep the SVG unrotated, and just manage internal rotates for elements */}
        <svg width="300" height="300" viewBox="0 0 300 300" className="absolute inset-0">
          <defs>
            <linearGradient id="score-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" /> {/* cyan-500 */}
              <stop offset="50%" stopColor="#34d399" /> {/* emerald-400 */}
              <stop offset="100%" stopColor="#4ade80" /> {/* green-400 */}
            </linearGradient>
            <filter id="glow-heavy" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer glowing rings (full circles, bottom part will be covered by the pill) */}
          <circle cx="150" cy="150" r="140" fill="none" stroke="#2dd4bf" strokeWidth="4" strokeOpacity="0.15" filter="url(#glow-heavy)" />
          <circle cx="150" cy="150" r="140" fill="none" stroke="#2dd4bf" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="150" cy="150" r="128" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeOpacity="0.6" />
          <circle cx="150" cy="150" r="125" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.3" />

          {/* Dash Track (Ticks) */}
          <g stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
            {Array.from({ length: 41 }).map((_, i) => {
              // Needle pointing UP is angle 0.
              // To start at left-bottom (8 o'clock), we push 240 degrees clockwise from UP.
              const angle = 240 + i * (240 / 40);
              const isMajor = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1="150" y1="28" x2="150" y2={isMajor ? "40" : "33"}
                  transform={`rotate(${angle} 150 150)`}
                  stroke={isMajor ? "#64748b" : "#334155"}
                />
              );
            })}
          </g>

          {/* Background Arc */}
          <circle
            cx="150" cy="150" r={radius}
            fill="none" stroke="#0f172a" strokeWidth="16"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={bgDashOffset}
            transform="rotate(150 150 150)"
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          <circle
            cx="150" cy="150" r={radius}
            fill="none" stroke="url(#score-gradient)" strokeWidth="16"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform="rotate(150 150 150)"
            strokeLinecap="round"
            filter="url(#glow-light)"
          />

          {/* Needle Base Line behind dial center */}
          <line x1="80" y1="150" x2="220" y2="150" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.1" strokeDasharray="4 4" />

          {/* Needle Array & Pointer */}
          {clampedScore > 0 && ( /* Only show needle if score > 0 to prevent weird animations */
            <g transform={`rotate(${240 + (clampedScore / 100) * 240} 150 150)`} className="transition-transform duration-1000 origin-center ease-out">
              <polygon points="147,150 153,150 150,35" fill="#f8fafc" filter="url(#glow-light)" />
              <polygon points="148,150 152,150 150,35" fill="white" />
            </g>
          )}
        </svg>

        {/* Central Icons & Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 z-10">
          {/* Custom SVG icon reflecting the image's center graphic */}
          <div className="relative mb-2 drop-shadow-xl flex items-end">
            <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" /> {/* cyan-200 */}
                  <stop offset="100%" stopColor="#34d399" /> {/* emerald-400 */}
                </linearGradient>
              </defs>
              {/* 3 stacked files */}
              <path d="M25,25 h30 a5,5 0 0 1 5,5 v40 a5,5 0 0 1 -5,5 h-30 a5,5 0 0 1 -5,-5 v-40 a5,5 0 0 1 5,-5 Z" fill="none" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M32,18 h35 a5,5 0 0 1 5,5 v40 a5,5 0 0 1 -5,5 h-5 M32,68 v-45 M32,23 a5,5 0 0 0 -5,5" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

              {/* Horizontal lines on the top document */}
              <line x1="33" y1="35" x2="52" y2="35" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" />
              <line x1="33" y1="45" x2="48" y2="45" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" />
              <line x1="33" y1="55" x2="45" y2="55" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" />

              {/* Big Checkmark */}
              <path d="M 50,45 l 8,8 l 18,-20" fill="none" stroke="url(#icon-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

              {/* Bar Chart overlay */}
              <rect x="52" y="60" width="6" height="15" fill="#34d399" />
              <rect x="62" y="52" width="6" height="23" fill="#34d399" />
              <rect x="72" y="44" width="6" height="31" fill="#34d399" />

              {/* Growth Arrow line */}
              <path d="M 45,63 l 8,-8 l 6,6 l 16,-16" fill="none" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="78,42 78,48 72,48" fill="url(#icon-grad)" transform="rotate(30 75 45)" />
            </svg>
          </div>

          <span className="text-6xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tabular-nums leading-none tracking-tight">
            {clampedScore}%
          </span>
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest mt-3 drop-shadow-md">
            Job Match Score
          </span>
        </div>
      </div>

      {/* Skills & Relevance Capsule overlapping the dial bottom */}
      <div className="-mt-12 z-20 flex flex-col items-center bg-[#293A4C] rounded-full border-[1px] border-slate-400/50 px-8 py-2.5 shadow-[0_5px_15px_rgba(0,0,0,0.6)]">
        <div className="text-[10px] font-bold text-slate-100 uppercase tracking-widest mb-1.5 opacity-90">
          Skills & Relevance
        </div>
        <div className="flex gap-4 items-center px-4">
          <span className="text-[#34d399] drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg></span>
          <span className="text-[#34d399] drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></span>
        </div>
      </div>

      {/* Bottom Profile Text */}
      <div className="mt-8 mb-2 flex items-center justify-center gap-2">
        <span className="text-slate-400 text-lg">✦</span>
        <span className="text-xs font-bold text-white tracking-[0.2em] uppercase">Match Profile</span>
        <span className="text-slate-400 text-lg">✦</span>
      </div>
    </div>
  );
};

export const ResumeAnalyzer: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [loading, setLoading] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rewrite, setRewrite] = useState<ResumeRewrite | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job role + skills state
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [manualSkill, setManualSkill] = useState('');
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setFileName(file.name);
    try {
      const text = file.type === 'application/pdf' ? await extractTextFromPDF(file) : await file.text();
      setResumeText(text);
    } catch (error) {
      console.error("Extraction failed", error);
      alert("Failed to parse file.");
    } finally {
      setParsing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText || !jdText) return;
    setLoading(true);
    setRewrite(null);
    setSelectedRole(null);
    setSuggestedSkills([]);
    setSelectedSkills([]);
    try {
      const data = await analyzeResume(resumeText, jdText, domain);
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role: string) => {
    setSelectedRole(role);
    setSuggestedSkills([]);
    setSelectedSkills([]);
    setLoadingSkills(true);
    try {
      const skills = await getRequiredSkillsForRole(role, resumeText, domain);
      setSuggestedSkills(skills);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleAddSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills(prev => [...prev, skill]);
    }
    setSuggestedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleAddManualSkill = () => {
    const trimmed = manualSkill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => [...prev, trimmed]);
      setManualSkill('');
    }
  };

  const handleJdChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (countWords(val) <= 50) {
      setJdText(val);
    }
  };

  const buildPDF = (templateId: string, contentStr: string) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - margin * 2;

    switch (templateId) {
      case 'classic':
        generatePDFClassic(doc, contentStr, margin, maxLineWidth, pageHeight);
        break;
      case 'modern':
        generatePDFModern(doc, contentStr, margin, maxLineWidth, pageHeight);
        break;
      case 'minimal':
        generatePDFMinimal(doc, contentStr, margin, maxLineWidth, pageHeight);
        break;
    }
    return doc;
  };

  // Preview dummy content if rewrite not available yet
  const handlePreviewTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    const dummyContent = rewrite ? rewrite.rewrittenContent : `SUMMARY\nProfessional with proven track record in the industry.\n\nEXPERIENCE\nSenior Developer\n- Built scalable systems.\n- Led teams of engineers.\n\nEDUCATION\nB.S. Computer Science\nUniversity of Tech, 2020`;
    const doc = buildPDF(templateId, dummyContent);
    const blobUrl = doc.output('bloburl');
    setPreviewUrl(blobUrl);
  };

  const handleRewrite = async () => {
    if (!resumeText || !jdText) return;
    setRewriting(true);
    setPreviewUrl(null);
    try {
      const data = await rewriteResume(resumeText, jdText, selectedSkills.length > 0 ? selectedSkills : undefined);
      setRewrite(data);
    } catch (error) {
      console.error(error);
    } finally {
      setRewriting(false);
    }
  };

  const downloadRewrittenPDF = () => {
    if (!rewrite) return;
    const doc = buildPDF(selectedTemplate, rewrite.rewrittenContent);
    doc.save('HireReady_Optimized_Resume.pdf');
  };

  const wordCount = countWords(jdText);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-12">

      {/* 
        Modified layout from 2-column to stacked: 
        Inputs at the top, Results (if present) full width below.
      */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Upload Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-emerald-500">1.</span> Upload Your Resume
          </h2>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center hover:border-emerald-500/50 cursor-pointer transition-all bg-slate-950/50 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt"
            />
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
            {parsing ? (
              <p className="text-emerald-500 animate-pulse font-bold">Extracting content...</p>
            ) : fileName ? (
              <p className="text-slate-200 font-medium">{fileName}</p>
            ) : (
              <p className="text-slate-500">Click to upload PDF or Text resume</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Job Description Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl flex flex-col">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-emerald-500">2.</span> Desired Role Keywords
            </h2>
            <p className="text-xs text-slate-500 mt-2">Briefly describe your target role or paste key requirements (max 50 words)</p>
          </div>
          <div className="relative flex-1 flex flex-col">
            <textarea
              value={jdText}
              onChange={handleJdChange}
              placeholder="e.g. React developer with TypeScript, Node.js, REST APIs, cloud deployment experience..."
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none custom-scrollbar min-h-[120px]"
            />
            <span className={`absolute bottom-3 right-4 text-xs font-bold ${wordCount >= 45 ? 'text-amber-400' : 'text-slate-600'}`}>
              {wordCount}/50 words
            </span>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !resumeText || !jdText}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl transition-all text-lg mt-auto"
          >
            {loading ? 'AI Engines Running...' : 'Analyze My Resume'}
          </button>
        </div>
      </div>

      {/* Results Section (Now below Inputs, taking full width) */}
      <div className="space-y-8">
        {result ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-10 animate-in slide-in-from-bottom-10 duration-500 relative overflow-hidden">

            {/* Custom ATS Image and Details */}
            <div className="flex flex-col md:flex-row items-center gap-10 bg-slate-950/40 p-8 rounded-[2rem] border border-slate-800/50">

              <ScoreGauge score={result.score} />

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${result.atsCompatibility === 'High' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                    {result.atsCompatibility} Compatibility
                  </span>
                </div>
                <h3 className="text-3xl lg:text-4xl font-black text-white drop-shadow-sm">Matched: <span className="text-cyan-400">{domain}</span></h3>
                <p className="text-slate-400 text-base leading-relaxed max-w-2xl border-l-2 border-slate-700 pl-4">
                  Based on market trends, your resume has a <span className="text-emerald-400 font-bold uppercase tracking-wider">{result.score}%</span> compatibility score for this role's specific keywords and requirements.
                </p>
              </div>
            </div>

            {/* Strengths & Gaps */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 bg-slate-950/30 p-6 rounded-2xl border border-slate-800/50">
                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Strengths
                </h4>
                <ul className="space-y-3">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2 group">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span className="group-hover:text-slate-200 transition-colors leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4 bg-slate-950/30 p-6 rounded-2xl border border-slate-800/50">
                <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Critical Gaps
                </h4>
                <ul className="space-y-3">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2 group">
                      <span className="text-amber-500 font-bold">!</span>
                      <span className="group-hover:text-slate-200 transition-colors leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Risk of Rejection */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 space-y-2">
              <h4 className="text-sm font-black text-red-400 uppercase tracking-widest">Risk of Rejection</h4>
              <p className="text-sm text-slate-300 leading-relaxed italic">"{result.rejectionAnalysis}"</p>
            </div>

            {/* Suggested Job Roles */}
            {result.suggestedJobRoles && result.suggestedJobRoles.length > 0 && (
              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Suggested Job Roles for You
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {result.suggestedJobRoles.map((role, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectRole(role)}
                      className={`p-4 rounded-2xl border text-left transition-all group ${selectedRole === role
                        ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
                        : 'bg-slate-950 border-slate-800 hover:border-blue-500/30 hover:bg-slate-950/80'
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{['🎯', '💼', '🚀', '⭐'][i]}</span>
                      </div>
                      <span className={`text-sm font-bold leading-tight ${selectedRole === role ? 'text-blue-400' : 'text-slate-300 group-hover:text-blue-300'}`}>
                        {role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Auto-Suggest */}
            {selectedRole && (
              <div className="space-y-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span> Required Skills for "{selectedRole}"
                </h4>
                <p className="text-xs text-slate-500">Click on skills to add them to your resume optimization</p>

                {loadingSkills ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-purple-400 animate-pulse">Analyzing required skills...</span>
                  </div>
                ) : (
                  <>
                    {suggestedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {suggestedSkills.map((skill, i) => (
                          <button
                            key={i}
                            onClick={() => handleAddSkill(skill)}
                            className="px-3 py-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-xs font-medium hover:bg-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>+</span> {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Selected Skills */}
                {selectedSkills.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Added Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="pl-3 pr-1 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-medium flex items-center gap-2"
                        >
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="w-5 h-5 rounded-full bg-emerald-500/20 hover:bg-red-500/40 hover:text-red-200 flex items-center justify-center transition-colors font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Skill Input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={manualSkill}
                    onChange={(e) => setManualSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualSkill(); }}
                    placeholder="Add a skill manually..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-slate-600"
                  />
                  <button
                    onClick={handleAddManualSkill}
                    disabled={!manualSkill.trim()}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Template Selector */}
            <div className="space-y-4 pt-8 border-t border-slate-800">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Choose Resume Template
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                {TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`relative flex flex-col p-5 rounded-2xl border text-left transition-all group overflow-hidden cursor-pointer ${selectedTemplate === tpl.id
                      ? 'border-2 ring-2 shadow-lg bg-slate-900'
                      : 'border-slate-800 hover:border-slate-600 bg-slate-950'
                      }`}
                    style={{
                      borderColor: selectedTemplate === tpl.id ? tpl.color : undefined,
                      boxShadow: selectedTemplate === tpl.id ? `0 0 20px ${tpl.color}15` : undefined,
                      ringColor: selectedTemplate === tpl.id ? `${tpl.color}33` : undefined,
                    }}
                  >
                    {selectedTemplate === tpl.id && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: tpl.color }}>
                        ✓
                      </div>
                    )}
                    <div className="text-3xl mb-3">{tpl.icon}</div>
                    <h5 className="text-sm font-bold text-slate-200 mb-1">{tpl.name}</h5>
                    <p className="text-[10px] text-slate-500 leading-snug mb-3 flex-1">{tpl.desc}</p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tpl.color }}>{tpl.preview}</div>

                      {/* Preview button for each template card */}
                      <button
                        onClick={(e) => handlePreviewTemplate(tpl.id, e)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-white font-medium transition-colors"
                      >
                        👁 Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <button
                onClick={handleRewrite}
                disabled={rewriting}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl transition-all text-xl tracking-wide uppercase"
              >
                {rewriting ? 'Optimizing Content...' : 'Auto-Optimize My Resume'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-16 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/20 space-y-6">
            <div className="text-8xl opacity-10 grayscale">📊</div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">ATS Performance Scan</h3>
              <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                Upload your resume and enter desired role keywords above to see if you'll pass the automated filters.
              </p>
            </div>
          </div>
        )}

        {/* Rewrite Result */}
        {rewrite && (
          <div className="bg-emerald-900/5 border border-emerald-500/20 rounded-3xl p-8 space-y-8 animate-in zoom-in duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">AI-Powered Optimization</h3>
                <p className="text-sm text-slate-500 mt-1">Optimized with <strong className="text-emerald-400 capitalize">{selectedTemplate}</strong> template • Enhanced keywords applied</p>
              </div>

              {/* Only show these after clicking Optimize, as requested */}
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={(e) => handlePreviewTemplate(selectedTemplate, e as any)}
                  className="flex-1 md:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all border border-slate-700 flex justify-center items-center gap-2"
                >
                  <span>👁</span> Preview
                </button>
                <button
                  onClick={downloadRewrittenPDF}
                  className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black shadow-lg transition-all flex justify-center items-center gap-2"
                >
                  <span>⬇</span> Download PDF
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-8 rounded-2xl text-[13px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
              {rewrite.rewrittenContent}
            </div>
          </div>
        )}

        {/* PDF Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8" onClick={() => setPreviewUrl(null)}>
            <div className="bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <span className="font-bold text-sm">Resume Layout Preview</span>
                </div>
                <div className="flex gap-2">
                  {rewrite && (
                    <button onClick={downloadRewrittenPDF} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all">
                      Download
                    </button>
                  )}
                  <button onClick={() => setPreviewUrl(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all">
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-950/50">
                <iframe src={previewUrl} className="w-full h-full min-h-[70vh]" title="Resume Preview" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
