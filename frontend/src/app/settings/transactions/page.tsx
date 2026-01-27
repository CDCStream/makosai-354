'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/AuthContext';
import { getCreditTransactions, CreditTransaction } from '@/lib/credits';
import {
  ArrowLeft,
  Receipt,
  Plus,
  Minus,
  CreditCard,
  Gift,
  RefreshCw,
  FileText,
  Calendar,
  Filter
} from 'lucide-react';

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [filter, setFilter] = useState<'all' | 'usage' | 'purchase' | 'subscription' | 'bonus'>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/settings/transactions');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (user) {
        const txns = await getCreditTransactions(user.id);
        setTransactions(txns);
        setLoadingTransactions(false);
      }
    };
    fetchTransactions();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(t => t.type === filter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'usage': return FileText;
      case 'purchase': return CreditCard;
      case 'subscription': return RefreshCw;
      case 'bonus': return Gift;
      default: return Receipt;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'usage': return 'bg-red-100 text-red-600';
      case 'purchase': return 'bg-blue-100 text-blue-600';
      case 'subscription': return 'bg-purple-100 text-purple-600';
      case 'bonus': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'usage': return 'Usage';
      case 'purchase': return 'Purchase';
      case 'subscription': return 'Subscription';
      case 'bonus': return 'Bonus';
      default: return type;
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'usage', label: 'Usage' },
    { value: 'purchase', label: 'Purchases' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'bonus', label: 'Bonuses' },
  ];

  // Calculate totals
  const totalEarned = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalUsed = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600 mt-1">View your credit purchases and usage history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Credits Earned</p>
                <p className="text-2xl font-bold text-green-600">+{totalEarned}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Minus className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Credits Used</p>
                <p className="text-2xl font-bold text-red-600">-{totalUsed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as typeof filter)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loadingTransactions ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-3">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No transactions found</h3>
              <p className="text-gray-500 text-sm">
                {filter === 'all'
                  ? 'Your transaction history will appear here'
                  : `No ${filter} transactions found`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTransactions.map((transaction) => {
                const TypeIcon = getTypeIcon(transaction.type);
                const isPositive = transaction.amount > 0;

                return (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(transaction.type)}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(transaction.type)}`}>
                            {getTypeLabel(transaction.type)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(transaction.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{transaction.amount}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



