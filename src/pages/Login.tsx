import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import talvoraxLogo from '../assets/logo.png';

const HeroIllustration = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full max-h-[320px]">
    {/* Base Line */}
    <line x1="40" y1="260" x2="360" y2="260" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.8" />

    {/* Back large folder/book */}
    <path d="M 220 120 L 300 140 L 290 260 L 210 260 Z" fill="#047857" opacity="0.6" />
    <path d="M 230 130 L 290 145 L 280 250 L 220 250 Z" fill="#FFFFFF" opacity="0.2" />
    <line x1="240" y1="150" x2="270" y2="158" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.4" />

    {/* Books Stack */}
    <rect x="100" y="235" width="160" height="25" rx="5" fill="#FFFFFF" />
    <rect x="100" y="235" width="20" height="25" fill="#E2E8F0" rx="2" />
    <line x1="125" y1="247" x2="250" y2="247" stroke="#94A3B8" strokeWidth="2" strokeDasharray="5,5" />

    <rect x="120" y="210" width="130" height="25" rx="5" fill="#0F172A" />
    <rect x="120" y="210" width="15" height="25" fill="#020617" rx="2" />
    <rect x="140" y="220" width="100" height="5" fill="#334155" rx="2" />

    <rect x="110" y="185" width="140" height="25" rx="5" fill="#3B82F6" />
    <rect x="110" y="185" width="18" height="25" fill="#2563EB" rx="2" />
    <path d="M 140 190 Q 150 205 160 190 M 170 190 Q 180 205 190 190" stroke="#93C5FD" fill="none" strokeWidth="2" strokeLinecap="round" />

    {/* Leaves/Plant */}
    <path d="M 270 260 Q 300 190 340 210 Q 300 240 270 260 Z" fill="#FCD34D" />
    <path d="M 270 260 Q 320 230 330 270 Q 290 270 270 260 Z" fill="#F59E0B" />
    <path d="M 270 260 Q 280 190 310 180 Q 290 230 270 260 Z" fill="#D97706" />

    {/* Person */}
    <path d="M 160 185 L 150 130 M 180 185 L 185 130" stroke="#0F172A" strokeWidth="8" strokeLinecap="round" />
    <path d="M 145 130 C 145 90, 185 90, 185 130 Z" fill="#FFFFFF" />
    <path d="M 165 95 L 165 130" stroke="#E2E8F0" strokeWidth="2" />
    <circle cx="165" cy="80" r="14" fill="#FCA5A5" />
    <path d="M 152 75 Q 165 55 178 75 Z" fill="#0F172A" />
    <path d="M 150 110 L 135 60 L 160 55 M 180 110 L 195 60 L 170 55" stroke="#FCA5A5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M 150 110 L 140 80 M 180 110 L 190 80" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />

    {/* Star */}
    <g transform="translate(165, 30) scale(1.6)">
      <polygon points="0,-15 4,-4 15,-4 7,3 10,14 0,7 -10,14 -7,3 -15,-4 -4,-4" fill="#60A5FA" />
      <polygon points="0,-15 4,-4 0,0" fill="#3B82F6" />
    </g>

    {/* Sparkles */}
    <circle cx="80" cy="80" r="3" fill="#FFFFFF" opacity="0.8" />
    <path d="M 90 130 L 95 140 L 105 145 L 95 150 L 90 160 L 85 150 L 75 145 L 85 140 Z" fill="#FFFFFF" transform="scale(0.6) translate(60, 80)" opacity="0.9" />
    <path d="M 260 50 L 265 60 L 275 65 L 265 70 L 260 80 L 255 70 L 245 65 L 255 60 Z" fill="#FDE047" transform="scale(0.5) translate(280, 20)" />
    <circle cx="300" cy="100" r="4" fill="#FFFFFF" opacity="0.5" />
    <circle cx="110" cy="40" r="2" fill="#FCD34D" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" /></svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
);
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
);

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  // Fix 17: Client-side login rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGithubLogin = async () => {
    setGithubLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setGithubLoading(false);
    }
  };

  const handleLinkedinLogin = async () => {
    setLinkedinLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setLinkedinLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
    // On success, browser redirects to Google — no further action needed here
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccessMsg('Email verified successfully! Please log in.');
      // Clean up the URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Fix 17: Check if locked out
    if (lockoutUntil && new Date() < lockoutUntil) {
      const secs = Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000);
      setError(`Too many failed attempts. Try again in ${secs} seconds.`);
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        const lockout = new Date(Date.now() + 30_000); // 30 second lockout
        setLockoutUntil(lockout);
        setError('Too many failed attempts. Account locked for 30 seconds.');
      } else {
        setError(authError.message);
      }
    } else {
      setFailedAttempts(0);
      setLockoutUntil(null);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E6F8F1] to-[#D1FAE5] p-4 sm:p-8 font-sans">
      <div className="flex w-full max-w-[1000px] bg-white rounded-[24px] shadow-[0_20px_50px_rgba(16,185,129,0.15)] overflow-hidden min-h-[600px]">

        {/* Left Panel */}
        <div className="hidden lg:flex flex-col w-1/2 p-14 relative bg-[#10B981]">
          <h3 className="text-[#A7F3D0] font-[500] tracking-[0.2em] text-[13px] uppercase mb-4 drop-shadow-sm ml-2">WELCOME TO</h3>
          <img src={talvoraxLogo} alt="Talvorax Logo" className="h-[60px] w-auto object-contain mb-8 ml-2" />

          <div className="flex-1 flex items-center justify-center">
            <HeroIllustration />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 p-10 sm:p-14 bg-white flex flex-col justify-center items-center">
          <div className="w-full max-w-[360px]">
            <h2 className="text-[28px] font-bold text-[#1E293B] mb-8 text-center pt-4">Log in</h2>

            {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-6 text-sm border border-red-100">{error}</div>}
            {successMsg && <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-xl mb-6 text-sm border border-[#10B981]/20">{successMsg}</div>}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[12px] font-[600] text-gray-500 mb-1.5 ml-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full bg-[#F8FAFC] border border-transparent rounded-full px-5 py-3.5 text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:bg-white transition-all font-medium text-[14px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[12px] font-[600] text-gray-500 mb-1.5 ml-2">Password</label>
                <input
                  type="password"
                  required
                  className="w-full bg-[#F8FAFC] border border-transparent rounded-full px-5 py-3.5 text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:bg-white transition-all font-medium text-[14px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || (lockoutUntil !== null && new Date() < lockoutUntil)}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-[600] py-[15px] rounded-full text-[14px] uppercase tracking-[0.05em] mt-4 shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50 hover:-translate-y-0.5"
              >
                {loading ? 'Logging in...' : 'Log In Account'}
              </button>
            </form>

            <div className="mt-10 flex flex-col items-center">
              <p className="text-gray-500 text-[13px] mb-4">Log in with</p>
              <div className="flex justify-center gap-5">
                <button
                  type="button"
                  id="google-login-btn"
                  onClick={handleGoogleLogin}
                  disabled={oauthLoading}
                  className="w-10 h-10 rounded-full bg-[#8b9df3] hover:bg-[#10B981] text-white flex items-center justify-center hover:-translate-y-1 transition-all shadow-md shadow-[#8b9df3]/40 hover:shadow-[#10B981]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Continue with Google"
                >
                  {oauthLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <GoogleIcon />}
                </button>
                {/* <button
                  type="button"
                  id="linkedin-login-btn"
                  onClick={handleLinkedinLogin}
                  disabled={linkedinLoading}
                  className="w-10 h-10 rounded-full bg-[#8b9df3] hover:bg-[#10B981] text-white flex items-center justify-center hover:-translate-y-1 transition-all shadow-md shadow-[#8b9df3]/40 hover:shadow-[#10B981]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Continue with LinkedIn"
                >
                  {linkedinLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LinkedInIcon />}
                </button> */}
                <button
                  type="button"
                  id="github-login-btn"
                  onClick={handleGithubLogin}
                  disabled={githubLoading}
                  className="w-10 h-10 rounded-full bg-[#8b9df3] hover:bg-[#10B981] text-white flex items-center justify-center hover:-translate-y-1 transition-all shadow-md shadow-[#8b9df3]/40 hover:shadow-[#10B981]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Continue with GitHub"
                >
                  {githubLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <GitHubIcon />}
                </button>
              </div>
            </div>

            <p className="mt-8 text-center text-gray-500 text-[12px]">
              By signing up you agreed to our{' '}
              <Link to="/legal" className="text-[#10B981] hover:underline">
                Terms & Privacy
              </Link>.
            </p>

            <p className="mt-4 text-center text-gray-500 text-[13px]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#10B981] hover:text-[#059669] font-[600]">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
