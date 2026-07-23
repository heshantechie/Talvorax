// Central pricing config. All user-facing prices must come from here —
// never hardcode a price in a component.

export type Region = 'IN' | 'INTL';

// Free-tier entitlement advertised on the pricing page.
export const FREE_MONTHLY_ANALYSIS_LIMIT = 3;

// Free tier limits for other features
export const FREE_MONTHLY_INTERVIEW_LIMIT = 5;
export const FREE_DAILY_JOB_ALERT_LIMIT = 3;

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  periodLabel: string;
  badge?: string;
  features: string[];
  comingSoonFeatures?: string[];
  cta: string;
  ctaLink: string;
  highlighted?: boolean;
  comingSoon?: boolean;
}

// No payment provider is live yet — every account is on the Free tier and paid
// plans are shown as "Coming Soon". Flip to false when checkout ships.
export const PAID_PLANS_COMING_SOON = true;

const FREE_FEATURES = [
  'Resume Analysis (3/month)',
  '5 Mock Interviews / month',
  'Unlimited Minute Talk',
  '3 Job Alerts / day',
];

const PRO_FEATURES = [
  'Unlimited Resume Analysis & Tracking',
  'Advanced AI Interview Coach (All Roles)',
  'Priority Support & Feedback',
];

// Auto Apply is not live yet — keep it out of PRO_FEATURES until it ships.
const PRO_COMING_SOON = ['Auto Apply Integration (Coming Soon)'];

export const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free Plan',
  tagline: 'Perfect for getting started',
  priceLabel: '₹0',
  periodLabel: '/ forever',
  features: FREE_FEATURES,
  cta: 'Get Started',
  ctaLink: '/signup',
};

export const INDIA_PLANS: Plan[] = [
  {
    id: 'pro_monthly_inr',
    name: 'Pro Monthly',
    tagline: 'Full access, month to month',
    priceLabel: '₹299',
    periodLabel: '/ month',
    features: PRO_FEATURES,
    comingSoonFeatures: PRO_COMING_SOON,
    cta: 'Upgrade Now',
    ctaLink: '/signup?plan=pro_monthly_inr',
  },
  {
    id: 'season_pass_inr',
    name: 'Placement Season Pass',
    tagline: 'Everything in Pro for the full placement season',
    priceLabel: '₹599',
    periodLabel: '/ 4 months',
    badge: 'Most Popular',
    features: PRO_FEATURES,
    comingSoonFeatures: PRO_COMING_SOON,
    cta: 'Get Season Pass',
    ctaLink: '/signup?plan=season_pass_inr',
    highlighted: true,
  },
  {
    id: 'pro_annual_inr',
    name: 'Pro Annual',
    tagline: 'A full year of Pro at the best rate',
    priceLabel: '₹999',
    periodLabel: '/ year',
    badge: 'Best Value',
    features: PRO_FEATURES,
    comingSoonFeatures: PRO_COMING_SOON,
    cta: 'Go Annual',
    ctaLink: '/signup?plan=pro_annual_inr',
  },
];

export const INTL_PLANS: Plan[] = [
  {
    id: 'pro_monthly_usd',
    name: 'Pro Plan',
    tagline: 'Supercharge your job hunt',
    priceLabel: '$19',
    periodLabel: '/ month',
    badge: 'Most Popular',
    features: PRO_FEATURES,
    comingSoonFeatures: PRO_COMING_SOON,
    cta: 'Upgrade Now',
    ctaLink: '/signup?plan=pro',
    highlighted: true,
  },
];

// Region detection without an external geo-IP call: an India timezone or an
// Indian locale is a reliable-enough signal for display currency. Defaults to
// India (the primary market) when signals are ambiguous.
export const detectRegion = (): Region => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IN';
    const langs = [navigator.language, ...(navigator.languages || [])];
    if (langs.some((l) => l && l.toUpperCase().endsWith('-IN'))) return 'IN';
    if (tz) return 'INTL';
  } catch {
    // fall through to default
  }
  return 'IN';
};

export const getPaidPlans = (region: Region): Plan[] =>
  (region === 'IN' ? INDIA_PLANS : INTL_PLANS).map((plan) => ({
    ...plan,
    comingSoon: PAID_PLANS_COMING_SOON,
  }));

export const getFreePlan = (region: Region): Plan =>
  region === 'IN' ? FREE_PLAN : { ...FREE_PLAN, priceLabel: '$0' };
