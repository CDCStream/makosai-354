'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CallbackHandlePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full URL including hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        // Check for error in URL
        const urlError = hashParams.get('error') || queryParams.get('error');
        if (urlError) {
          const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
          setError(errorDescription || urlError);
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Try to get session - detectSessionInUrl should handle the code exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        if (session) {
          // Already have a session, redirect to home
          router.push('/');
          return;
        }

        // If no session yet, try exchanging the code manually
        const code = queryParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Exchange error:', exchangeError);
            setError(exchangeError.message);
            setTimeout(() => router.push('/login'), 2000);
            return;
          }
        }

        // Success - redirect to home
        router.push('/');
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
      <div className="text-center">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to login...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}
