import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth/mammoth.browser.js';

interface LegalDocumentViewerProps {
  title: string;
  url: string;
  filename: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const LegalDocumentViewer: React.FC<LegalDocumentViewerProps> = ({ 
  title, 
  url, 
  filename, 
  onClose,
  isModal = true 
}) => {
  const [docHtml, setDocHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadDoc = async () => {
      setLoading(true);
      setError(false);
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
    if (url) {
      loadDoc();
    }
  }, [url]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <>
      <style>{`
        /* Print styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .legal-print-container, .legal-print-container * {
            visibility: visible !important;
          }
          .legal-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            background: white !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure text is black for printing */
          .doc-content * {
            color: #000 !important;
          }
        }
        
        /* Word Document Styles */
        .doc-content {
          font-family: "Times New Roman", Times, serif;
          text-align: justify;
        }
        .doc-content h1 {
          font-size: 24pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 24pt;
          margin-top: 12pt;
          color: #000;
        }
        .doc-content h2 {
          font-size: 16pt;
          font-weight: bold;
          color: #000;
          margin-top: 18pt;
          margin-bottom: 12pt;
        }
        .doc-content h3 {
          font-size: 14pt;
          font-weight: bold;
          color: #000;
          margin-top: 14pt;
          margin-bottom: 10pt;
        }
        .doc-content p {
          margin-bottom: 12pt;
          color: #000;
          line-height: 1.5;
          font-size: 12pt;
          text-indent: 0;
        }
        .doc-content strong, .doc-content b {
          font-weight: bold;
        }
        .doc-content em, .doc-content i {
          font-style: italic;
        }
        .doc-content ul {
          list-style-type: disc;
          padding-left: 24pt;
          margin-bottom: 12pt;
        }
        .doc-content ol {
          list-style-type: decimal;
          padding-left: 24pt;
          margin-bottom: 12pt;
        }
        .doc-content li {
          margin-bottom: 6pt;
          color: #000;
          font-size: 12pt;
          line-height: 1.5;
        }
        .doc-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16pt;
          font-size: 11pt;
        }
        .doc-content th, .doc-content td {
          border: 1px solid #000;
          padding: 6pt 8pt;
          text-align: left;
          color: #000;
        }
        .doc-content th {
          font-weight: bold;
          background-color: #f8f9fa;
        }
        .doc-content a {
          color: #0563c1;
          text-decoration: underline;
        }
        .doc-content hr {
          border: none;
          border-top: 1px solid #000;
          margin: 16pt 0;
        }
      `}</style>
      
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 rounded-t-2xl no-print">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition-colors"
            title="Print Document"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Print</span>
          </button>
          <a
            href={url}
            download={filename}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm transition-colors"
            title="Download DOCX"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download DOCX</span>
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-slate-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Document Body */}
      <div className="overflow-y-auto flex-1 bg-slate-100 p-4 sm:p-8 rounded-b-2xl">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <p className="text-slate-500 text-sm text-center py-10">
            Unable to load document. Please try downloading it instead.
          </p>
        ) : (
          <div className="legal-print-container bg-white shadow-xl mx-auto max-w-[850px] px-8 sm:px-16 py-12 sm:py-20 min-h-[1056px] border border-slate-200">
            <div
              dangerouslySetInnerHTML={{ __html: docHtml }}
              className="doc-content"
            />
          </div>
        )}
      </div>
    </>
  );

  if (!isModal) {
    return <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl">{content}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-slate-900/70 backdrop-blur-sm no-print"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-5xl h-full sm:h-auto max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {content}
      </div>
    </div>
  );
};
