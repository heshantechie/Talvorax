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
      
      const isSignupVerification = window.location.hash.includes('type=signup') 
                                || window.location.search.includes('verified=true');
                                
      // If the user arrived via an email confirmation link, Supabase auto-logs them in.
      // We want to force manual login instead, as requested.
      if (session && isSignupVerification) {
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          // Redirect them cleanly to the login page with the verified flag
          if (window.location.pathname !== '/login') {
             window.location.href = '/login?verified=true';
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
      const isSignupVerification = window.location.hash.includes('type=signup') 
                                || window.location.search.includes('verified=true');

      if (event === 'SIGNED_IN' && isSignupVerification) {
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          if (window.location.pathname !== '/login') {
             window.location.href = '/login?verified=true';
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
    await supabase.auth.signOut();
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
