'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { WorksheetPreview } from '@/components/WorksheetPreview';
import { Worksheet, Question } from '@/lib/types';
import { getWorksheet, saveWorksheet } from '@/lib/api';
import { ArrowLeft, Play, Share2, FileText, Download, Sparkles } from 'lucide-react';
import { exportToPdf, exportToHtml } from '@/lib/export';
import { useAuth } from '@/lib/AuthContext';
import { useModal } from '@/components/Modal';

function WorksheetDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { showSuccess, showError, ModalComponent } = useModal();

  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorksheet = async () => {
      try {
        const data = await getWorksheet(id, user?.id);
        if (data) {
          setWorksheet(data);
        } else {
          setError('Worksheet not found');
        }
      } catch (err) {
        setError('Failed to load worksheet');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadWorksheet();
    }
  }, [id, user?.id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: worksheet?.title || 'Worksheet',
          text: `Check out this worksheet: ${worksheet?.title}`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      showSuccess('Link copied to clipboard!', 'Copied');
    }
  };

  const handleQuestionsChange = (questions: Question[]) => {
    if (worksheet) {
      const updatedWorksheet = { ...worksheet, questions };
      setWorksheet(updatedWorksheet);
      // Save to localStorage
      saveWorksheet(updatedWorksheet);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (worksheet) {
      const updatedWorksheet = { ...worksheet, title: newTitle };
      setWorksheet(updatedWorksheet);
      // Save to localStorage
      saveWorksheet(updatedWorksheet);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !worksheet) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Worksheet not found'}
          </h1>
          <Link href="/my-worksheets" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to My Worksheets
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isLoggedIn={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/my-worksheets"
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Worksheets
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card overflow-hidden">
              <WorksheetPreview
                worksheet={worksheet}
                showActions={true}
                onTitleChange={handleTitleChange}
                onQuestionsChange={handleQuestionsChange}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Start Quiz Card */}
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Ready to Test?</h3>
                <p className="text-teal-100 text-sm mb-4">
                  Take this quiz online and get instant results!
                </p>
                <Link
                  href={`/worksheet/${worksheet.id}/fill`}
                  className="w-full bg-white text-teal-600 hover:bg-teal-50 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Quiz
                </Link>
              </div>
            </div>

            {/* Actions Card */}
            <div className="card p-6">
              <h3 className="font-bold text-gray-800 mb-4">Export & Share</h3>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    if (worksheet) {
                      try {
                        await exportToPdf(worksheet);
                      } catch (err) {
                        showError(err instanceof Error ? err.message : 'PDF export failed', 'Export Error');
                      }
                    }
                  }}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => exportToHtml(worksheet)}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export HTML
                </button>
                <button
                  onClick={handleShare}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Worksheet
                </button>
              </div>
            </div>

            {/* Details Card */}
            <div className="card p-6">
              <h3 className="font-bold text-gray-800 mb-4">Worksheet Details</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Topic</dt>
                  <dd className="font-medium text-gray-900">{worksheet.topic}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Subject</dt>
                  <dd className="font-medium text-gray-900 capitalize">{worksheet.subject}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Grade Level</dt>
                  <dd className="font-medium text-gray-900">Grade {worksheet.grade_level}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Difficulty</dt>
                  <dd className="font-medium text-gray-900 capitalize">{worksheet.difficulty}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Language</dt>
                  <dd className="font-medium text-gray-900">{worksheet.language.toUpperCase()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Questions</dt>
                  <dd className="font-medium text-gray-900">{worksheet.questions?.length || 0}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(worksheet.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tips Card */}
            <div className="card p-6 bg-blue-50 border-blue-100">
              <h3 className="font-bold text-blue-800 mb-3">💡 Pro Tip</h3>
              <p className="text-sm text-blue-700">
                Use the "Fill Online" feature to let students complete the worksheet digitally
                with instant scoring!
              </p>
            </div>
          </div>
        </div>
      </main>
      {ModalComponent}
    </div>
  );
}

export default function WorksheetDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <WorksheetDetailContent />
    </Suspense>
  );
}

