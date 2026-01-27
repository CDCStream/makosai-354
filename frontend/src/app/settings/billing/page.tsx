'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/AuthContext';
import { getUserCredits, getCreditTransactions, PLANS, UserCredits, CreditTransaction } from '@/lib/credits';
import { CreditCard, Clock, ArrowUpRight, ArrowDownRight, Sparkles, ChevronRight, XCircle, Loader2 } from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const [credits, txns] = await Promise.all([
          getUserCredits(user.id),
          getCreditTransactions(user.id),
        ]);
        setUserCredits(credits);
        setTransactions(txns);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentPlan = userCredits?.plan || 'free';
  const planInfo = PLANS[currentPlan] || PLANS.free;
  const hasActiveSubscription = currentPlan !== 'free';

  const handleCancelSubscription = async () => {
    if (!user) return;

    setCanceling(true);
    setCancelError(null);

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setCancelSuccess(true);
      setShowCancelConfirm(false);

      // Refresh user credits
      const credits = await getUserCredits(user.id);
      setUserCredits(credits);
    } catch (error: any) {
      setCancelError(error.message);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Credits</h1>

        {/* Cancel Success Message */}
        {cancelSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-green-700 font-medium">
              ✓ Subscription canceled successfully. You've been moved to the Free plan.
            </p>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
            <Link
              href="/pricing"
              className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-sm"
            >
              {hasActiveSubscription ? 'Change Plan' : 'Upgrade Plan'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{planInfo.name}</h3>
                <p className="text-gray-500">
                  {planInfo.price === 0 ? 'Free forever' : `$${planInfo.price}/month`}
                </p>
              </div>
            </div>

            {hasActiveSubscription && !showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 font-medium mb-3">
                Are you sure you want to cancel your subscription?
              </p>
              <p className="text-red-600 text-sm mb-4">
                You'll keep your remaining credits, but won't receive monthly credits anymore.
              </p>
              {cancelError && (
                <p className="text-red-600 text-sm mb-3 bg-red-100 p-2 rounded">
                  Error: {cancelError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {canceling && <Loader2 className="w-4 h-4 animate-spin" />}
                  {canceling ? 'Canceling...' : 'Yes, Cancel'}
                </button>
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setCancelError(null);
                  }}
                  disabled={canceling}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Credits Balance */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Credit Balance</h2>
            <Link
              href="/pricing#credits"
              className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-sm"
            >
              Buy More Credits
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{userCredits?.credits ?? 0}</h3>
              <p className="text-gray-500">Available credits</p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Transaction History</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.amount > 0
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {tx.amount > 0 ? (
                        <ArrowDownRight className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount} credits
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
