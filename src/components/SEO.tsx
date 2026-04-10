import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  url?: string;
  schema?: any;
  faqSchema?: any;
}

export const SEO: React.FC<SEOProps> = ({ title, description, url = 'https://talvorax.com', schema, faqSchema }) => {
  useEffect(() => {
    document.title = title;
    
    const setMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (isProperty) el.setAttribute('property', name);
        else el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', url, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);

    // Main App Schema
    let mainScriptEl = document.querySelector('script#schema-main');
    if (schema) {
      if (!mainScriptEl) {
        mainScriptEl = document.createElement('script');
        mainScriptEl.setAttribute('type', 'application/ld+json');
        mainScriptEl.id = 'schema-main';
        document.head.appendChild(mainScriptEl);
      }
      mainScriptEl.textContent = JSON.stringify(schema);
    } else if (mainScriptEl) {
      mainScriptEl.remove();
    }

    // FAQ Schema
    let faqScriptEl = document.querySelector('script#schema-faq');
    if (faqSchema) {
      if (!faqScriptEl) {
        faqScriptEl = document.createElement('script');
        faqScriptEl.setAttribute('type', 'application/ld+json');
        faqScriptEl.id = 'schema-faq';
        document.head.appendChild(faqScriptEl);
      }
      faqScriptEl.textContent = JSON.stringify(faqSchema);
    } else if (faqScriptEl) {
      faqScriptEl.remove();
    }

  }, [title, description, url, schema, faqSchema]);

  return null;
};
