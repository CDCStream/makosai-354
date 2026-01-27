'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, User, LogOut, FileText, Settings, ChevronDown, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getUserCredits, UserCredits } from '@/lib/credits';

interface HeaderProps {
  showAuth?: boolean;
  transparent?: boolean;
}

export function Header({ showAuth = true, transparent = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);

  useEffect(() => {
    if (user?.id) {
      getUserCredits(user.id).then(setCredits);
    }
  }, [user?.id]);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${transparent ? 'bg-transparent' : 'navbar'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="Makos.ai"
              className="h-20 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/generator"
              className="px-4 py-2 text-gray-700 hover:text-teal-600 hover:bg-teal-50 font-semibold rounded-xl transition-all"
            >
              Create Worksheet
            </Link>
            {user && (
              <Link
                href="/my-worksheets"
                className="px-4 py-2 text-gray-700 hover:text-teal-600 hover:bg-teal-50 font-semibold rounded-xl transition-all"
              >
                My Worksheets
              </Link>
            )}
            <Link
              href="/pricing"
              className="px-4 py-2 text-gray-700 hover:text-teal-600 hover:bg-teal-50 font-semibold rounded-xl transition-all"
            >
              Pricing
            </Link>
          </nav>

          {/* Right Side: Auth */}
          <div className="hidden md:flex items-center gap-3">
            {showAuth && !loading && (
              <>
                {user ? (
                  <>
                    {/* Credits Badge */}
                    <Link
                      href="/pricing"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-full hover:from-amber-100 hover:to-amber-200 transition-all"
                    >
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-700">
                        {credits?.credits ?? '...'} credits
                      </span>
                    </Link>

                    <div className="relative">
                      <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-scale-in">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-semibold text-gray-900">{user.user_metadata?.full_name || 'My Account'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <Link
                          href="/my-worksheets"
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <FileText className="w-5 h-5" />
                          My Worksheets
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-5 h-5" />
                          Settings
                        </Link>
                        <Link
                          href="/settings/billing"
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <CreditCard className="w-5 h-5" />
                          Billing
                        </Link>
                        <hr className="my-2 border-gray-100" />
                        <button
                          onClick={() => {
                            signOut();
                            setUserMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                          <LogOut className="w-5 h-5" />
                          Sign Out
                        </button>
                      </div>
                    )}
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-4 py-2 text-gray-700 hover:text-teal-600 font-semibold transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/login"
                      className="btn-primary text-sm py-3 px-6"
                    >
                      Try for free
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
            </div>
          </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fade-in">
          <div className="px-4 py-6 space-y-2">
            <Link
              href="/generator"
              className="block px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-600 font-semibold rounded-xl transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Create Worksheet
            </Link>
            {user && (
              <Link
                href="/my-worksheets"
                className="block px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-600 font-semibold rounded-xl transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Worksheets
              </Link>
            )}
            <Link
              href="/pricing"
              className="block px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-600 font-semibold rounded-xl transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>

            {showAuth && !loading && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {user ? (
                  <>
                    <div className="px-4 py-2 text-sm text-gray-500">
                      Signed in as {user.email}
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full py-3 text-center text-red-600 font-semibold hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block py-3 text-center text-gray-700 font-semibold hover:text-teal-600 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/login"
                      className="block py-3 text-center btn-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Try for free
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
