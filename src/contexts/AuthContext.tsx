import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const hasAccessToken = window.location.hash.includes('access_token=');
                                
      // If the user arrived via an email confirmation link, Supabase auto-logs them in.
      if (session && hasAccessToken) {
        if (mounted) {
          setSession(session);
          setUser(session.user);
          setLoading(false);
          // Clean the URL without causing a reload
          window.history.replaceState(null, '', window.location.pathname);
          // Optional: redirect to dashboard if they were on login/signup
          if (['/login', '/signup', '/'].includes(window.location.pathname)) {
            window.location.href = '/dashboard';
          }
        }
        return;
      }
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    handleInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      const hasAccessToken = window.location.hash.includes('access_token=');

      if (event === 'SIGNED_IN' && hasAccessToken) {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          // Clean the URL
          window.history.replaceState(null, '', window.location.pathname);
          if (['/login', '/signup', '/'].includes(window.location.pathname)) {
            window.location.href = '/dashboard';
          }
        }
        return;
      }
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error && (error.status === 403 || error.message.includes('403'))) {
      // Force local logout if server session is invalid/expired
      await supabase.auth.signOut({ scope: 'local' });
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
