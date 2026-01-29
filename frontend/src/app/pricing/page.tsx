'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/AuthContext';
import { PLANS, CREDIT_PACKS, getUserCredits, UserCredits } from '@/lib/credits';
import { Check, Sparkles, Zap, Crown, Rocket, CreditCard, Lock } from 'lucide-react';
import { useModal } from '@/components/Modal';

// Polar.sh Product IDs
const polarProductIds = {
  subscriptions: {
    monthly: {
      starter: '244da7c4-b810-494c-b712-bb34d7adff77',
      pro: '7d235520-3239-4823-91c5-cdf069882a29',
      ultra: '2a031eef-64db-48cd-ba07-e50680d2c42b',
    },
    yearly: {
      starter: '41f1d15e-329d-4adc-8fdc-30b1962d23f7',
      pro: '81b9d8f3-e101-41b8-8014-5f627aea60d6',
      ultra: '0c6bc052-2a24-429c-ac56-6643d0fd3fed',
    },
  },
  creditPacks: {
    credits_10: 'f4b49fe8-8975-4f19-9f54-a49be6d19b25',
    credits_20: '5fc143c8-6af1-4bb5-ab18-8350a9919a9c',
    credits_50: 'ac8db116-617c-4686-afd4-8f0667d1ce83',
    credits_100: 'e9c6ee59-2b45-4c27-b32a-422f75134edd',
  },
};

