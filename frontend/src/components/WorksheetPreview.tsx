'use client';

import { useState, useEffect } from 'react';
import { Worksheet, Question } from '@/lib/types';
import { Download, Printer, Share2, CheckCircle, BookOpen, FileText, Pencil, Check, X, Play, ChevronDown } from 'lucide-react';
import { useModal } from '@/components/Modal';
import Link from 'next/link';
import { LatexRenderer } from './LatexRenderer';

type ExportOption = 'questions' | 'answers' | 'both';
import { exportToHtml, exportToPdf } from '@/lib/export';

interface WorksheetPreviewProps {
  worksheet: Worksheet;
  showActions?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onQuestionsChange?: (questions: Question[]) => void;
}

export function WorksheetPreview({ worksheet, showActions = true, onTitleChange, onQuestionsChange }: WorksheetPreviewProps) {
  const { showInfo, showSuccess } = useModal();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(worksheet.title);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [localQuestions, setLocalQuestions] = useState<Question[]>(worksheet.questions);

  // Sync localQuestions with worksheet.questions when worksheet changes
  useEffect(() => {
    setLocalQuestions(worksheet.questions);
  }, [worksheet.questions]);

  // Calculate total points
  const totalPoints = localQuestions.reduce((sum, q) => sum + q.points, 0);

  const handlePointsChange = (questionIndex: number, newPoints: number) => {
    const updatedQuestions = localQuestions.map((q, index) =>
      index === questionIndex ? { ...q, points: newPoints } : q
    );
    setLocalQuestions(updatedQuestions);
    onQuestionsChange?.(updatedQuestions);
  };

  const handleExportHtml = (option: ExportOption) => {
    const exportWorksheet = {
      ...worksheet,
      title: editedTitle,
      questions: localQuestions, // Use localQuestions with updated points
      include_answer_key: option === 'answers' || option === 'both',
    };

    if (option === 'answers') {
      // Export only answer key
      exportToHtml({ ...exportWorksheet, title: editedTitle + ' - Answer Key' });
    } else if (option === 'questions') {
      exportToHtml({ ...exportWorksheet, include_answer_key: false });
    } else {
      exportToHtml(exportWorksheet);
    }
    setOpenDropdown(null);
  };

  const handleExportPdf = (option: ExportOption) => {
    const content = option === 'answers' ? 'answer_key' : option === 'questions' ? 'questions' : 'both';
    const exportWorksheet = { ...worksheet, title: editedTitle, questions: localQuestions };
    exportToPdf(exportWorksheet, content);
    setOpenDropdown(null);
  };

  const handlePrint = (option: ExportOption) => {
    // For print, we'll show an info message since we can't dynamically change print content easily
    let message = '';
    if (option === 'questions') {
      message = 'Printing Questions Only - Answer Key will be hidden';
    } else if (option === 'answers') {
      message = 'Printing Answer Key Only';
    } else {
      message = 'Printing Questions and Answer Key';
    }
    showInfo(message, 'Print Preview');
    setTimeout(() => window.print(), 500);
    setOpenDropdown(null);
  };

  const handleShare = async (option: ExportOption) => {
    let shareTitle = editedTitle;
    let shareText = `Check out this worksheet: ${editedTitle}`;

    if (option === 'questions') {
      shareTitle += ' - Questions';
      shareText = `Check out these questions: ${editedTitle}`;
    } else if (option === 'answers') {
      shareTitle += ' - Answer Key';
      shareText = `Answer Key for: ${editedTitle}`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showSuccess('Link copied to clipboard!', 'Copied');
    }
    setOpenDropdown(null);
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onTitleChange?.(editedTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(worksheet.title);
    setIsEditingTitle(false);
  };

  const displayTitle = editedTitle || worksheet.title;

  return (
    <div className="worksheet-preview bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 text-white p-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl md:text-3xl font-bold bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-white placeholder-white/60 border-2 border-white/30 focus:border-white focus:outline-none flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                  title="Save"
                >
                  <Check className="w-6 h-6" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 bg-white/20 hover:bg-red-500/50 rounded-xl transition-colors"
                  title="Cancel"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-3 group">
                <h1 className="text-2xl md:text-3xl font-bold">{displayTitle}</h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  title="Edit title"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                📚 {worksheet.subject}
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                🎓 Grade {worksheet.grade_level}
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                ⚡ {worksheet.difficulty}
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                🌐 {worksheet.language.toUpperCase()}
              </span>
            </div>
            {/* Start Quiz Button */}
            <Link
              href={`/worksheet/${worksheet.id}/fill`}
              className="inline-flex items-center gap-2 bg-white text-teal-600 hover:bg-teal-50 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
            >
              <Play className="w-5 h-5" />
              Start Quiz
            </Link>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex flex-wrap gap-3 p-5 bg-gradient-to-r from-gray-50 to-teal-50/30 border-b border-gray-100">
          {/* Export PDF Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('pdf')}
              className="btn-primary btn-sm flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export PDF
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'pdf' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'pdf' && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <button
                  onClick={() => handleExportPdf('questions')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📝 Only Questions
                </button>
                <button
                  onClick={() => handleExportPdf('answers')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  ✅ Only Answer Key
                </button>
                <button
                  onClick={() => handleExportPdf('both')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📋 Questions + Answer Key
                </button>
              </div>
            )}
          </div>

          {/* Export HTML Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('html')}
              className="btn-secondary btn-sm flex items-center gap-2 hover:border-teal-400 hover:text-teal-700"
            >
              <Download className="w-4 h-4" />
              Export HTML
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'html' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'html' && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <button
                  onClick={() => handleExportHtml('questions')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📝 Only Questions
                </button>
                <button
                  onClick={() => handleExportHtml('answers')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  ✅ Only Answer Key
                </button>
                <button
                  onClick={() => handleExportHtml('both')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📋 Questions + Answer Key
                </button>
              </div>
            )}
          </div>

          {/* Print Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('print')}
              className="btn-secondary btn-sm flex items-center gap-2 hover:border-teal-400 hover:text-teal-700"
            >
              <Printer className="w-4 h-4" />
              Print
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'print' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'print' && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <button
                  onClick={() => handlePrint('questions')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📝 Only Questions
                </button>
                <button
                  onClick={() => handlePrint('answers')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  ✅ Only Answer Key
                </button>
                <button
                  onClick={() => handlePrint('both')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📋 Questions + Answer Key
                </button>
              </div>
            )}
          </div>

          {/* Share Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('share')}
              className="btn-secondary btn-sm flex items-center gap-2 hover:border-teal-400 hover:text-teal-700"
            >
              <Share2 className="w-4 h-4" />
              Share
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'share' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'share' && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <button
                  onClick={() => handleShare('questions')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📝 Only Questions
                </button>
                <button
                  onClick={() => handleShare('answers')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  ✅ Only Answer Key
                </button>
                <button
                  onClick={() => handleShare('both')}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                >
                  📋 Questions + Answer Key
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total Points Indicator */}
      {onQuestionsChange && (
        <div className="px-6 md:px-8 pt-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            totalPoints === 100
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            <span>Total Points: {totalPoints}/100</span>
            {totalPoints !== 100 && (
              <span className="text-xs opacity-75">
                ({totalPoints > 100 ? `${totalPoints - 100} over` : `${100 - totalPoints} remaining`})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="p-6 md:p-8 space-y-6">
        {localQuestions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            number={index + 1}
            editable={!!onQuestionsChange}
            onPointsChange={(newPoints) => handlePointsChange(index, newPoints)}
          />
        ))}
      </div>

      {/* Answer Key */}
      {worksheet.include_answer_key && (
        <div className="border-t-2 border-dashed border-gray-200 mt-4">
          <div className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-emerald-600 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              Answer Key
            </h2>
            <div className="space-y-4">
              {worksheet.questions.map((question, index) => (
                <div key={question.id} className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100">
                  <p className="font-semibold text-gray-800 mb-2">
                    <span className="text-emerald-600">{index + 1}.</span> <LatexRenderer text={question.question} />
                  </p>
                  <p className="text-emerald-700 font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <LatexRenderer text={Array.isArray(question.correct_answer)
                      ? question.correct_answer.join(', ')
                      : String(question.correct_answer || '')} />
                  </p>
                  {question.explanation && (
                    <p className="text-sm text-gray-600 mt-3 bg-white/60 p-3 rounded-lg italic">
                      💡 <LatexRenderer text={question.explanation} />
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionCardProps {
  question: Question;
  number: number;
  onPointsChange?: (newPoints: number) => void;
  editable?: boolean;
}

function QuestionCard({ question, number, onPointsChange, editable = false }: QuestionCardProps) {
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [pointsValue, setPointsValue] = useState(question.points);

  // Sync pointsValue with question.points when it changes from parent
  useEffect(() => {
    setPointsValue(question.points);
  }, [question.points]);

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      multiple_choice: { label: 'Multiple Choice', color: 'text-teal-700', bg: 'bg-teal-100' },
      fill_blank: { label: 'Fill in the Blank', color: 'text-amber-700', bg: 'bg-amber-100' },
      true_false: { label: 'True/False', color: 'text-purple-700', bg: 'bg-purple-100' },
      short_answer: { label: 'Short Answer', color: 'text-rose-700', bg: 'bg-rose-100' },
      essay: { label: 'Essay', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    };
    return configs[type] || { label: type, color: 'text-gray-700', bg: 'bg-gray-100' };
  };

  const typeConfig = getTypeConfig(question.type);

  const handleSavePoints = () => {
    const newPoints = Math.max(1, Math.min(100, pointsValue));
    setPointsValue(newPoints);
    onPointsChange?.(newPoints);
    setIsEditingPoints(false);
  };

  const handleCancelPoints = () => {
    setPointsValue(question.points);
    setIsEditingPoints(false);
  };

  return (
    <div className="question-card bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-teal-200 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md shadow-teal-200">
            {number}
          </span>
          <span className={`text-xs font-bold ${typeConfig.color} ${typeConfig.bg} px-3 py-1.5 rounded-full`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Editable Points */}
        {isEditingPoints ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="100"
              value={pointsValue}
              onChange={(e) => setPointsValue(parseInt(e.target.value) || 1)}
              className="w-14 h-8 text-center text-sm font-bold border-2 border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePoints();
                if (e.key === 'Escape') handleCancelPoints();
              }}
            />
            <button onClick={handleSavePoints} className="p-1 text-green-600 hover:bg-green-50 rounded">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={handleCancelPoints} className="p-1 text-red-600 hover:bg-red-50 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => editable && setIsEditingPoints(true)}
            className={`text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full flex items-center gap-1 ${editable ? 'hover:bg-teal-100 cursor-pointer' : ''}`}
            disabled={!editable}
          >
            {question.points} pts
            {editable && <Pencil className="w-3 h-3 opacity-50" />}
          </button>
        )}
      </div>

<p className="text-gray-800 font-medium text-lg mb-4">
        <LatexRenderer text={question.question} />
      </p>

      {/* Question Image - Support both SVG and URL */}
      {question.image && (
        <div className="mb-5 flex justify-center">
          {question.image.trim().startsWith('<svg') ? (
            <div
              className="max-w-full h-auto rounded-xl shadow-md max-h-48 overflow-hidden bg-white p-2"
              dangerouslySetInnerHTML={{ __html: question.image }}
            />
          ) : question.image.trim().startsWith('http') ? (
            <img
              src={question.image}
              alt="Question illustration"
              className="max-w-full h-auto rounded-xl shadow-md max-h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
        </div>
      )}

      {/* Options for multiple choice / true-false */}
      {(question.type === 'multiple_choice' || question.type === 'true_false') && question.options && (
        <div className="space-y-3 ml-2">
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-teal-50 transition-colors group">
              <span className="w-8 h-8 bg-white border-2 border-gray-200 group-hover:border-teal-400 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 group-hover:text-teal-600 transition-colors">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-gray-700 font-medium">
                <LatexRenderer text={option} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Fill blank input area */}
      {(question.type === 'fill_blank') && (
        <div className="ml-2 mt-3">
          <div className="border-b-3 border-dashed border-teal-300 py-4 bg-teal-50/30 rounded-lg px-4">
            <span className="text-gray-400 text-sm">Write your answer here...</span>
          </div>
        </div>
      )}

      {/* Short answer area */}
      {(question.type === 'short_answer') && (
        <div className="ml-2 mt-3">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 min-h-[80px] bg-gray-50/50 worksheet-lines">
          </div>
        </div>
      )}

      {/* Essay area */}
      {(question.type === 'essay') && (
        <div className="ml-2 mt-3">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 min-h-[150px] bg-gray-50/50 worksheet-lines">
          </div>
        </div>
      )}
    </div>
  );
}
