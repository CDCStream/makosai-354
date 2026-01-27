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
import { getUserCredits, useCredits, getWorksheetCreditCost, UserCredits, PLANS } from '@/lib/credits';
import { ArrowLeft, RefreshCw, Sparkles, Save, Download, Printer, Eye, AlertCircle } from 'lucide-react';

function GeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const initialTopic = searchParams.get('topic') || '';

  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [currentGradeLevel, setCurrentGradeLevel] = useState<string>('');
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);

  // Fetch user credits
  useEffect(() => {
    const fetchCredits = async () => {
      if (user) {
        const credits = await getUserCredits(user.id);
        setUserCredits(credits);
      }
    };
    fetchCredits();
  }, [user]);

  // Helper to check if grade is early (Kindergarten, 1st, 2nd)
  const isEarlyGrade = (grade: string) => {
    const lower = grade.toLowerCase();
    return lower === 'k' || lower === 'kindergarten' || lower === '1' || lower === '1st grade' || lower === '2' || lower === '2nd grade';
  };

  // Dynamic generation steps based on grade level
  const getGenerationSteps = (gradeLevel: string) => {
    if (isEarlyGrade(gradeLevel)) {
      // Kindergarten/Early grades: includes Unsplash images
      return [
        { label: 'Analyzing your requirements...', icon: '🔍' },
        { label: 'Generating questions...', icon: '✨' },
        { label: 'Adding colorful images...', icon: '🖼️' },
        { label: 'Creating diagrams if needed...', icon: '📐' },
        { label: 'Verifying answer accuracy...', icon: '✅' },
        { label: 'Finalizing worksheet...', icon: '📄' },
      ];
    } else {
      // Higher grades - diagrams for geometry/circuits
      return [
        { label: 'Analyzing your requirements...', icon: '🔍' },
        { label: 'Generating questions...', icon: '✨' },
        { label: 'Formatting content...', icon: '📝' },
        { label: 'Creating diagrams if needed...', icon: '📐' },
        { label: 'Verifying answer accuracy...', icon: '✅' },
        { label: 'Finalizing worksheet...', icon: '📄' },
      ];
    }
  };

  const generationSteps = getGenerationSteps(currentGradeLevel);

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

    // Calculate credit cost based on subject/topic and question count
    const creditCost = getWorksheetCreditCost(input.subject, input.topic, input.question_count);

    // Check if user has enough credits
    const userCredits = await getUserCredits(user.id);
    if (!userCredits || userCredits.credits < creditCost) {
      setError(`You need ${creditCost} credit${creditCost > 1 ? 's' : ''} for this worksheet. You have ${userCredits?.credits || 0} credits. Please upgrade your plan or purchase more credits.`);
      return;
    }

    // Set grade level for dynamic steps
    setCurrentGradeLevel(input.grade_level);
    setIsGenerating(true);
    setGenerationStep(0);
    setError(null);

    try {
      // Use streaming with progress callback
      const result = await generateWorksheet(
        input,
        user.id,
        (step: number, message: string) => {
          // Update step based on backend progress
          console.log(`Progress: Step ${step} - ${message}`);
          setGenerationStep(step);
        }
      );

      // Deduct credits after successful generation
      const creditUsed = await useCredits(
        user.id,
        creditCost,
        `Generated worksheet: ${input.topic} (${input.subject})`
      );

      if (creditUsed) {
        // Refresh credits display
        const updatedCredits = await getUserCredits(user.id);
        setUserCredits(updatedCredits);
      } else {
        console.warn('Failed to deduct credits, but worksheet was generated');
      }

      setGenerationStep(getGenerationSteps(input.grade_level).length - 1);

      // Debug: Check if images are present
      console.log('📊 Worksheet generated:', result.id);
      console.log('📊 Questions with images:', result.questions.filter(q => q.image).length);
      result.questions.forEach((q, i) => {
        if (q.image) {
          console.log(`📊 Q${i+1} image (first 100 chars):`, q.image.substring(0, 100));
        }
      });

      setWorksheet(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate worksheet');
    } finally {
      setIsGenerating(false);
      setGenerationStep(0);
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
              <div className="card p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-amber-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                  </div>
                  <h3 className="font-bold text-amber-800 text-lg capitalize">
                    {userCredits?.plan || 'Free'} Plan
                  </h3>
                </div>
                <p className="text-sm text-amber-700 mb-4">
                  You have <span className="font-bold text-amber-900">{userCredits?.credits ?? 0} credits</span> remaining.
                </p>
                <Link
                  href="/pricing"
                  className="block w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all text-center shadow-lg shadow-amber-200"
                >
                  {userCredits?.plan === 'free' ? 'Upgrade to Pro' : 'Get More Credits'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay with Steps OR Error */}
        {(isGenerating || (error && !worksheet)) && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-10 max-w-md mx-4 text-center shadow-2xl animate-scale-in">

              {/* Error State */}
              {error ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-4xl">❌</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Generation Failed</h3>
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 text-left">
                    <p className="text-red-700 font-medium text-sm">{error}</p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => setError(null)}
                      className="w-full bg-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-teal-700 transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        router.push('/');
                      }}
                      className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Go Home
                    </button>
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
                  <p className="text-sm text-gray-400 mt-4">This usually takes 10-20 seconds...</p>
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
