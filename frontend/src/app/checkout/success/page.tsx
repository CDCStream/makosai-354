'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { trackPurchase } from '@/lib/gtag';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get('checkout_id');

  useEffect(() => {
    // Track Google Ads conversion for purchase
    // Only track once per checkout
    const purchaseTracked = sessionStorage.getItem(`purchase_tracked_${checkoutId}`);
    if (!purchaseTracked) {
      trackPurchase(1.0, checkoutId || undefined);
      if (checkoutId) {
        sessionStorage.setItem(`purchase_tracked_${checkoutId}`, 'true');
      }
    }
  }, [checkoutId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl">
        <CheckCircle className="mx-auto h-20 w-20 text-green-500" />
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Payment Successful!</h1>
        <p className="mt-4 text-gray-600">
          Thank you for your purchase. Your credits have been added to your account.
        </p>
        <div className="mt-8 space-y-4">
          <Link
            href="/generator"
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Start Creating Worksheets
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
