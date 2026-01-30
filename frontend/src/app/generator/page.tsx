'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { WorksheetForm } from '@/components/WorksheetForm';
import { WorksheetPreview } from '@/components/WorksheetPreview';
import { Worksheet, WorksheetGeneratorInput } from '@/lib/types';
import { generateWorksheet } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { getUserCredits, UserCredits, PLANS, useCredits, getWorksheetCreditCost } from '@/lib/credits';
import { ArrowLeft, RefreshCw, Sparkles, Save, Download, Printer, Eye, Target, CreditCard } from 'lucide-react';

function GeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const initialTopic = searchParams.get('topic') || '';

  // Focus mode parameters - for practicing mistakes
  const focusMode = searchParams.get('focus_mode') === 'mistakes';
  const focusMistakes = searchParams.get('mistakes') || '';
  const focusSubject = searchParams.get('subject') || '';
  const focusGradeLevel = searchParams.get('grade_level') || '';
  const focusDifficulty = searchParams.get('difficulty') || '';
  const focusLanguage = searchParams.get('language') || '';
  const originalWorksheetId = searchParams.get('original_worksheet_id') || '';

  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);

  // Fetch user credits
  useEffect(() => {
    if (user?.id) {
      getUserCredits(user.id).then(setUserCredits);
    }
  }, [user?.id]);

  const generationSteps = [
    { label: 'Analyzing your requirements...', icon: '🔍' },
    { label: 'Generating questions...', icon: '✨' },
    { label: 'Adding images and visuals...', icon: '🖼️' },
    { label: 'Verifying answer accuracy...', icon: '🔬' },
    { label: 'Finalizing worksheet...', icon: '📄' },
  ];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/generator');
    }
  }, [user, authLoading, router]);

  const handleGenerate = async (input: WorksheetGeneratorInput) => {
    if (!user) {
      setError('Please log in to generate worksheets.');
      return;
    }

    // Calculate credit cost
    const creditCost = getWorksheetCreditCost(input.question_count, input.grade_level);

    // Check if user has enough credits
    if (!userCredits || userCredits.credits < creditCost) {
      setError(`Not enough credits. You need ${creditCost} credits but have ${userCredits?.credits || 0}. Please purchase more credits.`);
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);
    setError(null);

    // Simulate step progression
    const stepInterval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev < generationSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000);

    try {
      const result = await generateWorksheet(input, user.id);
      clearInterval(stepInterval);
      setGenerationStep(generationSteps.length - 1);

      // Deduct credits after successful generation
      const creditUsed = await useCredits(
        user.id,
        creditCost,
        `Worksheet: ${input.topic} (${input.question_count} questions)`
      );

      if (creditUsed) {
        // Refresh user credits display
        const updatedCredits = await getUserCredits(user.id);
        setUserCredits(updatedCredits);
      }

      setWorksheet(result);
      setIsGenerating(false);
      setGenerationStep(0);
    } catch (err) {
      clearInterval(stepInterval);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate worksheet';
      setError(errorMessage);
      // Don't immediately hide - let user see the error on loading screen
      // isGenerating will be set to false when user dismisses
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pattern">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleReset = () => {
    setWorksheet(null);
    setError(null);
  };

  const handleTitleChange = (newTitle: string) => {
    if (worksheet) {
      setWorksheet({ ...worksheet, title: newTitle });
    }
  };

  return (
    <div className="min-h-screen bg-pattern">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="mb-10">
            {worksheet ? (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 font-semibold mb-4 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Create New Worksheet
            </button>
          ) : focusMode ? (
            /* Focus Mode Header - Practicing Mistakes */
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Target className="w-4 h-4" />
                Practice Mode
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
                <span className="text-slate-800">Focus on </span>
                <span className="text-orange-600">Your Mistakes</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                We&apos;ll generate questions similar to the ones you got wrong. Practice makes perfect!
              </p>
              <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm">
                <span className="font-semibold">Focusing on:</span>
                <span className="truncate max-w-[300px]">{focusMistakes.substring(0, 100)}...</span>
              </div>
            </div>
          ) : (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Sparkles className="w-4 h-4" />
                AI-Powered
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
                <span className="text-slate-800">Create Your </span>
                <span className="text-teal-600">Worksheet</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Fill in the details below and let our AI generate an engaging worksheet for your students.
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-semibold px-4 py-2 hover:bg-red-100 rounded-xl transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {worksheet ? (
          /* Preview Mode */
          <div className="animate-fade-in-up">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{worksheet.title}</h2>
                  <p className="opacity-90">
                    {worksheet.questions?.length || 0} questions • {worksheet.difficulty} • Grade {worksheet.grade_level}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/worksheet/${worksheet.id}`}
                  className="bg-white text-teal-600 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-teal-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
                <button
                  onClick={handleReset}
                  className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Another
                </button>
              </div>
            </div>

            <div className="card p-8">
              <WorksheetPreview
                worksheet={worksheet}
                onTitleChange={handleTitleChange}
              />
            </div>
          </div>
        ) : (
          /* Form Mode */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="card p-8">
                <WorksheetForm
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  initialTopic={initialTopic}
                  focusMode={focusMode}
                  focusMistakes={focusMistakes}
                  initialSubject={focusSubject}
                  initialGradeLevel={focusGradeLevel}
                  initialDifficulty={focusDifficulty}
                  initialLanguage={focusLanguage}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tips Card */}
              <div className="card p-6 border-l-4 border-l-teal-500">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <span className="text-2xl">💡</span>
                  Pro Tips
                </h3>
                <ul className="space-y-4 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-teal-600 text-xs font-bold">1</span>
                    </div>
                    <span>Be specific with your topic for more relevant questions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-teal-600 text-xs font-bold">2</span>
                    </div>
                    <span>Mix question types to keep students engaged</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-teal-600 text-xs font-bold">3</span>
                    </div>
                    <span>Use special instructions for custom requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-teal-600 text-xs font-bold">4</span>
                    </div>
                    <span>Review and edit generated content before sharing</span>
                  </li>
                </ul>
              </div>

              {/* Popular Topics */}
              <div className="card p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <span className="text-2xl">🔥</span>
                  Popular Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Photosynthesis',
                    'Fractions',
                    'World War II',
                    'Solar System',
                    'Grammar',
                    'Chemistry',
                    'Geography',
                    'Literature',
                  ].map((t, i) => (
                    <Link
                      key={i}
                      href={`/generator?topic=${encodeURIComponent(t)}`}
                      className="px-4 py-2 bg-gray-100 hover:bg-teal-100 hover:text-teal-700 rounded-full text-sm font-medium transition-all hover:scale-105"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Credits Info */}
              <div className={`card p-6 ${
                userCredits?.plan === 'free'
                  ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-amber-200/50'
                  : 'bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-50 border-teal-200/50'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    userCredits?.plan === 'free' ? 'bg-amber-200' : 'bg-teal-200'
                  }`}>
                    <CreditCard className={`w-5 h-5 ${
                      userCredits?.plan === 'free' ? 'text-amber-700' : 'text-teal-700'
                    }`} />
                  </div>
                  <h3 className={`font-bold text-lg ${
                    userCredits?.plan === 'free' ? 'text-amber-800' : 'text-teal-800'
                  }`}>
                    {userCredits?.plan ? PLANS[userCredits.plan as keyof typeof PLANS]?.name || 'Free Plan' : 'Free Plan'}
                  </h3>
                </div>
                <p className={`text-sm mb-4 ${
                  userCredits?.plan === 'free' ? 'text-amber-700' : 'text-teal-700'
                }`}>
                  You have <span className={`font-bold ${
                    userCredits?.plan === 'free' ? 'text-amber-900' : 'text-teal-900'
                  }`}>{userCredits?.credits ?? '...'} credits</span> remaining.
                  <span className="block text-xs mt-1 opacity-75">Cost varies by question count & grade level.</span>
                </p>
                {userCredits?.plan === 'free' && (
                  <Link
                    href="/pricing"
                    className="block w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all text-center shadow-lg shadow-amber-200"
                  >
                    Upgrade to Pro
                  </Link>
                )}
                {userCredits?.plan !== 'free' && (
                  <Link
                    href="/pricing"
                    className="block w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all text-center shadow-lg shadow-teal-200"
                  >
                    Get More Credits
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay with Steps */}
        {isGenerating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-10 max-w-md mx-4 text-center shadow-2xl animate-scale-in">
              {error ? (
                /* Error State */
                <>
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="relative w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                      <span className="text-4xl">❌</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Generation Failed</h3>
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                    <p className="text-red-700 font-medium text-sm">{error}</p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setError(null);
                        setIsGenerating(false);
                        setGenerationStep(0);
                        // Scroll to form for retry
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        setIsGenerating(false);
                        setGenerationStep(0);
                      }}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <p className="text-xs text-gray-400">
                      If the problem persists, please check your internet connection or try again later.
                    </p>
                  </div>
                </>
              ) : (
                /* Loading State */
                <>
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-teal-200 rounded-full animate-ping opacity-30"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                      <span className="text-4xl">{generationSteps[generationStep]?.icon || '✨'}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Creating Your Worksheet</h3>

                  {/* Steps List */}
                  <div className="space-y-3 mb-6 text-left">
                    {generationSteps.map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          index === generationStep
                            ? 'bg-teal-50 border-2 border-teal-200'
                            : index < generationStep
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-100 opacity-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                          index === generationStep
                            ? 'bg-teal-100 animate-pulse'
                            : index < generationStep
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}>
                          {index < generationStep ? '✓' : step.icon}
                        </div>
                        <span className={`font-medium ${
                          index === generationStep
                            ? 'text-teal-700'
                            : index < generationStep
                            ? 'text-green-700'
                            : 'text-gray-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${((generationStep + 1) / generationSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-4">This usually takes 30-40 seconds...</p>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-pattern">
        <div className="text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-teal-600 animate-pulse" />
          </div>
          <p className="text-gray-600 font-medium">Loading generator...</p>
        </div>
      </div>
    }>
      <GeneratorContent />
    </Suspense>
  );
}
