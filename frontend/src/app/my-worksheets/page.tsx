'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Worksheet } from '@/lib/types';
import { fetchWorksheets, deleteWorksheet } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Search, FileText, Trash2, Eye, Play, Plus, Download, Trophy, ChevronDown, Target } from 'lucide-react';
import { exportToHtml, exportToPdf } from '@/lib/export';
import { useModal } from '@/components/Modal';

interface IncorrectQuestion {
  question: string;
  type: string;
  correctAnswer: string;
}

interface QuizResult {
  score: number;
  correct: number;
  total: number;
  timeTaken: number;
  completedAt: string;
  incorrectQuestions?: IncorrectQuestion[];
}

interface QuizResults {
  [worksheetId: string]: QuizResult;
}

export default function MyWorksheetsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showConfirm, showError } = useModal();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [quizResults, setQuizResults] = useState<QuizResults>({});
  const [exportDropdownId, setExportDropdownId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadWorksheets = async () => {
      if (!user) return;

      try {
        const data = await fetchWorksheets(user.id);
        setWorksheets(data);

        // Load quiz results from localStorage
        const savedResults = localStorage.getItem('quizResults');
        if (savedResults) {
          setQuizResults(JSON.parse(savedResults));
        }
      } catch (err) {
        setError('Failed to load worksheets.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadWorksheets();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (exportDropdownId) {
        setExportDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [exportDropdownId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = (id: string) => {
    showConfirm(
      'Are you sure you want to delete this worksheet? This action cannot be undone.',
      async () => {
      try {
        await deleteWorksheet(id, user?.id);
        setWorksheets(prev => prev.filter(ws => ws.id !== id));
      } catch (err) {
          showError('Failed to delete worksheet.');
        console.error(err);
      }
      },
      'Delete Worksheet',
      'Delete',
      'Cancel'
    );
  };

  const handleExportHtml = (worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both') => {
    exportToHtml(worksheet, content);
    setExportDropdownId(null);
  };

  const handlePracticeMistakes = (worksheet: Worksheet) => {
    const quizResult = quizResults[worksheet.id];
    if (!quizResult?.incorrectQuestions?.length) return;

    // Build a focused practice prompt from incorrect questions
    const mistakesSummary = quizResult.incorrectQuestions
      .map(q => `${q.question.substring(0, 80)} (Type: ${q.type})`)
      .join('; ');

    // Get question types from mistakes
    const mistakeTypes = [...new Set(quizResult.incorrectQuestions.map(q => q.type))];

    // Navigate to generator with pre-filled data
    const params = new URLSearchParams({
      subject: worksheet.subject,
      topic: `Practice: ${worksheet.topic} - Focus on Mistakes`,
      grade_level: worksheet.grade_level,
      difficulty: worksheet.difficulty,
      language: worksheet.language,
      focus_mode: 'mistakes',
      mistakes: mistakesSummary.substring(0, 800),
      mistake_count: quizResult.incorrectQuestions.length.toString(),
      mistake_types: mistakeTypes.join(','),
      original_worksheet_id: worksheet.id,
    });

    router.push(`/generator?${params.toString()}`);
  };

  const handleExportPdf = (worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both') => {
    exportToPdf(worksheet, content);
    setExportDropdownId(null);
  };

  const toggleExportDropdown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExportDropdownId(exportDropdownId === id ? null : id);
  };

  // Get unique subjects for filter
  const subjects = Array.from(new Set(worksheets.map(w => w.subject)));

  const filteredWorksheets = worksheets.filter(ws => {
    const matchesSearch = ws.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ws.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || ws.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Worksheets</h1>
            <p className="text-gray-500 mt-1">Manage and export your created worksheets</p>
          </div>
          <Link href="/generator" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Worksheet
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative sm:flex-1 sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search worksheets..."
              className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900 w-full sm:w-40"
          >
            <option value="all">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>
                {subject.charAt(0).toUpperCase() + subject.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Worksheets Grid */}
        {filteredWorksheets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No worksheets found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterSubject !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first worksheet to get started'}
            </p>
            <Link href="/generator" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Worksheet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorksheets.map(ws => (
              <div key={ws.id} className="card p-6 flex flex-col hover:shadow-lg transition-shadow">
                <div className="mb-3">
                  <h2 className="text-lg font-bold text-gray-900 line-clamp-2">{ws.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{ws.topic}</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                    {ws.subject}
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                    Grade {ws.grade_level}
                  </span>
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded">
                    {ws.difficulty}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  {ws.questions?.length || 0} questions • {ws.language.toUpperCase()}
                </p>

                {/* Quiz Score */}
                {quizResults[ws.id] && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl border mb-3 ${getScoreColor(quizResults[ws.id].score)}`}>
                    <Trophy className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">{quizResults[ws.id].score}/100</span>
                        <span className="text-xs opacity-75">
                          {quizResults[ws.id].correct}/{quizResults[ws.id].total} correct
                        </span>
                      </div>
                      <div className="text-xs opacity-75 mt-0.5">
                        ⏱️ {formatTime(quizResults[ws.id].timeTaken)} • {new Date(quizResults[ws.id].completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Practice Mistakes Button - Show only if there are wrong answers */}
                {quizResults[ws.id]?.incorrectQuestions && quizResults[ws.id].incorrectQuestions!.length > 0 && (
                  <button
                    onClick={() => handlePracticeMistakes(ws)}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md"
                  >
                    <Target className="w-4 h-4" />
                    Practice {quizResults[ws.id].incorrectQuestions!.length} Mistakes
                  </button>
                )}

                <div className="text-xs text-gray-400 mb-4">
                  Created: {new Date(ws.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100 items-stretch flex-nowrap">
                  <Link
                    href={`/worksheet/${ws.id}`}
                    className="flex-1 btn-secondary btn-sm flex items-center justify-center gap-1 min-w-0 h-9"
                  >
                    <Eye className="w-3 h-3 flex-shrink-0" /> <span className="truncate text-xs">View</span>
                  </Link>
                  <Link
                    href={`/worksheet/${ws.id}/fill`}
                    className="flex-1 btn-secondary btn-sm flex items-center justify-center gap-1 min-w-0 h-9"
                  >
                    <Play className="w-3 h-3 flex-shrink-0" /> <span className="truncate text-xs">Start</span>
                  </Link>
                  <div className="relative flex-shrink-0 h-9">
                    <button
                      onClick={(e) => toggleExportDropdown(e, ws.id)}
                      className="btn-secondary btn-sm flex items-center justify-center gap-1 px-3 h-full"
                      title="Export"
                    >
                      <Download className="w-3 h-3" />
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {exportDropdownId === ws.id && (
                      <div className="absolute bottom-full mb-2 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 min-w-[180px]">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">Export HTML</div>
                        <button
                          onClick={() => handleExportHtml(ws, 'questions')}
                          className="flex items-center gap-2 px-4 py-1.5 text-gray-700 hover:bg-gray-50 w-full text-left text-sm"
                        >
                          Only Questions
                        </button>
                        <button
                          onClick={() => handleExportHtml(ws, 'answer_key')}
                          className="flex items-center gap-2 px-4 py-1.5 text-gray-700 hover:bg-gray-50 w-full text-left text-sm"
                        >
                          Only Answer Key
                        </button>
                        <button
                          onClick={() => handleExportHtml(ws, 'both')}
                          className="flex items-center gap-2 px-4 py-1.5 text-gray-700 hover:bg-gray-50 w-full text-left text-sm"
                        >
                          Questions + Answers
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                          Export PDF
                          <span className="relative group">
                            <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                              <path strokeWidth="2" d="M12 16v-4M12 8h.01"/>
                            </svg>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Click &quot;Print&quot;, then select &quot;Save as PDF&quot; to download
                            </span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleExportPdf(ws, 'questions')}
                          className="flex items-center gap-2 px-4 py-1.5 text-gray-700 hover:bg-gray-50 w-full text-left text-sm"
                        >
                          Only Questions
                        </button>
                        <button
                          onClick={() => handleExportPdf(ws, 'answer_key')}
                          className="flex items-center gap-2 px-4 py-1.5 text-gray-700 hover:bg-gray-50 w-full text-left text-sm"
                        >
                          Only Answer Key
                        </button>
                        <button
                          onClick={() => handleExportPdf(ws, 'both')}
                          className="flex items-center gap-2 px-4 py-1.5 text-gray-700 hover:bg-gray-50 w-full text-left text-sm"
                        >
                          Questions + Answers
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(ws.id)}
                    className="btn-secondary btn-sm text-red-600 hover:bg-red-50 flex items-center justify-center px-3 flex-shrink-0 h-9"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

