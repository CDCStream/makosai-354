'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Worksheet, Question } from '@/lib/types';
import { getWorksheet } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, Send, RotateCcw, Trophy, Printer, Share2, Play, AlertTriangle } from 'lucide-react';
import { LatexRenderer } from '@/components/LatexRenderer';
import { useAuth } from '@/lib/AuthContext';
import { useModal } from '@/components/Modal';

interface Answers {
  [questionId: string]: string;
}

const QUICK_TIME_OPTIONS = [
  { value: 0, label: 'No limit', icon: '♾️' },
  { value: 5, label: '5 min', icon: '⚡' },
  { value: 10, label: '10 min', icon: '🕐' },
  { value: 15, label: '15 min', icon: '🕑' },
  { value: 30, label: '30 min', icon: '🕒' },
  { value: 60, label: '60 min', icon: '🕔' },
];

function WorksheetFillContent() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { showSuccess, ModalComponent } = useModal();

  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number; points: number; maxPoints: number } | null>(null);

  // Timer states
  const [showTimerModal, setShowTimerModal] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLimit, setTimeLimit] = useState(0); // 0 = no limit
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<string>('');

  useEffect(() => {
    const loadWorksheet = async () => {
      try {
        const data = await getWorksheet(id, user?.id);
        if (data) {
          // Debug: Check if images are present
          console.log('📊 Loaded worksheet:', data.id);
          console.log('📊 Questions with images:', data.questions?.filter(q => q.image).length || 0);
          data.questions?.forEach((q, i) => {
            if (q.image) {
              console.log(`📊 Q${i+1} image (first 100 chars):`, q.image.substring(0, 100));
            }
          });

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

  // Timer - countdown or countup
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && !submitted && quizStarted) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);

        if (timeLimit > 0) {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              // Time's up! Auto-submit
              setTimeExpired(true);
              setTimerActive(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, submitted, quizStarted, timeLimit]);

  // Auto-submit when time expires
  useEffect(() => {
    if (timeExpired && !submitted && worksheet) {
      handleAutoSubmit();
    }
  }, [timeExpired]);

  const handleStartQuiz = (minutes: number) => {
    const seconds = minutes * 60;
    setTimeLimit(seconds);
    setTimeRemaining(seconds);
    setShowTimerModal(false);
    setQuizStarted(true);
    setTimerActive(true);
  };

  const handleCustomTimeStart = () => {
    const minutes = parseInt(customMinutes) || 0;
    if (minutes > 0) {
      handleStartQuiz(minutes);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLimit === 0) return 'bg-blue-50 text-blue-700';
    const percentage = (timeRemaining / timeLimit) * 100;
    if (percentage <= 10) return 'bg-red-100 text-red-700 animate-pulse';
    if (percentage <= 25) return 'bg-orange-100 text-orange-700';
    if (percentage <= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-teal-50 text-teal-700';
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const checkAnswer = (question: Question, userAnswer: string): boolean => {
    if (!userAnswer) return false;

    const correctAnswer = question.correct_answer;
    if (!correctAnswer) return false;

    if (typeof correctAnswer === 'string') {
      return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    }

    return false;
  };

  // Save quiz result to localStorage
  const saveQuizResult = (worksheetId: string, points: number, correct: number, total: number, timeTaken: number) => {
    const quizResults = JSON.parse(localStorage.getItem('quizResults') || '{}');
    quizResults[worksheetId] = {
      score: points,
      correct,
      total,
      timeTaken,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem('quizResults', JSON.stringify(quizResults));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!worksheet) return;

    let correct = 0;
    const totalQuestions = worksheet.questions.length;
    const pointsPerQuestion = 100 / totalQuestions;

    worksheet.questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (checkAnswer(q, userAnswer)) {
        correct++;
      }
    });

    // Calculate score out of 100
    const points = Math.round(correct * pointsPerQuestion);

    // Save result to localStorage
    saveQuizResult(worksheet.id, points, correct, totalQuestions, timeElapsed);

    setScore({
      correct,
      total: totalQuestions,
      points,
      maxPoints: 100,
    });
    setSubmitted(true);
    setTimerActive(false);
  };

  const handleAutoSubmit = () => {
    if (!worksheet) return;

    let correct = 0;
    const totalQuestions = worksheet.questions.length;
    const pointsPerQuestion = 100 / totalQuestions;

    worksheet.questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (checkAnswer(q, userAnswer)) {
        correct++;
      }
    });

    // Calculate score out of 100
    const points = Math.round(correct * pointsPerQuestion);

    // Save result to localStorage
    saveQuizResult(worksheet.id, points, correct, totalQuestions, timeElapsed);

    setScore({
      correct,
      total: totalQuestions,
      points,
      maxPoints: 100,
    });
    setSubmitted(true);
    setTimerActive(false);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setTimeElapsed(0);
    setTimeExpired(false);
    setShowTimerModal(true);
    setQuizStarted(false);
    setTimeLimit(0);
    setTimeRemaining(0);
  };

  const handlePrintAnswerKey = () => {
    const printContent = document.getElementById('answer-key-section');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Answer Key - ${worksheet?.title || 'Worksheet'}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
              h1 { color: #059669; margin-bottom: 20px; font-size: 24px; }
              .question { margin-bottom: 20px; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
              .correct { background: #ecfdf5; border-color: #10b981; }
              .incorrect { background: #fef2f2; border-color: #ef4444; }
              .question-text { font-weight: 600; margin-bottom: 10px; }
              .answer { color: #059669; font-weight: 600; }
              .explanation { font-size: 14px; color: #666; margin-top: 10px; font-style: italic; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>📋 Answer Key: ${worksheet?.title || 'Worksheet'}</h1>
            ${worksheet?.questions.map((q, i) => {
              const userAns = answers[q.id] || '';
              const correct = checkAnswer(q, userAns);
              return `
                <div class="question ${correct ? 'correct' : 'incorrect'}">
                  <p class="question-text">${i + 1}. ${q.question}</p>
                  ${userAns ? `<p>Your answer: ${userAns} ${correct ? '✓' : '✗'}</p>` : '<p>Not answered</p>'}
                  <p class="answer">Correct answer: ${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</p>
                  ${q.explanation ? `<p class="explanation">💡 ${q.explanation}</p>` : ''}
                </div>
              `;
            }).join('')}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleShareAnswerKey = async () => {
    if (!worksheet) return;

    const text = `Answer Key for: ${worksheet.title}\n\n` +
      worksheet.questions.map((q, i) =>
        `${i + 1}. ${q.question}\nAnswer: ${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}${q.explanation ? `\n💡 ${q.explanation}` : ''}`
      ).join('\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Answer Key - ${worksheet.title}`,
          text: text,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(text);
      showSuccess('Answer key copied to clipboard!', 'Copied');
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
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
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

  const getScoreColor = () => {
    if (!score) return 'text-gray-600';
    const percentage = (score.points / score.maxPoints) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isLoggedIn={true} />

      {/* Timer Selection Modal */}
      {showTimerModal && !submitted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Quiz Timer</h2>
              <p className="text-gray-600">
                Enter time in minutes or choose a quick option. Quiz auto-submits when time runs out.
              </p>
            </div>

            {/* Custom Time Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ⏱️ Enter time (minutes)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="e.g., 25"
                  className="flex-1 input-field text-lg text-center font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomTimeStart();
                  }}
                />
                <button
                  type="button"
                  onClick={handleCustomTimeStart}
                  disabled={!customMinutes || parseInt(customMinutes) <= 0}
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Start
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-500 font-medium">or quick select</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Quick Options */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {QUICK_TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStartQuiz(option.value)}
                  className="p-3 rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-center group"
                >
                  <span className="text-2xl block mb-1">{option.icon}</span>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-teal-700">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-center">
              <Link
                href={`/worksheet/${worksheet.id}`}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back to Worksheet
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Time Expired Modal */}
      {timeExpired && !submitted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Time&apos;s Up!</h2>
            <p className="text-gray-600 mb-6">
              Your quiz has been automatically submitted with your current answers.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href={`/worksheet/${worksheet.id}`}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Worksheet
        </Link>

        {/* Header Card */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{worksheet.title}</h1>
              <p className="text-gray-500 mt-1">
                {worksheet.questions.length} questions • {worksheet.difficulty} • Grade {worksheet.grade_level}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              {quizStarted && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${getTimerColor()}`}>
                  <Clock className="w-5 h-5" />
                  {timeLimit > 0 ? (
                    <div className="text-center">
                      <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                      <span className="text-xs ml-2 opacity-75">remaining</span>
                    </div>
                  ) : (
                    <span className="font-mono font-bold">{formatTime(timeElapsed)}</span>
                  )}
                </div>
              )}

              {/* Score */}
              {submitted && score && (
                <div className={`flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl ${getScoreColor()}`}>
                  <Trophy className="w-5 h-5" />
                  <span className="font-bold">{score.points}/100</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Questions Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {worksheet.questions.map((question, index) => {
              const userAnswer = answers[question.id] || '';
              const isCorrect = submitted ? checkAnswer(question, userAnswer) : null;

              return (
                <div
                  key={question.id}
                  className={`card p-6 transition-all ${
                    submitted
                      ? isCorrect
                        ? 'border-green-300 bg-green-50'
                        : 'border-red-300 bg-red-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      submitted
                        ? isCorrect
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {submitted ? (
                        isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-medium text-gray-900">
                          <LatexRenderer text={question.question} />
                        </p>
                        <span className="text-sm text-blue-600 font-medium ml-4">
                          {Math.round(100 / worksheet.questions.length)} pts
                        </span>
                      </div>

                      {/* Question Image (SVG or URL) */}
                      {question.image && console.log(`🖼️ Q${index+1} has image:`, question.image.substring(0, 50))}
                      {question.image && (
                        <div className="mb-4 flex justify-center bg-gray-50 p-2 rounded-lg border">
                          {question.image.trim().startsWith('<svg') ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: question.image }}
                              className="svg-diagram"
                              style={{ width: '280px', height: '200px' }}
                            />
                          ) : (
                            <img
                              src={question.image}
                              alt="Question diagram"
                              className="max-w-full h-auto rounded-lg shadow-md"
                              style={{ maxWidth: '280px', maxHeight: '180px' }}
                            />
                          )}
                        </div>
                      )}

                      {/* Multiple Choice */}
                      {(question.type === 'multiple_choice' || question.type === 'true_false') && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <label
                              key={optIndex}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                submitted
                                  ? userAnswer === option
                                    ? isCorrect
                                      ? 'bg-green-100 border-2 border-green-400'
                                      : 'bg-red-100 border-2 border-red-400'
                                    : 'bg-white border border-gray-200'
                                  : userAnswer === option
                                  ? 'bg-blue-100 border-2 border-blue-400'
                                  : 'bg-white border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={userAnswer === option}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                disabled={submitted}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-gray-700">
                                <LatexRenderer text={option} />
                              </span>
                              {submitted && userAnswer === option && (
                                isCorrect
                                  ? <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                                  : <XCircle className="w-4 h-4 text-red-600 ml-auto" />
                              )}
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Fill in the Blank */}
                      {question.type === 'fill_blank' && (
                        <input
                          type="text"
                          value={userAnswer}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          disabled={submitted}
                          placeholder="Type your answer..."
                          className={`input-field w-full ${
                            submitted
                              ? isCorrect
                                ? 'border-green-400 bg-green-50'
                                : 'border-red-400 bg-red-50'
                              : ''
                          }`}
                        />
                      )}

                      {/* Short Answer */}
                      {question.type === 'short_answer' && (
                        <textarea
                          value={userAnswer}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          disabled={submitted}
                          placeholder="Type your answer..."
                          rows={3}
                          className={`input-field w-full resize-none ${
                            submitted
                              ? isCorrect
                                ? 'border-green-400 bg-green-50'
                                : 'border-red-400 bg-red-50'
                              : ''
                          }`}
                        />
                      )}

                      {/* Essay */}
                      {question.type === 'essay' && (
                        <textarea
                          value={userAnswer}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          disabled={submitted}
                          placeholder="Write your essay..."
                          rows={6}
                          className="input-field w-full resize-none"
                        />
                      )}

                      {/* Show correct answer after submit */}
                      {submitted && (
                        <div className={`mt-4 p-4 rounded-xl ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                          <div className="flex items-start gap-3">
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                                {isCorrect ? 'Correct!' : 'Incorrect'}
                              </p>
                              <p className="text-gray-700 mt-1">
                                <span className="font-medium">Answer:</span>{' '}
                                <LatexRenderer text={Array.isArray(question.correct_answer)
                                  ? question.correct_answer.join(', ')
                                  : String(question.correct_answer || '')} />
                              </p>
                              {question.explanation && (
                                <p className="text-sm text-gray-600 mt-2 italic">
                                  💡 <LatexRenderer text={question.explanation} />
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit / Reset Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            {!submitted ? (
              <button
                type="submit"
                className="flex-1 btn-primary py-4 text-lg flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Submit Answers
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 btn-secondary py-4 text-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </button>
                <Link
                  href={`/worksheet/${worksheet.id}`}
                  className="flex-1 btn-primary py-4 text-lg flex items-center justify-center gap-2"
                >
                  View Worksheet
                </Link>
              </>
            )}
          </div>
        </form>

        {/* Results Summary */}
        {submitted && score && (
          <div className="mt-8 card p-8 text-center">
            {timeExpired && (
              <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl mb-4 inline-flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Time expired - Quiz auto-submitted</span>
              </div>
            )}
            <div className={`text-6xl font-bold mb-4 ${getScoreColor()}`}>
              {score.points}<span className="text-3xl text-gray-400">/100</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {score.points >= 80
                ? '🎉 Excellent!'
                : score.points >= 60
                ? '👍 Good Job!'
                : '📚 Keep Practicing!'}
            </h2>
            <p className="text-gray-600">
              You got {score.correct} out of {score.total} questions correct
            </p>
            <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500">
              <span>⏱️ Time taken: {formatTime(timeElapsed)}</span>
              {timeLimit > 0 && (
                <span>⏰ Time limit: {formatTime(timeLimit)}</span>
              )}
            </div>
          </div>
        )}

        {/* Answer Key Section */}
        {submitted && worksheet.include_answer_key && (
          <div className="mt-8 card overflow-hidden" id="answer-key-section">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Answer Key</h2>
                  <p className="text-emerald-100 text-sm">Review the correct answers below</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePrintAnswerKey()}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => handleShareAnswerKey()}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {worksheet.questions.map((question, index) => {
                const userAnswer = answers[question.id] || '';
                const isCorrect = checkAnswer(question, userAnswer);

                return (
                  <div
                    key={question.id}
                    className={`p-4 rounded-xl border-2 ${
                      isCorrect
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 mb-2">
                          <span className="text-gray-500">{index + 1}.</span>{' '}
                          <LatexRenderer text={question.question} />
                        </p>

                        {userAnswer && (
                          <p className={`text-sm mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            <strong>Your answer:</strong> <LatexRenderer text={userAnswer} />
                          </p>
                        )}

                        <p className="text-sm text-emerald-700 font-semibold">
                          <strong>Correct answer:</strong>{' '}
                          <LatexRenderer text={Array.isArray(question.correct_answer)
                            ? question.correct_answer.join(', ')
                            : String(question.correct_answer || '')} />
                        </p>

                        {question.explanation && (
                          <p className="text-sm text-gray-600 mt-2 bg-white/60 p-3 rounded-lg">
                            💡 <LatexRenderer text={question.explanation} />
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      {ModalComponent}
    </div>
  );
}

export default function WorksheetFillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <WorksheetFillContent />
    </Suspense>
  );
}

