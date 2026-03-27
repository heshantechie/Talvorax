
import React, { useState, useRef } from 'react';
import { analyzeResume, rewriteResume, getRequiredSkillsForRole } from '../services/gemini';
import { AnalysisResult, ResumeRewrite } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveResumeAnalysis, updateResumeAnalysisRewrite } from '../src/lib/db';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Helper: safely parse a string that may contain a StructuredResume JSON
// The AI sometimes returns raw control characters (newlines/tabs) inside JSON strings
const safeParseResumeJSON = (raw: string, fallbackData?: any): any | null => {
  if (!raw) return fallbackData || null;
  
  const checkParsed = (parsed: any) => {
    if (parsed && typeof parsed === 'object' && parsed.name) return parsed;
    if (typeof parsed === 'string') {
      try {
        const inner = JSON.parse(parsed);
        if (inner && typeof inner === 'object' && inner.name) return inner;
      } catch (e) {}
    }
    return null;
  };

  // Attempt 1: Direct parse (works if AI returned perfect JSON without stringified nested newlines)
  try {
    const res = checkParsed(JSON.parse(raw));
    if (res) return res;
  } catch (e1) {}

  // Attempt 2: Strip markdown code blocks
  try {
    const cleaned = raw.replace(/```json\s*/ig, '').replace(/```\s*/g, '').trim();
    const res = checkParsed(JSON.parse(cleaned));
    if (res) return res;
  } catch (e2) {}

  // Attempt 3: Regex extract the outermost JSON object
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const res = checkParsed(JSON.parse(match[0]));
      if (res) return res;
    }
  } catch (e3) {}

  // Attempt 4 (Final Fallback): AI forgot to escape newlines inside string values.
  // We will force-escape newlines, but this is destructive and only used as a last resort.
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const sanitized = match[0].replace(/\n/g, '\\n').replace(/\r/g, '').replace(/\t/g, '\\t');
      const res = checkParsed(JSON.parse(sanitized));
      if (res) return res;
    }
  } catch (e4) {
    console.error('All JSON parse attempts failed for rewrittenContent', e4);
  }

  return fallbackData || null;
};

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
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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


