'use client';

import { useState, useEffect } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user } = useAuth();

  // Auto-open on first visit
  useEffect(() => {
    const hasSeenFeedback = localStorage.getItem('feedback_widget_shown');
    if (!hasSeenFeedback) {
      // Small delay so the page loads first
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem('feedback_widget_shown', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) return;

    setIsSubmitting(true);

    try {
      const supabase = getSupabase();

      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id || null,
        name: name.trim() || null,
        comment: comment.trim(),
      });

      if (error) {
        console.error('Feedback error:', error);
        alert('Failed to send feedback. Please try again.');
      } else {
        setIsSuccess(true);
        setName('');
        setComment('');

        // Close after showing success
        setTimeout(() => {
          setIsSuccess(false);
          setIsOpen(false);
        }, 2500);
      }
    } catch (err) {
      console.error('Feedback error:', err);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Feedback Form Panel */}
      {isOpen && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <MessageSquarePlus className="w-5 h-5" />
              <span className="font-semibold">Feedback & Suggestions</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          {isSuccess ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-gray-800 text-lg mb-1">Thank You!</h3>
              <p className="text-gray-600 text-sm">Your feedback helps us improve Makos.ai</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                We&apos;d love to hear your thoughts! Share your feedback or suggestions.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Feedback <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What would you like to share with us?"
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300
          ${isOpen
            ? 'bg-gray-700 hover:bg-gray-800 text-white'
            : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white'
          }
        `}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageSquarePlus className="w-5 h-5" />
            <span className="font-medium text-sm">Feedback</span>
          </>
        )}
      </button>
    </div>
  );
}
