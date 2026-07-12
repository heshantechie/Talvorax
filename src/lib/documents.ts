export interface LegalDocument {
  id: string;
  filename: string;
  title: string;
  url: string;
  description: string;
}

// Automatically detect all .docx files in src/assets/documents
// ?url query parameter is needed to get the URL for downloading/viewing
const documentModules = import.meta.glob('../assets/documents/*.docx', { query: '?url', import: 'default', eager: true });

export const getLegalDocuments = (): LegalDocument[] => {
  const documents: LegalDocument[] = [];

  for (const path in documentModules) {
    const url = documentModules[path] as string;
    // Extract filename from path (e.g., '../assets/documents/Talvorax_Privacy_Policy.docx' -> 'Talvorax_Privacy_Policy.docx')
    const filename = path.split('/').pop() || '';
    
    // Create an ID (e.g., 'privacy_policy')
    const id = filename
      .toLowerCase()
      .replace('.docx', '')
      .replace('talvorax_', '')
      .replace(/_/g, '-');
      
    // Create a human readable title (e.g., 'Privacy Policy')
    const title = filename
      .replace('.docx', '')
      .replace('Talvorax_', '')
      .replace(/_/g, ' ');

    let description = 'Read our ' + title;
    
    // Add specific descriptions based on title
    if (title.toLowerCase().includes('privacy')) {
      description = 'Learn how we collect, use, and protect your data.';
    } else if (title.toLowerCase().includes('terms')) {
      description = 'Understand the terms and conditions of using Talvorax.';
    } else if (title.toLowerCase().includes('security')) {
      description = 'See how we keep your information safe and secure.';
    } else if (title.toLowerCase().includes('dpa') || title.toLowerCase().includes('data processing')) {
      description = 'Details on our data processing agreement and practices.';
    } else if (title.toLowerCase().includes('nda') || title.toLowerCase().includes('non disclosure')) {
      description = 'Our mutual non-disclosure agreement to protect confidential information.';
    }

    documents.push({
      id,
      filename,
      title,
      url,
      description
    });
  }

  // Sort logically if needed, e.g., Terms first, Privacy second
  return documents.sort((a, b) => a.title.localeCompare(b.title));
};

export const getLegalDocumentById = (id: string): LegalDocument | undefined => {
  return getLegalDocuments().find((doc) => doc.id === id);
};