const ResumeTemplate = ({ data, templateId, id }: { data: any, templateId: string, id?: string }) => {
  if (!data) return null;

  if (templateId === 'classic') {
    return (
      <>
      <style>{`
        .classic-template {
          font-family: Arial, Helvetica, "Times New Roman", Times, serif !important;
        }
        .classic-template * {
          line-height: 1.6 !important;
          letter-spacing: 0.2px !important;
          word-spacing: 1px !important;
          font-variant-ligatures: none !important;
        }
      `}</style>
      <div id={id} className="classic-template p-12 overflow-hidden mx-auto" style={{ background: '#ffffff', color: '#000000', width: '100%', minHeight: '1100px', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        <div className="text-center mb-6">
          <h1 className="text-[38px] font-bold mb-2 " style={{ color: '#000000' }}>{data.name}</h1>
          <p className="text-[13px] leading-normal whitespace-pre-wrap" style={{ color: '#333333' }}>{data.contact}</p>
        </div>

        {data.professionalSummary && (
          <div className="mb-5">
            <h2 className="text-[14px] font-bold tracking-widest uppercase mb-1 text-center" style={{ color: '#000000' }}>Summary</h2>
            <div className="w-full border-b-[1.5px] mb-3" style={{ borderBottomColor: '#000000' }}></div>
            <p className="text-[13px] leading-relaxed text-left" style={{ color: '#222222' }}>{data.professionalSummary}</p>
          </div>
        )}

        {data.education && data.education.length > 0 && (
          <div className="mb-5">
            <h2 className="text-[14px] font-bold tracking-widest uppercase mb-1 text-center" style={{ color: '#000000' }}>Education</h2>
            <div className="w-full border-b-[1.5px] mb-3" style={{ borderBottomColor: '#000000' }}></div>
            {data.education.map((edu: any, i: number) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between items-start font-bold text-[14px]" style={{ color: '#000000' }}>
                  <span>{edu.institution}, {edu.location}</span>
                  <span className="text-[13px] whitespace-nowrap shrink-0 font-normal">{edu.duration}</span>
                </div>
                <div className="text-[14px] italic" style={{ color: '#333333' }}>{edu.degree}</div>
              </div>
            ))}
          </div>
        )}

        {data.experience && data.experience.length > 0 && (
          <div className="mb-5">
            <h2 className="text-[14px] font-bold tracking-widest uppercase mb-1 text-center" style={{ color: '#000000' }}>Professional Experience</h2>
            <div className="w-full border-b-[1.5px] mb-3" style={{ borderBottomColor: '#000000' }}></div>
            {data.experience.map((exp: any, i: number) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between items-start font-bold text-[14px]" style={{ color: '#000000' }}>
                  <span>{exp.company}, {exp.location}</span>
                  <span className="text-[13px] whitespace-nowrap shrink-0 font-normal">{exp.duration}</span>
                </div>
                <div className="text-[14px] italic mb-1.5" style={{ color: '#333333' }}>{exp.role}</div>
                <ul className="list-disc pl-6 text-[13px] leading-relaxed space-y-1" style={{ color: '#222222' }}>
                  {exp.achievements.map((item: string, j: number) => <li key={j} className="pl-1 text-left">{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {data.projects && data.projects.length > 0 && (
          <div className="mb-5">
            <h2 className="text-[14px] font-bold tracking-widest uppercase mb-1 text-center" style={{ color: '#000000' }}>Projects & Extracurricular</h2>
            <div className="w-full border-b-[1.5px] mb-3" style={{ borderBottomColor: '#000000' }}></div>
            {data.projects.map((proj: any, i: number) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between items-start font-bold text-[14px]" style={{ color: '#000000' }}>
                  <span>{proj.name}</span>
                  {proj.date && <span className="text-[13px] whitespace-nowrap shrink-0 font-normal">{proj.date}</span>}
                </div>
                <ul className="list-disc pl-6 text-[13px] leading-relaxed space-y-1 mt-1.5" style={{ color: '#222222' }}>
                  {proj.details.map((item: string, j: number) => <li key={j} className="pl-1 text-left">{item}</li>)}
                </ul>
              </div>
            ))}
            {data.extracurricular?.activities && data.extracurricular.activities.length > 0 && (
              <div className="mb-4 mt-3">
                <div className="font-bold text-[14px]" style={{ color: '#000000' }}>Extracurricular Activities</div>
                <ul className="list-disc pl-6 text-[13px] leading-relaxed space-y-1 mt-1.5" style={{ color: '#222222' }}>
                  {data.extracurricular.activities.map((item: string, j: number) => <li key={j} className="pl-1 text-left">{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {data.leadership?.roles && data.leadership.roles.length > 0 && (
          <div className="mb-5">
            <h2 className="text-[14px] font-bold tracking-widest uppercase mb-1 text-center" style={{ color: '#000000' }}>Leadership Experience</h2>
            <div className="w-full border-b-[1.5px] mb-3" style={{ borderBottomColor: '#000000' }}></div>
            <ul className="list-disc pl-6 text-[13px] leading-relaxed space-y-1" style={{ color: '#222222' }}>
              {data.leadership.roles.map((item: string, j: number) => <li key={j} className="pl-1 text-left">{item}</li>)}
            </ul>
          </div>
        )}

        {data.technicalSkills && Object.keys(data.technicalSkills).length > 0 && (
          <div className="mb-5">
            <h2 className="text-[14px] font-bold tracking-widest uppercase mb-1 text-center" style={{ color: '#000000' }}>Skills</h2>
            <div className="w-full border-b-[1.5px] mb-3" style={{ borderBottomColor: '#000000' }}></div>
            <div className="text-[13px] leading-relaxed space-y-1.5" style={{ color: '#222222' }}>
              {Object.entries(data.technicalSkills).map(([cat, skills]: [string, any]) => {
                if (!skills || skills.length === 0) return null;
                return (
                  <div key={cat} className="flex flex-wrap">
                    <span className="font-bold capitalize mr-1" style={{ color: '#000000' }}>{cat.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span>{skills.join(', ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  if (templateId === 'modern') {
    return (
      <div id={id} className="font-[Arial,Helvetica,sans-serif] overflow-hidden mx-auto flex" style={{ background: '#ffffff', color: '#334155', width: '100%', minHeight: '1100px', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        <div className="w-4" style={{ backgroundColor: '#10b981' }}></div>
        <div className="flex-1 p-10 pl-8">
          <h1 className="text-[44px] font-black mb-1 " style={{ color: '#0f172a' }}>{data.name}</h1>
          <p className="text-[13px] leading-normal mb-8 whitespace-pre-wrap" style={{ color: '#475569' }}>{data.contact}</p>

          {data.professionalSummary && (
            <div className="mb-6">
              <h2 className="text-[14px] font-bold uppercase py-1.5 px-3 mb-3 rounded-sm inline-block w-full" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>Summary</h2>
              <p className="text-[14px] leading-relaxed" style={{ color: '#334155' }}>{data.professionalSummary}</p>
            </div>
          )}

          {data.education && data.education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[14px] font-bold uppercase py-1.5 px-3 mb-3 rounded-sm inline-block w-full" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>Education</h2>
              {data.education.map((edu: any, i: number) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between items-start font-bold text-[14px]" style={{ color: '#0f172a' }}>
                    <span>{edu.institution}, {edu.location}</span>
                    <span className="text-[13px] whitespace-nowrap shrink-0 font-medium" style={{ color: '#64748b' }}>{edu.duration}</span>
                  </div>
                  <div className="text-[14px] font-medium" style={{ color: '#10b981' }}>{edu.degree}</div>
                </div>
              ))}
            </div>
          )}

          {data.experience && data.experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[14px] font-bold uppercase py-1.5 px-3 mb-3 rounded-sm inline-block w-full" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>Professional Experience</h2>
              {data.experience.map((exp: any, i: number) => (
                <div key={i} className="mb-5">
                  <div className="flex justify-between items-start font-bold text-[15px]" style={{ color: '#0f172a' }}>
                    <span>{exp.company}, {exp.location}</span>
                    <span className="text-[13px] whitespace-nowrap shrink-0 font-medium" style={{ color: '#64748b' }}>{exp.duration}</span>
                  </div>
                  <div className="text-[14px] font-semibold mb-2" style={{ color: '#10b981' }}>{exp.role}</div>
                  <ul className="list-disc pl-5 text-[14px] leading-relaxed space-y-1.5" style={{ color: '#334155' }}>
                    {exp.achievements.map((item: string, j: number) => <li key={j} className="pl-1">{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {data.projects && data.projects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[14px] font-bold uppercase py-1.5 px-3 mb-3 rounded-sm inline-block w-full" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>Projects & Extracurricular</h2>
              {data.projects.map((proj: any, i: number) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-start font-bold text-[14px]" style={{ color: '#0f172a' }}>
                    <span>{proj.name}</span>
                    {proj.date && <span className="text-[13px] whitespace-nowrap shrink-0 font-medium" style={{ color: '#64748b' }}>{proj.date}</span>}
                  </div>
                  <ul className="list-disc pl-5 text-[14px] leading-relaxed space-y-1.5 mt-2" style={{ color: '#334155' }}>
                    {proj.details.map((item: string, j: number) => <li key={j} className="pl-1">{item}</li>)}
                  </ul>
                </div>
              ))}
              {data.extracurricular?.activities && data.extracurricular.activities.length > 0 && (
                <div className="mb-4 mt-4">
                  <div className="font-bold text-[14px]" style={{ color: '#0f172a' }}>Extracurricular Activities</div>
                  <ul className="list-disc pl-5 text-[14px] leading-relaxed space-y-1.5 mt-2" style={{ color: '#334155' }}>
                    {data.extracurricular.activities.map((item: string, j: number) => <li key={j} className="pl-1">{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {data.leadership?.roles && data.leadership.roles.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[14px] font-bold uppercase py-1.5 px-3 mb-3 rounded-sm inline-block w-full" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>Leadership Experience</h2>
              <ul className="list-disc pl-5 text-[14px] leading-relaxed space-y-1.5" style={{ color: '#334155' }}>
                {data.leadership.roles.map((item: string, j: number) => <li key={j} className="pl-1">{item}</li>)}
              </ul>
            </div>
          )}

          {data.technicalSkills && Object.keys(data.technicalSkills).length > 0 && (
            <div className="mb-6">
              <h2 className="text-[14px] font-bold uppercase py-1.5 px-3 mb-3 rounded-sm inline-block w-full" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>Skills</h2>
              <div className="text-[14px] leading-relaxed space-y-2" style={{ color: '#334155' }}>
                {Object.entries(data.technicalSkills).map(([cat, skills]: [string, any]) => {
                  if (!skills || skills.length === 0) return null;
                  return (
                    <div key={cat} className="flex flex-col sm:flex-row sm:items-start">
                      <span className="font-bold capitalize w-48 shrink-0" style={{ color: '#0f172a' }}>{cat.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span>{skills.join(', ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MINIMAL (DEFAULT)
  return (
    <div id={id} className="p-12 font-[Arial,Helvetica,sans-serif] overflow-hidden mx-auto" style={{ background: '#ffffff', color: '#334155', width: '100%', minHeight: '1100px', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
      <h1 className="text-[52px] font-bold mb-2 " style={{ color: '#0f172a', lineHeight: 1.1 }}>{data.name}</h1>
      <p className="text-[14px] leading-relaxed mb-10 whitespace-pre-wrap" style={{ color: '#64748b' }}>{data.contact}</p>

      {data.professionalSummary && (
        <div className="mb-8">
          <h2 className="text-[15px] font-bold uppercase mb-2 tracking-wide" style={{ color: '#0f172a' }}>Summary</h2>
          <div className="w-8 border-b-2 mb-4" style={{ borderColor: '#0f172a' }}></div>
          <p className="text-[14px] leading-relaxed" style={{ color: '#334155' }}>{data.professionalSummary}</p>
        </div>
      )}

      {data.education && data.education.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[15px] font-bold uppercase mb-2 tracking-wide" style={{ color: '#0f172a' }}>Education</h2>
          <div className="w-8 border-b-2 mb-4" style={{ borderColor: '#0f172a' }}></div>
          {data.education.map((edu: any, i: number) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between items-start font-bold text-[15px]" style={{ color: '#0f172a' }}>
                <span>{edu.institution}, {edu.location}</span>
                <span className="text-[14px] whitespace-nowrap shrink-0 font-normal" style={{ color: '#64748b' }}>{edu.duration}</span>
              </div>
              <div className="text-[15px]" style={{ color: '#64748b' }}>{edu.degree}</div>
            </div>
          ))}
        </div>
      )}

      {data.experience && data.experience.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[15px] font-bold uppercase mb-2 tracking-wide" style={{ color: '#0f172a' }}>Professional Experience</h2>
          <div className="w-8 border-b-2 mb-4" style={{ borderColor: '#0f172a' }}></div>
          {data.experience.map((exp: any, i: number) => (
            <div key={i} className="mb-6">
              <div className="flex justify-between items-start font-bold text-[15px]" style={{ color: '#0f172a' }}>
                <span>{exp.company}, {exp.location}</span>
                <span className="text-[14px] whitespace-nowrap shrink-0 font-normal" style={{ color: '#64748b' }}>{exp.duration}</span>
              </div>
              <div className="text-[15px] mb-2" style={{ color: '#64748b' }}>{exp.role}</div>
              <ul className="list-disc pl-6 text-[14px] leading-relaxed space-y-1.5" style={{ color: '#334155' }}>
                {exp.achievements.map((item: string, j: number) => <li key={j} className="pl-2">{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {data.projects && data.projects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[15px] font-bold uppercase mb-2 tracking-wide" style={{ color: '#0f172a' }}>Projects & Extracurricular</h2>
          <div className="w-8 border-b-2 mb-4" style={{ borderColor: '#0f172a' }}></div>
          {data.projects.map((proj: any, i: number) => (
            <div key={i} className="mb-5">
              <div className="flex justify-between items-start font-bold text-[15px]" style={{ color: '#0f172a' }}>
                <span>{proj.name}</span>
                {proj.date && <span className="text-[14px] whitespace-nowrap shrink-0 font-normal" style={{ color: '#64748b' }}>{proj.date}</span>}
              </div>
              <ul className="list-disc pl-6 text-[14px] leading-relaxed space-y-1.5 mt-2" style={{ color: '#334155' }}>
                {proj.details.map((item: string, j: number) => <li key={j} className="pl-2">{item}</li>)}
              </ul>
            </div>
          ))}
          {data.extracurricular?.activities && data.extracurricular.activities.length > 0 && (
            <div className="mb-5 mt-5">
              <div className="font-bold text-[15px]" style={{ color: '#0f172a' }}>Extracurricular Activities</div>
              <ul className="list-disc pl-6 text-[14px] leading-relaxed space-y-1.5 mt-2" style={{ color: '#334155' }}>
                {data.extracurricular.activities.map((item: string, j: number) => <li key={j} className="pl-2">{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {data.leadership?.roles && data.leadership.roles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[15px] font-bold uppercase mb-2 tracking-wide" style={{ color: '#0f172a' }}>Leadership Experience</h2>
          <div className="w-8 border-b-2 mb-4" style={{ borderColor: '#0f172a' }}></div>
          <ul className="list-disc pl-6 text-[14px] leading-relaxed space-y-1.5" style={{ color: '#334155' }}>
            {data.leadership.roles.map((item: string, j: number) => <li key={j} className="pl-2">{item}</li>)}
          </ul>
        </div>
      )}

      {data.technicalSkills && Object.keys(data.technicalSkills).length > 0 && (
        <div className="mb-8">
          <h2 className="text-[15px] font-bold uppercase mb-2 tracking-wide" style={{ color: '#0f172a' }}>Skills</h2>
          <div className="w-8 border-b-2 mb-4" style={{ borderColor: '#0f172a' }}></div>
          <div className="text-[14px] leading-relaxed space-y-2.5" style={{ color: '#334155' }}>
            {Object.entries(data.technicalSkills).map(([cat, skills]: [string, any]) => {
              if (!skills || skills.length === 0) return null;
              return (
                 <div key={cat} className="flex">
                    <span className="font-bold capitalize w-48 shrink-0" style={{ color: '#0f172a' }}>{cat.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>{skills.join(', ')}</span>
                 </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
              {/* Document Base */}
              <path 
                d="M 25 20 a 5 5 0 0 1 5 -5 h 30 l 15 15 v 50 a 5 5 0 0 1 -5 5 h -40 a 5 5 0 0 1 -5 -5 z" 
                fill="none" 
                stroke="#22d3ee" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Document Fold */}
              <path 
                d="M 60 15 v 15 h 15" 
                fill="none" 
                stroke="#22d3ee" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Document Content Lines */}
              <line x1="35" y1="38" x2="50" y2="38" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" />
              <line x1="35" y1="50" x2="60" y2="50" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" />
              <line x1="35" y1="62" x2="60" y2="62" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" />
              <line x1="35" y1="74" x2="45" y2="74" stroke="url(#icon-grad)" strokeWidth="4" strokeLinecap="round" />

              {/* Checkmark Badge */}
              <circle cx="75" cy="75" r="14" fill="url(#icon-grad)" stroke="#0B1724" strokeWidth="4" />
              {/* Checkmark */}
              <path 
                d="M 69 75 l 4 4 l 8 -9" 
                fill="none" 
                stroke="#F8FAFC" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>

          <span className="text-6xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tabular-nums leading-none ">
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
  const { user } = useAuth();
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
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [parsedResume, setParsedResume] = useState<any>(null);

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
    setCurrentAnalysisId(null);
    try {
      const data = await analyzeResume(resumeText, jdText, domain);
      setResult(data);
      
      if (user) {
        // Run save asynchronously to not block UI
        saveResumeAnalysis(user.id, data, resumeText, jdText, domain, undefined, undefined)
          .then(record => {
             if (record) setCurrentAnalysisId(record.id);
          })
          .catch(err => console.error("Could not save to Supabase:", err));
      }
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


  // Preview dummy content if rewrite not available yet
  const handlePreviewTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    setSelectedTemplate(templateId);
    setPreviewUrl('show');
  };

  const handleRewrite = async () => {
    if (!resumeText || !jdText) return;
    setRewriting(true);
    
    try {
      const data = await rewriteResume(resumeText, jdText, selectedSkills.length > 0 ? selectedSkills : undefined);
      
      const newlyParsed = safeParseResumeJSON(data.rewrittenContent);
      if (newlyParsed) {
        setParsedResume(newlyParsed);
        setRewrite(data);
        setPreviewUrl('show');
      } else {
        alert('AI response could not be parsed. Your previous changes have been preserved. Please try clicking Auto-Optimize again.');
      }

      if (currentAnalysisId) {
        updateResumeAnalysisRewrite(currentAnalysisId, data)
          .catch(err => console.error("Could not update Supabase analysis with rewrite:", err));
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred during optimization. Please try again.');
    } finally {
      setRewriting(false);
    }
  };



  const downloadRewrittenPDF = async () => {
    if (!rewrite || !parsedResume) {
      alert('Resume data could not be parsed. Please try optimizing again.');
      return;
    }

    setRewriting(true);
    try {
      // Find the hidden full-size render container
      const element = document.getElementById('hidden-pdf-render-container');
      if (!element) throw new Error("Could not find PDF render container.");

      // Capture the canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Double resolution for sharpness
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // 4) VALIDATE BEFORE PDF GENERATION & ENSURE PDF PIPELINE IS SAFE
          // html2canvas DOES NOT support 'oklch' CSS functions and will crash if they exist anywhere in stylesheets.
          // Since our PDF output uses safe inline HEX colors, we can strip 'oklch' from the parsed CSS.
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.innerHTML.includes('oklch')) {
              // Replace any oklch(...) with equivalent rgb or hex fallback to prevent parser crash
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
            }
          });

          // Also handle potential `<link rel="stylesheet">` elements by swapping them out
          const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
          links.forEach(() => {
             // html2canvas internally fetches linked stylesheets and crashes.
             // We can disable them if they contain unsupported styles, but layout depends on them.
             // Usually Vite injects as <style> in dev, but for prod this serves as an extra safeguard.
          });
        }
      });

      // Dimensions mapping to A4
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate total image height in mm
      const imgHeightInMm = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeightInMm;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInMm, '', 'FAST');
      heightLeft -= pageHeight;

      // Add subsequent pages if content overflows the first page
      while (heightLeft > 1) {
        position -= pageHeight; // shift the image up by exactly one page height
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInMm, '', 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save('HireReady_Optimized_Resume.pdf');
      
    } catch (error) {
      console.error('PDF generation failed', error);
      alert('PDF generation failed. Please try again.');
    } finally {
      setRewriting(false);
    }
  };

  const wordCount = countWords(jdText);

  return (
    <div className="min-h-screen bg-[#F8FAF9] relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D1FAE5] rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#A7F3D0] rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2 pointer-events-none" />
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-10 relative z-10">

      {/* 
        Modified layout from 2-column to stacked: 
        Inputs at the top, Results (if present) full width below.
      */}
      <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
        {/* Upload Section */}
        <div className="flex flex-col h-full space-y-5" style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', boxShadow: '0px 8px 30px rgba(0,0,0,0.05)' }}>
          <h2 className="flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(90deg,#16A34A,#22C55E)' }}>1</span>
            Upload Your Resume
          </h2>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer group transition-all text-center"
            style={{ border: '2px dashed #22C55E', background: '#F0FDF4', borderRadius: '14px', padding: '40px 20px' }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt"
            />
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📄</div>
            {parsing ? (
              <p className="animate-pulse font-semibold" style={{ color: '#16A34A' }}>Extracting content...</p>
            ) : fileName ? (
              <p className="font-semibold" style={{ color: '#16A34A' }}>{fileName}</p>
            ) : (
              <>
                <p className="font-medium" style={{ color: '#111827' }}>Click to upload PDF or Text resume</p>
                <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Supports .pdf and .txt files</p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest" style={{ fontWeight: 500, color: '#6B7280' }}>Select Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none transition-all"
              style={{ background: '#F9FAFB', border: '1.5px solid #D1FAE5', color: '#111827' }}
            >
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Job Description Section */}
        <div className="flex flex-col h-full space-y-5" style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', boxShadow: '0px 8px 30px rgba(0,0,0,0.05)' }}>
          <div>
            <h2 className="flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(90deg,#16A34A,#22C55E)' }}>2</span>
              Desired Role Keywords
            </h2>
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>Briefly describe your target role or paste key requirements (max 50 words)</p>
          </div>
          <div className="relative flex-1 flex flex-col">
            <textarea
              value={jdText}
              onChange={handleJdChange}
              placeholder="e.g. React developer with TypeScript, Node.js, REST APIs, cloud deployment experience..."
              className="flex-1 w-full rounded-xl p-4 text-sm outline-none resize-none custom-scrollbar min-h-[120px] transition-all"
              style={{ background: '#F9FAFB', border: '1.5px solid #D1FAE5', color: '#374151' }}
            />
            <span className={`absolute bottom-3 right-4 text-xs font-semibold ${wordCount >= 45 ? 'text-amber-500' : ''}`} style={wordCount < 45 ? { color: '#9CA3AF' } : {}}>
              {wordCount}/50 words
            </span>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !resumeText || !jdText}
            className="w-full text-white font-semibold rounded-xl transition-all disabled:opacity-50 hover:opacity-90 mt-auto"
            style={{ height: '48px', borderRadius: '12px', background: 'linear-gradient(90deg,#16A34A,#22C55E)', fontWeight: 600, fontSize: '16px' }}
          >
            {loading ? '⚙️ AI Engines Running...' : '🔍 Analyze My Resume'}
          </button>
        </div>
      </div>

      {/* Results Section (Now below Inputs, taking full width) */}
      <div className="space-y-6">
        {result ? (
          <div className="animate-in slide-in-from-bottom-10 duration-500 space-y-6" style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', boxShadow: '0px 8px 30px rgba(0,0,0,0.05)' }}>

            {/* ATS Score Header */}
            <div className="flex flex-col md:flex-row items-center gap-8" style={{ background: '#F0FDF4', borderRadius: '14px', padding: '24px' }}>

              <ScoreGauge score={result.score} />

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${result.atsCompatibility === 'High' ? 'text-green-700 bg-green-100 border border-green-200' : 'text-amber-700 bg-amber-100 border border-amber-200'}`}>
                    {result.atsCompatibility} ATS Compatibility
                  </span>
                </div>
                <h3 className="font-bold" style={{ fontSize: '26px', color: '#111827' }}>Matched: <span style={{ color: '#16A34A' }}>{domain}</span></h3>
                <p className="text-base leading-relaxed max-w-2xl" style={{ color: '#6B7280', borderLeft: '3px solid #22C55E', paddingLeft: '14px' }}>
                  Based on market trends, your resume has a <span className="font-bold" style={{ color: '#16A34A' }}>{result.score}%</span> compatibility score for this role's keywords and requirements.
                </p>
              </div>
            </div>

            {/* Strengths & Gaps */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-4 p-6 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#16A34A' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#16A34A' }}></span> Strengths
                </h4>
                <ul className="space-y-3">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#374151' }}>
                      <span className="font-bold mt-0.5" style={{ color: '#16A34A' }}>✓</span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4 p-6 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#D97706' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#D97706' }}></span> Critical Gaps
                </h4>
                <ul className="space-y-3">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#374151' }}>
                      <span className="font-bold mt-0.5" style={{ color: '#D97706' }}>!</span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Risk of Rejection */}
            <div className="p-5 rounded-xl space-y-2" style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}>
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#DC2626' }}>Risk of Rejection</h4>
              <p className="text-sm leading-relaxed italic" style={{ color: '#374151' }}>"{result.rejectionAnalysis}"</p>
            </div>

            {/* Suggested Job Roles */}
            {result.suggestedJobRoles && result.suggestedJobRoles.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#16A34A' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }}></span> Suggested Job Roles for You
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {result.suggestedJobRoles.map((role, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectRole(role)}
                      className="p-4 rounded-xl text-left transition-all hover:opacity-90"
                      style={selectedRole === role
                        ? { background: '#F0FDF4', border: '2px solid #16A34A', color: '#16A34A' }
                        : { background: '#F9FAFB', border: '1.5px solid #D1FAE5', color: '#374151' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{['🎯', '💼', '🚀', '⭐'][i]}</span>
                      </div>
                      <span className="text-sm font-semibold leading-tight">{role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Auto-Suggest */}
            {selectedRole && (
              <div className="space-y-4 rounded-xl p-6" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#16A34A' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }}></span> Required Skills for "{selectedRole}"
                </h4>
                <p className="text-xs" style={{ color: '#6B7280' }}>Click on skills to add them to your resume optimization</p>

                {loadingSkills ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#16A34A', borderTopColor: 'transparent' }}></div>
                    <span className="text-sm animate-pulse" style={{ color: '#16A34A' }}>Analyzing required skills...</span>
                  </div>
                ) : (
                  <>
                    {suggestedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {suggestedSkills.map((skill, i) => (
                          <button
                            key={i}
                            onClick={() => handleAddSkill(skill)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1 hover:opacity-80"
                            style={{ background: '#DCFCE7', color: '#16A34A', border: '1px solid #86EFAC' }}
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
                    <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#16A34A' }}>Added Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="pl-3 pr-1 py-1 rounded-full text-xs font-medium flex items-center gap-2"
                          style={{ background: '#DCFCE7', color: '#16A34A', border: '1px solid #86EFAC' }}
                        >
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold hover:bg-red-100 hover:text-red-500 transition-colors"
                            style={{ background: 'rgba(22,163,74,0.15)' }}
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
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                    style={{ background: '#FFFFFF', border: '1.5px solid #D1FAE5', color: '#374151' }}
                  />
                  <button
                    onClick={handleAddManualSkill}
                    disabled={!manualSkill.trim()}
                    className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90"
                    style={{ background: 'linear-gradient(90deg,#16A34A,#22C55E)', borderRadius: '12px' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Template Selector */}
            <div className="space-y-4 pt-6" style={{ borderTop: '1.5px solid #D1FAE5' }}>
              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#6B7280' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }}></span> Choose Resume Template
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                {TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className="relative flex flex-col p-5 text-left transition-all cursor-pointer"
                    style={{
                      borderRadius: '14px',
                      border: selectedTemplate === tpl.id ? '2px solid #16A34A' : '1.5px solid #D1FAE5',
                      background: selectedTemplate === tpl.id ? '#F0FDF4' : '#FAFAFA',
                      boxShadow: selectedTemplate === tpl.id ? '0 4px 16px rgba(22,163,74,0.12)' : 'none'
                    }}
                  >
                    {selectedTemplate === tpl.id && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#16A34A' }}>
                        ✓
                      </div>
                    )}
                    <div className="text-3xl mb-3">{tpl.icon}</div>
                    <h5 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>{tpl.name}</h5>
                    <p className="text-[11px] leading-normal mb-3 flex-1" style={{ color: '#9CA3AF' }}>{tpl.desc}</p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#16A34A' }}>{tpl.preview}</div>
                      <button
                        onClick={(e) => handlePreviewTemplate(tpl.id, e)}
                        className="px-2 py-1 rounded text-[10px] font-semibold transition-all hover:opacity-80"
                        style={{ background: '#DCFCE7', color: '#16A34A' }}
                      >
                        👁 Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6" style={{ borderTop: '1.5px solid #D1FAE5' }}>
              <button
                onClick={handleRewrite}
                disabled={rewriting}
                className="w-full text-white font-semibold transition-all disabled:opacity-50 hover:opacity-90 uppercase tracking-wide"
                style={{ height: '52px', borderRadius: '12px', background: 'linear-gradient(90deg,#16A34A,#22C55E)', fontSize: '15px', fontWeight: 600 }}
              >
                {rewriting ? '⚙️ Optimizing Content...' : '✨ Auto-Optimize My Resume'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-5 py-16" style={{ border: '2px dashed #22C55E', background: '#F0FDF4', borderRadius: '14px' }}>
            <div className="text-7xl opacity-30">📊</div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold" style={{ color: '#111827' }}>ATS Performance Scan</h3>
              <p className="max-w-sm mx-auto text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
                Upload your resume and enter desired role keywords above to see if you'll pass the automated filters.
              </p>
            </div>
          </div>
        )}

        {/* Rewrite Result */}
        {rewrite && (
          <div className="rounded-xl p-6 space-y-6 animate-in zoom-in duration-500" style={{ background: '#FFFFFF', border: '1.5px solid #D1FAE5', boxShadow: '0px 8px 30px rgba(0,0,0,0.05)' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold" style={{ color: '#111827' }}>AI-Powered Optimization</h3>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Optimized with <strong className="font-bold capitalize" style={{ color: '#16A34A' }}>{selectedTemplate}</strong> template • Enhanced keywords applied</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={(e) => handlePreviewTemplate(selectedTemplate, e as any)}
                  className="flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2 hover:opacity-80"
                  style={{ background: '#F0FDF4', color: '#16A34A', border: '1.5px solid #BBF7D0' }}
                >
                  <span>👁</span> Preview
                </button>
                <button
                  onClick={downloadRewrittenPDF}
                  className="flex-1 md:flex-none px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2 hover:opacity-90"
                  style={{ background: 'linear-gradient(90deg,#16A34A,#22C55E)', borderRadius: '12px' }}
                >
                  <span>⬇</span> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setPreviewUrl(null)}>
            <div className="rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" style={{ background: '#FFFFFF', border: '1.5px solid #D1FAE5' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4" style={{ borderBottom: '1.5px solid #D1FAE5' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <span className="font-semibold text-sm" style={{ color: '#111827' }}>Resume Layout Preview</span>
                </div>
                <div className="flex gap-2">
                  {rewrite && (
                    <button onClick={downloadRewrittenPDF} disabled={rewriting} className="px-4 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(90deg,#16A34A,#22C55E)' }}>
                      {rewriting ? 'Exporting...' : 'Download PDF'}
                    </button>
                  )}
                  <button onClick={() => setPreviewUrl(null)} className="px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all cursor-pointer" style={{ background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-gray-500/10 flex items-start justify-center p-8 custom-scrollbar">
                {parsedResume ? (
                  <div className="shadow-2xl rounded-sm max-w-full overflow-hidden">
                    <ResumeTemplate data={parsedResume} templateId={selectedTemplate} id="resume-preview-view" />
                  </div>
                ) : (
                  <div className="bg-white p-8 w-full max-w-3xl rounded shadow text-gray-500 text-center">
                    <p className="text-lg font-semibold mb-2">No Preview Available</p>
                    <p>Click "Auto-Optimize My Resume" to generate your optimized resume.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HIDDEN OFF-SCREEN RENDER CONTAINER FOR PDF CAPTURE */}
      {parsedResume && (
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
           <style dangerouslySetInnerHTML={{ __html: `
              #hidden-pdf-render-container * {
                  border-color: rgba(0,0,0,0);
                  outline-color: rgba(0,0,0,0);
                  text-decoration-color: rgba(0,0,0,0);
                  -webkit-tap-highlight-color: rgba(0,0,0,0);
              }
           `}} />
           <div id="hidden-pdf-render-container" style={{ width: '800px', background: '#ffffff', minHeight: '1122px' }}>
             <ResumeTemplate data={parsedResume} templateId={selectedTemplate} id="hidden-pdf-view" />
           </div>
        </div>
      )}

    </div>
    </div>
  );
};
