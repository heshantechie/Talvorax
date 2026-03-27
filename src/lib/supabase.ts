import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

// Wrap createClient in try/catch and use explicit fallback to avoid crashing on missing env vars
export const supabase = (() => {
  try {
    return createClient(
      supabaseUrl || 'https://placeholder.supabase.co', 
      supabaseAnonKey || 'placeholder'
    );
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null as any;
  }
})();
