import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Fix 17: Client-side login rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center -mt-20 px-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back</h2>
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-3 rounded-xl mb-4 text-sm">{successMsg}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading || (lockoutUntil !== null && new Date() < lockoutUntil)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <p className="mt-6 text-center text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-500 hover:text-emerald-400 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
