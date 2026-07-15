import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  url?: string;
  ogImage?: string;
  schema?: any;
  faqSchema?: any;
}

const DEFAULT_OG_IMAGE = 'https://www.talvorax.com/og-image.png';

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  url = 'https://www.talvorax.com',
  ogImage = DEFAULT_OG_IMAGE,
  schema,
  faqSchema,
}) => {
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

    // Standard meta
    setMeta('description', description);

    // Open Graph
    setMeta('og:type', 'website', true);
    setMeta('og:site_name', 'Talvorax', true);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', url, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:image:width', '1200', true);
    setMeta('og:image:height', '630', true);

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

    // Canonical
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', url);

    // Main App Schema (JSON-LD)
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

    // FAQ Schema (JSON-LD)
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

  }, [title, description, url, ogImage, schema, faqSchema]);

  return null;
};
