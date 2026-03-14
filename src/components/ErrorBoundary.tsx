import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Fix 13: Report to Sentry
    Sentry.captureException(error, { extra: info as any });
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-950">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-400 mb-3">Something went wrong</h1>
            <p className="text-slate-400 mb-6 text-sm">
              We encountered an unexpected error. Please refresh the page to continue.
            </p>
            {this.state.error && (
              <p className="text-xs text-slate-600 mb-4 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
