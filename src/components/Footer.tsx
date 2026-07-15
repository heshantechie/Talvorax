import React from 'react';
import { Link } from 'react-router-dom';
import { getLegalDocuments } from '../lib/documents';

export const Footer: React.FC = () => {
  const legalDocs = getLegalDocuments();

  return (
    <footer style={{ background: 'rgb(248, 250, 252)' }} className="py-12 px-6 font-sans border-t border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <span className="text-xl font-bold text-[#111827] tracking-tight">Talvorax</span>
          </Link>
          <p className="text-sm text-[#374151] font-medium max-w-sm leading-relaxed">
            Land your dream job faster with AI-powered resume analysis, mock interviews, and speaking practice.
          </p>
        </div>
        
        <div>
          <h3 className="text-[#111827] font-bold mb-4 text-sm tracking-wider uppercase">Product</h3>
          <ul className="space-y-3 text-sm">
            <li><Link to="/resume-analyzer" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">Resume Analyzer</Link></li>
            <li><Link to="/interview-coach" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">Interview Coach</Link></li>
            <li><Link to="/minute-talk" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">Minute Talk</Link></li>
            <li><Link to="/job-alerts" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">Job Alerts</Link></li>
            <li><Link to="/pricing" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">Pricing</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-[#111827] font-bold mb-4 text-sm tracking-wider uppercase">Legal</h3>
          <ul className="space-y-3 text-sm">
            {legalDocs.map((doc) => (
              <li key={doc.id}>
                {/* Depending on how we want to display, we can link to the /legal page with a hash, or open directly */}
                <Link to="/legal" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">
                  {doc.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto pt-8 border-t border-[#E5E7EB] flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
        <p className="text-[#6B7280] font-medium">© {new Date().getFullYear()} Talvorax. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">Twitter</a>
          <a href="#" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">LinkedIn</a>
          <a href="#" className="text-[#374151] font-medium hover:text-[#10B981] transition-colors duration-200">GitHub</a>
        </div>
      </div>
    </footer>
  );
};
