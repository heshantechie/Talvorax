import React from 'react';
import { LegalDocumentViewer } from './LegalDocumentViewer';

interface DocumentModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ title, url, onClose }) => {
  return (
    <LegalDocumentViewer
      title={title}
      url={url}
      filename={title.replace(/ /g, '_') + '.docx'}
      onClose={onClose}
      isModal={true}
    />
  );
};

