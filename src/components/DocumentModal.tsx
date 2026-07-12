import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth/mammoth.browser.js';

interface DocumentModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ title, url, onClose }) => {
  const [docHtml, setDocHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadDoc = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocHtml(result.value);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [url]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <style>{`
        .doc-content h1 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 0.75rem;
          margin-top: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }
        .doc-content h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a202c;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .doc-content h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin-top: 1.25rem;
          margin-bottom: 0.4rem;
        }
        .doc-content p {
          margin-bottom: 0.75rem;
          color: #374151;
          line-height: 1.8;
          font-size: 0.875rem;
        }
        .doc-content strong, .doc-content b {
          font-weight: 700;
          color: #111827;
        }
        .doc-content em, .doc-content i {
          font-style: italic;
          color: #4b5563;
        }
        .doc-content ul {
          list-style-type: disc;
          padding-left: 1.75rem;
          margin-bottom: 0.75rem;
        }
        .doc-content ol {
          list-style-type: decimal;
          padding-left: 1.75rem;
          margin-bottom: 0.75rem;
        }
        .doc-content li {
          margin-bottom: 0.35rem;
          color: #374151;
          font-size: 0.875rem;
          line-height: 1.7;
        }
        .doc-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
          font-size: 0.85rem;
        }
        .doc-content th {
          background-color: #f1f5f9;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          text-align: left;
          color: #1e293b;
        }
        .doc-content td {
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          color: #374151;
        }
        .doc-content a {
          color: #10b981;
          text-decoration: underline;
        }
        .doc-content hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 1.25rem 0;
        }
      `}</style>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body — styled like a Word doc */}
          <div className="overflow-y-auto flex-1 bg-gray-100 p-4">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <p className="text-slate-500 text-sm text-center py-10">
                Unable to load document. Please visit the <a href="/legal" className="text-emerald-600 underline">Legal page</a>.
              </p>
            ) : (
              <div className="bg-white shadow-md mx-auto max-w-2xl px-12 py-10 min-h-full">
                <div
                  dangerouslySetInnerHTML={{ __html: docHtml }}
                  className="doc-content font-serif"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
