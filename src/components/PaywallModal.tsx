// src/components/PaywallModal.tsx
// Paywall modal shown when a free user hits a feature limit.
// Renders a glassy overlay with usage stats and a CTA to upgrade.

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Lock, ArrowRight, Star } from 'lucide-react';

export interface PaywallModalProps {
  /** The feature that triggered the paywall */
  feature: 'mock_interviews' | 'job_alerts';
  /** How many uses the user has consumed */
  used: number;
  /** The maximum allowed on the free tier */
  limit: number;
  /** Called when the user dismisses the modal */
  onClose: () => void;
}

const FEATURE_COPY: Record<
  PaywallModalProps['feature'],
  { icon: string; title: string; period: string; description: string; proPerks: string[] }
> = {
  mock_interviews: {
    icon: '🎯',
    title: 'Mock Interview Limit Reached',
    period: 'this month',
    description:
      "You've used all your free mock interviews for this month. Upgrade to Pro for unlimited AI-powered practice sessions.",
    proPerks: [
      'Unlimited mock interviews every month',
      'All 5 interview modes unlocked',
      'Detailed AI feedback & scoring',
      'Resume-based & company-specific sessions',
    ],
  },
  job_alerts: {
    icon: '🔔',
    title: 'Daily Job Alert Limit Reached',
    period: 'today',
    description:
      "You've created 3 job alerts today — that's the free limit. Upgrade to Pro to create unlimited alerts and never miss a match.",
    proPerks: [
      'Unlimited job alerts every day',
      'Priority AI job matching',
      'Real-time email & push notifications',
      'Advanced skills-gap analysis',
    ],
  },
};

export const PaywallModal: React.FC<PaywallModalProps> = ({ feature, used, limit, onClose }) => {
  const navigate = useNavigate();
  const copy = FEATURE_COPY[feature];

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const progressPercent = Math.min((used / limit) * 100, 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(15,23,42,0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.35)]"
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'paywall-in 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-8">
          {/* Lock icon + feature icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.4)] text-2xl">
              {copy.icon}
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <Lock className="w-5 h-5 text-slateald-400" />
            </div>
          </div>

          {/* Title & description */}
          <h2 className="text-xl font-[800] text-white mb-2 leading-snug">{copy.title}</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">{copy.description}</p>

          {/* Usage bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Usage {copy.period}
              </span>
              <span className="text-xs font-bold text-white">
                {used} <span className="text-slate-500">/ {limit}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #10b981, #34d399)',
                  boxShadow: '0 0 8px rgba(16,185,129,0.6)',
                }}
              />
            </div>
          </div>

          {/* Pro perks */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pro Plan Includes</span>
            </div>
            <ul className="space-y-2">
              {copy.proPerks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-slate-300 font-medium">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <button
            onClick={() => { navigate('/pricing'); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
            }}
          >
            <Zap className="w-4 h-4" />
            Upgrade to Pro — See Plans
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-slate-500 text-sm font-semibold hover:text-slate-300 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Keyframe animation */}
        <style>{`
          @keyframes paywall-in {
            from { opacity: 0; transform: scale(0.92) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
};
