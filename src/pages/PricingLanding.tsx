import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Check, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Footer } from '../components/Footer';
import { detectRegion, getFreePlan, getPaidPlans, Plan, Region } from '../lib/pricing';
import { track } from '../lib/analytics';
import { useAuth } from '../contexts/AuthContext';

const PaidPlanCard: React.FC<{ plan: Plan; onUpgradeClick: (plan: Plan) => void }> = ({ plan, onUpgradeClick }) => {
  const [notified, setNotified] = useState(false);
  return (
  <div
    className={
      plan.highlighted
        ? 'bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-[0_20px_60px_rgba(16,185,129,0.15)] flex flex-col h-full relative transform lg:-translate-y-4'
        : 'bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col h-full relative'
    }
  >
    {(plan.comingSoon || plan.badge) && (
      <div className={`absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-md whitespace-nowrap ${
        plan.comingSoon ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white'
      }`}>
        {plan.comingSoon ? 'Coming Soon' : plan.badge}
      </div>
    )}
    <div className="mb-8">
      <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
      <p className={`font-medium text-sm ${plan.highlighted ? 'text-slate-400' : 'text-slate-500'}`}>{plan.tagline}</p>
      <div className={`mt-6 flex items-baseline gap-1 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
        <span className="text-5xl font-[800]">{plan.priceLabel}</span>
        <span className={`font-medium ${plan.highlighted ? 'text-slate-400' : 'text-slate-500'}`}>{plan.periodLabel}</span>
      </div>
    </div>

    <ul className={`space-y-4 mb-10 flex-1 ${plan.highlighted ? 'text-slate-300' : 'text-slate-700'}`}>
      {plan.features.map((feature) => (
        <li key={feature} className="flex items-start gap-3">
          <Check className="text-emerald-400 w-5 h-5 shrink-0" />
          <span className={`font-medium ${plan.highlighted ? 'text-white' : 'text-slate-700'}`}>{feature}</span>
        </li>
      ))}
      {plan.comingSoonFeatures?.map((feature) => (
        <li key={feature} className={`flex items-start gap-3 ${plan.highlighted ? 'text-slate-500' : 'text-slate-400'}`}>
          <Clock className="w-5 h-5 shrink-0" />
          <span className="font-medium">{feature}</span>
        </li>
      ))}
    </ul>

    {plan.comingSoon ? (
      <button
        onClick={() => {
          if (!notified) {
            onUpgradeClick(plan);
            setNotified(true);
          }
        }}
        className={`w-full block text-center py-4 rounded-xl font-bold transition-colors ${
          notified
            ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700 cursor-default'
            : plan.highlighted
              ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-2 border-slate-600'
              : 'border-2 border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
        }`}
      >
        {notified ? "You're on the list ✓" : 'Coming Soon — Notify Me'}
      </button>
    ) : (
      <Link
        to={plan.ctaLink}
        onClick={() => onUpgradeClick(plan)}
        className={
          plan.highlighted
            ? 'w-full block text-center py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)]'
            : 'w-full block text-center py-4 rounded-xl border-2 border-emerald-500 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors'
        }
      >
        {plan.cta}
      </Link>
    )}
  </div>
  );
};

export const PricingLanding: React.FC = () => {
  const [region, setRegion] = useState<Region>(() => detectRegion());
  const { user } = useAuth();

  const freePlan = getFreePlan(region);
  const paidPlans = getPaidPlans(region);

  const handleUpgradeClick = (plan: Plan) => {
    track('upgrade_cta_clicked', { plan_id: plan.id, region, coming_soon: plan.comingSoon ?? false }, user?.id);
  };

  return (
    <div className="min-h-screen font-sans bg-white pt-24 text-slate-900">
      <Navbar />

      {/* Header */}
      <section className="py-20 px-6 max-w-3xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-[800] tracking-tight mb-6">Choose Your Plan</h1>
        <p className="text-xl text-slate-500 font-medium">Simple, transparent pricing to help you land your dream job faster.</p>
        <p className="mt-4 inline-block px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
          Paid plans are launching soon — right now everyone gets the Free plan. Tap "Notify Me" and we'll tell you when Pro goes live.
        </p>
        <button
          onClick={() => setRegion(region === 'IN' ? 'INTL' : 'IN')}
          className="mt-6 text-sm font-semibold text-slate-400 hover:text-emerald-600 transition-colors underline underline-offset-4"
        >
          {region === 'IN' ? 'Prices in ₹ INR — view international pricing' : 'Prices in $ USD — view India pricing'}
        </button>
      </section>

      {/* Pricing Cards */}
      <section
        className={`max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch ${
          region === 'IN' ? 'lg:grid-cols-4' : 'lg:max-w-5xl'
        }`}
      >
        {/* Free Plan */}
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col h-full">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{freePlan.name}</h3>
            <p className="text-slate-500 font-medium text-sm">{freePlan.tagline}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-[800]">{freePlan.priceLabel}</span>
              <span className="text-slate-500 font-medium">{freePlan.periodLabel}</span>
            </div>
          </div>

          <ul className="space-y-4 mb-10 flex-1">
            {freePlan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="text-emerald-500 w-5 h-5 shrink-0" />
                <span className="font-medium text-slate-700">{feature}</span>
              </li>
            ))}
            <li className="flex items-start gap-3 text-slate-400">
              <Check className="text-slate-300 w-5 h-5 shrink-0" />
              <span>Upgrade for Unlimited Interviews &amp; Alerts</span>
            </li>
          </ul>

          <Link
            to={freePlan.ctaLink}
            className="w-full block text-center py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            {freePlan.cta}
          </Link>
        </div>

        {paidPlans.map((plan) => (
          <PaidPlanCard key={plan.id} plan={plan} onUpgradeClick={handleUpgradeClick} />
        ))}
      </section>
      <Footer />
    </div>
  );
};
