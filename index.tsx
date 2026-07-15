
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';

// Fix 13: Initialize Sentry error tracking
const sentryDsn = (import.meta as any).env?.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: (import.meta as any).env?.MODE || 'development',
    tracesSampleRate: 0.1, // 10% of transactions
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Remove aria-hidden set by prerender static content before React mounts.
// The CSS rule `#root[aria-hidden="true"] > * { visibility: hidden }` ensures
// the static HTML is invisible to users but readable by crawlers.
rootElement.removeAttribute('aria-hidden');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