export default function PricingPage() {
  const { user } = useAuth();
  const { showWarning, showError } = useModal();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);

  // Check if user has an active subscription (not free)
  const hasActiveSubscription = userCredits && userCredits.plan !== 'free';

  useEffect(() => {
    const fetchUserCredits = async () => {
      if (user) {
        const credits = await getUserCredits(user.id);
        setUserCredits(credits);
      }
      setLoadingCredits(false);
    };
    fetchUserCredits();
  }, [user]);

  const planIcons: Record<keyof typeof PLANS, typeof Sparkles> = {
    free: Sparkles,
    starter: Zap,
    pro: Crown,
    ultra: Rocket,
  };

  const planColors: Record<keyof typeof PLANS, string> = {
    free: 'from-gray-400 to-gray-600',
    starter: 'from-blue-400 to-blue-600',
    pro: 'from-purple-400 to-purple-600',
    ultra: 'from-amber-400 to-orange-500',
  };

  const planFeatures: Record<keyof typeof PLANS, string[]> = {
    free: [
      '5 credits per month',
      'All question types',
      'PDF & HTML export',
      'Basic support',
    ],
    starter: [
      '100 credits per month',
      'All question types',
      'PDF & HTML export',
      'Priority support',
      'No watermark',
    ],
    pro: [
      '200 credits per month',
      'All question types',
      'PDF & HTML export',
      'Priority support',
      'No watermark',
      'Answer key customization (coming soon)',
    ],
    ultra: [
      '400 credits per month',
      'All question types',
      'PDF & HTML export',
      'Priority support',
      'No watermark',
      'Answer key customization (coming soon)',
      'Team sharing (coming soon)',
    ],
  };

  const getMonthlyEquivalent = (yearlyPrice: number) => {
    return (yearlyPrice / 12).toFixed(2);
  };

  const handleSubscribe = (planKey: string) => {
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    if (planKey === 'free') {
      window.location.href = '/generator';
      return;
    }

    const plan = PLANS[planKey as keyof typeof PLANS];
    const period = billingPeriod === 'yearly' ? 'yearly' : 'monthly';
    const subscriptionIds = polarProductIds.subscriptions[period];
    const productId = subscriptionIds[planKey as keyof typeof subscriptionIds];

    if (!productId) {
      showWarning('This plan is not yet available. Please try again later.', 'Plan Unavailable');
      return;
    }

    // Redirect to Polar checkout
    const checkoutUrl = `/api/checkout?products=${productId}&customerEmail=${encodeURIComponent(user.email || '')}&metadata=${encodeURIComponent(JSON.stringify({
      user_id: user.id,
      credits: plan.credits.toString(),
      product_type: 'subscription',
      plan: planKey,
      billing_period: period,
    }))}`;

    window.location.href = checkoutUrl;
  };

  const handleBuyCredits = (credits: number, price: number, priceId: string) => {
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    // Check if user has an active subscription
    if (!hasActiveSubscription) {
      showWarning('Credit packs are only available to subscribers. Please subscribe to a plan first.', 'Subscription Required');
      return;
    }

    const packKey = priceId as keyof typeof polarProductIds.creditPacks;
    const productId = polarProductIds.creditPacks[packKey];

    if (!productId) {
      showWarning('This credit pack is not yet available. Please try again later.', 'Pack Unavailable');
      return;
    }

    // Redirect to Polar checkout
    const checkoutUrl = `/api/checkout?products=${productId}&customerEmail=${encodeURIComponent(user.email || '')}&metadata=${encodeURIComponent(JSON.stringify({
      user_id: user.id,
      credits: credits.toString(),
      product_type: 'credits',
    }))}`;

    window.location.href = checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that works for you. All plans include access to our AI-powered worksheet generator.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                billingPeriod === 'yearly' ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-1.5 text-xs text-green-600 font-semibold">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => {
            const Icon = planIcons[key];
            const isPro = key === 'pro';

            return (
              <div
                key={key}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
                  isPro ? 'border-purple-400 scale-105' : 'border-gray-100'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="p-6">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${planColors[key]} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Name & Price */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    {billingPeriod === 'monthly' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                        {plan.price > 0 && <span className="text-gray-500">/mo</span>}
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">${getMonthlyEquivalent(plan.yearlyPrice)}</span>
                        {plan.yearlyPrice > 0 && <span className="text-gray-500">/mo</span>}
                      </>
                    )}
                  </div>

                  {billingPeriod === 'yearly' && plan.yearlyPrice > 0 && (
                    <p className="text-xs text-gray-400 -mt-2 mb-4">
                      ${plan.yearlyPrice} billed yearly
                    </p>
                  )}

                  {/* Credits */}
                  <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-primary">
                    <CreditCard className="w-5 h-5" />
                    {plan.credits} credits/month
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(key)}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      key === 'free'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : isPro
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {key === 'free' ? 'Get Started' : 'Subscribe'}
                  </button>

                  {/* Features */}
                  <ul className="mt-6 space-y-3">
                    {planFeatures[key].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Credit Packs - Only for subscribers */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Need more credits?</h2>
            <p className="text-gray-600">Buy credit packs anytime - they never expire!</p>
          </div>

          {hasActiveSubscription ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.credits}
                  onClick={() => handleBuyCredits(pack.credits, pack.price, pack.priceId)}
                  className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-primary hover:shadow-lg transition-all text-center group"
                >
                  <div className="text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                    {pack.credits}
                  </div>
                  <div className="text-sm text-gray-500 mb-3">credits</div>
                  <div className="text-xl font-semibold text-primary">
                    ${pack.price}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    ${(pack.price / pack.credits).toFixed(2)}/credit
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="max-w-xl mx-auto bg-gray-50 rounded-2xl p-8 border-2 border-dashed border-gray-200 text-center">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Credit packs are exclusive to subscribers
              </h3>
              <p className="text-gray-500 mb-4">
                Subscribe to any plan above to unlock the ability to purchase extra credit packs at discounted rates.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <span className="line-through">$3.99 - $32.99</span>
                <span>•</span>
                <span>10 - 100 credits</span>
              </div>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'What is a credit?',
                a: 'One credit allows you to generate one standard worksheet (up to 15 questions). Worksheets with images (Kindergarten-2nd Grade) or more than 15 questions use 2 credits.',
              },
              {
                q: 'Do unused credits roll over?',
                a: 'Monthly subscription credits reset each billing period. However, purchased credit packs never expire!',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! You can cancel your subscription at any time. You\'ll keep access until the end of your billing period.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, PayPal, and Apple Pay through our payment partner Polar.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">Ready to create amazing worksheets?</p>
          <Link
            href={user ? '/generator' : '/signup'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            {user ? 'Start Creating' : 'Get Started Free'}
          </Link>
        </div>
      </main>
    </div>
  );
}
