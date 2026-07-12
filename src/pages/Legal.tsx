import React, { useState } from 'react';
import { getLegalDocuments, LegalDocument } from '../lib/documents';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LegalDocumentViewer } from '../components/LegalDocumentViewer';

export const Legal: React.FC = () => {
  const documents = getLegalDocuments();
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);

  const handleOpenDoc = (doc: LegalDocument) => {
    setSelectedDoc(doc);
  };

  const closeModal = () => {
    setSelectedDoc(null);
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
                  Download DOCX
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />

      {/* Document Modal */}
      {selectedDoc && (
        <LegalDocumentViewer
          title={selectedDoc.title}
          url={selectedDoc.url}
          filename={selectedDoc.filename}
          onClose={closeModal}
          isModal={true}
        />
      )}
    </div>
  );
};

