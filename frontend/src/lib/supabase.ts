import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Server-side: create new instance each time
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  // Client-side: use singleton
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
})();

// Singleton getter for supabase client
export const getSupabase = () => supabase;
