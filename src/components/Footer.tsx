import React from 'react';
import { Link } from 'react-router-dom';
import { getLegalDocuments } from '../lib/documents';

export const Footer: React.FC = () => {
  const legalDocs = getLegalDocuments();

  return (
    <footer className="bg-slate-950 text-slate-400 py-12 px-6 font-sans border-t border-slate-900">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <span className="text-xl font-bold text-white tracking-tight">Talvorax</span>
          </Link>
          <p className="text-sm text-slate-500 max-w-sm">
            Land your dream job faster with AI-powered resume analysis, mock interviews, and speaking practice.
          </p>
        </div>
        
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">Product</h3>
          <ul className="space-y-3 text-sm">
            <li><Link to="/resume-analyzer" className="hover:text-[#10B981] transition-colors">Resume Analyzer</Link></li>
            <li><Link to="/interview-coach" className="hover:text-[#10B981] transition-colors">Interview Coach</Link></li>
            <li><Link to="/minute-talk" className="hover:text-[#10B981] transition-colors">Minute Talk</Link></li>
            <li><Link to="/job-alerts" className="hover:text-[#10B981] transition-colors">Job Alerts</Link></li>
            <li><Link to="/pricing" className="hover:text-[#10B981] transition-colors">Pricing</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">Legal</h3>
          <ul className="space-y-3 text-sm">
            {legalDocs.map((doc) => (
              <li key={doc.id}>
                {/* Depending on how we want to display, we can link to the /legal page with a hash, or open directly */}
                <Link to="/legal" className="hover:text-[#10B981] transition-colors">
                  {doc.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
        <p>© {new Date().getFullYear()} Talvorax. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
          <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
          <a href="#" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
};
