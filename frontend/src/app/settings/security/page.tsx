'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/AuthContext';
import {
  ArrowLeft,
  Shield,
  Key,
  Smartphone,
  Mail,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/settings/security');
    }
  }, [user, loading, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setChangingPassword(true);

    // Simulate API call - in production, this would call Supabase's updateUser
    setTimeout(() => {
      setChangingPassword(false);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }, 1500);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isOAuthUser = user.app_metadata?.provider === 'google';

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
          <h1 className="text-3xl font-bold text-gray-900">Security</h1>
          <p className="text-gray-600 mt-1">Manage your password and account security settings</p>
        </div>

        {/* Email Verification */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Email Address</h2>
              <p className="text-gray-500 mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {user.email_confirmed_at ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Not verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Key className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Password</h2>
              <p className="text-gray-500">
                {isOAuthUser
                  ? 'You signed up with Google. No password is set for this account.'
                  : 'Change your password to keep your account secure'}
              </p>
            </div>
          </div>

          {!isOAuthUser && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordMessage && (
                <div className={`p-4 rounded-xl ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {passwordMessage.type === 'success'
                      ? <CheckCircle className="w-4 h-4" />
                      : <AlertCircle className="w-4 h-4" />}
                    {passwordMessage.text}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Two-Factor Auth (Coming Soon) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 opacity-75">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">
                  Coming Soon
                </span>
              </div>
              <p className="text-gray-500 mt-1">
                Add an extra layer of security to your account with two-factor authentication
              </p>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-gray-100 text-gray-400 font-semibold rounded-xl cursor-not-allowed"
            >
              Enable
            </button>
          </div>
        </div>

        {/* Login Activity (Coming Soon) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mt-6 opacity-75">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Login Activity</h2>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">
              Coming Soon
            </span>
          </div>
          <p className="text-gray-500">
            View your recent login history and active sessions across devices
          </p>
        </div>
      </main>
    </div>
  );
}



