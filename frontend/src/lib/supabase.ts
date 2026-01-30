import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create browser client function
function createSupabaseClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton for client-side
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: create new instance each time
    return createSupabaseClient();
  }
  // Client-side: use singleton
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

// Singleton getter for supabase client
export const getSupabase = () => supabase;
