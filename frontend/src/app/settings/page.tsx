'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/AuthContext';
import { getUserCredits, UserCredits, PLANS } from '@/lib/credits';
import {
  User,
  CreditCard,
  Receipt,
  Shield,
  ChevronRight,
  Mail,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/settings');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchCredits = async () => {
      if (user) {
        const credits = await getUserCredits(user.id);
        setUserCredits(credits);
        setLoadingCredits(false);
      }
    };
    fetchCredits();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPlan = userCredits?.plan || 'free';
  const planInfo = PLANS[currentPlan as keyof typeof PLANS];

  const menuItems = [
    {
      href: '/settings/billing',
      icon: CreditCard,
      title: 'Billing & Subscription',
      description: 'Manage your subscription, payment methods and billing info',
      color: 'from-purple-400 to-purple-600',
    },
    {
      href: '/settings/transactions',
      icon: Receipt,
      title: 'Transaction History',
      description: 'View your credit purchases and usage history',
      color: 'from-blue-400 to-blue-600',
    },
    {
      href: '/settings/security',
      icon: Shield,
      title: 'Security',
      description: 'Password, two-factor authentication and account security',
      color: 'from-green-400 to-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account, subscription and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <User className="w-10 h-10 text-white" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {user.user_metadata?.full_name || 'User'}
              </h2>

              <div className="flex items-center gap-2 text-gray-500 mt-1">
                <Mail className="w-4 h-4" />
                <span className="text-sm truncate">{user.email}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-500 mt-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Plan Badge */}
            <div className="flex-shrink-0">
              <div className={`px-4 py-2 rounded-xl ${
                currentPlan === 'ultra' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                currentPlan === 'pro' ? 'bg-gradient-to-r from-purple-400 to-purple-600 text-white' :
                currentPlan === 'starter' ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' :
                'bg-gray-100 text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">{planInfo?.name || 'Free'} Plan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Credits Info */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available Credits</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingCredits ? '...' : userCredits?.credits || 0}
                </p>
              </div>
              <Link
                href="/pricing"
                className={`px-4 py-2 font-semibold rounded-xl transition-colors ${
                  currentPlan === 'free'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {currentPlan === 'free' ? 'Upgrade Plan' : 'Get More Credits'}
              </Link>
            </div>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 truncate">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h3>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-red-700">Delete Account</h4>
                <p className="text-sm text-red-600">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button className="px-4 py-2 bg-white border border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

