import React, { useState, useEffect } from 'react';
import { getLegalDocuments, LegalDocument } from '../lib/documents';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import mammoth from 'mammoth/mammoth.browser.js';

export const Legal: React.FC = () => {
  const documents = getLegalDocuments();
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
  const [docHtml, setDocHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleOpenDoc = async (doc: LegalDocument) => {
    setSelectedDoc(doc);
    setLoading(true);
    setDocHtml('');

    try {
      const response = await fetch(doc.url);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setDocHtml(result.value);
    } catch (error) {
      console.error('Error loading document:', error);
      setDocHtml('<p>Error loading document content. Please try downloading it instead.</p>');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedDoc(null);
    setDocHtml('');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Legal Documents</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Please review our legal policies, terms, and agreements. We believe in transparency and want to ensure you fully understand how Talvorax operates.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">{doc.title}</h2>
              <p className="text-slate-600 text-sm mb-8 flex-1">{doc.description}</p>
              
              <div className="flex gap-4 mt-auto">
                <button 
                  onClick={() => handleOpenDoc(doc)}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm transition-colors text-center"
                >
                  View
                </button>
                <a 
                  href={doc.url} 
                  download={doc.filename}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors text-center inline-flex justify-center items-center"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />

      {/* Document Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-2xl font-bold text-slate-900">{selectedDoc.title}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-white prose prose-slate max-w-none">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: docHtml }} className="text-slate-700 text-sm leading-relaxed" />
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <a 
                href={selectedDoc.url} 
                download={selectedDoc.filename}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm transition-colors mr-4"
              >
                Download PDF/Word
              </a>
              <button 
                onClick={closeModal}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-xl text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
