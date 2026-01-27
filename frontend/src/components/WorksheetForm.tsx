'use client';

import { useState, useEffect } from 'react';
import {
  WorksheetGeneratorInput,
  SUBJECTS,
  GRADE_LEVELS,
  QUESTION_TYPES,
  DIFFICULTIES,
  LANGUAGES,
  QuestionType,
  Difficulty
} from '@/lib/types';
import { getWorksheetCreditCost } from '@/lib/credits';
import { Sparkles, ChevronDown, ChevronUp, Wand2, Coins } from 'lucide-react';
import { Modal, useModal } from './Modal';

interface WorksheetFormProps {
  onGenerate: (input: WorksheetGeneratorInput) => void;
  isGenerating: boolean;
  initialTopic?: string;
}

export function WorksheetForm({ onGenerate, isGenerating, initialTopic = '' }: WorksheetFormProps) {
  const { showError, ModalComponent } = useModal();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<WorksheetGeneratorInput>({
    title: '',
    topic: initialTopic,
    subject: 'math',
    grade_level: '5',
    difficulty: 'medium',
    question_count: 10,
    question_types: ['multiple_choice'],
    language: 'en',
    include_answer_key: true,
    additional_instructions: '',
  });

  // Update topic when initialTopic changes
  useEffect(() => {
    if (initialTopic) {
      setFormData(prev => ({ ...prev, topic: initialTopic }));
    }
  }, [initialTopic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      showError('Please enter a topic', 'Missing Topic');
      return;
    }
    onGenerate(formData);
  };

  const toggleQuestionType = (type: QuestionType) => {
    setFormData(prev => {
      const types = prev.question_types.includes(type)
        ? prev.question_types.filter(t => t !== type)
        : [...prev.question_types, type];
      return { ...prev, question_types: types.length > 0 ? types : ['multiple_choice'] };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Topic - Hero input */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-lg">✏️</span> What do you want to teach?
        </label>
        <input
          type="text"
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          placeholder="e.g., Photosynthesis, Fractions, World War II..."
          className="input-field text-lg py-4"
          required
        />
      </div>

      {/* Subject & Grade Level */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">📚</span> Subject
          </label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="select-field"
          >
            {SUBJECTS.map(subject => (
              <option key={subject.value} value={subject.value}>
                {subject.emoji} {subject.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">🎓</span> Grade Level
          </label>
          <select
            value={formData.grade_level}
            onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
            className="select-field"
          >
            {GRADE_LEVELS.map(grade => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-lg">⚡</span> Difficulty Level
        </label>
        <div className="flex gap-3">
          {DIFFICULTIES.map(diff => (
            <button
              key={diff.value}
              type="button"
              onClick={() => setFormData({ ...formData, difficulty: diff.value as Difficulty })}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                formData.difficulty === diff.value
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
              }`}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question Types */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-lg">❓</span> Question Types
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUESTION_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleQuestionType(type.value as QuestionType)}
              className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                formData.question_types.includes(type.value as QuestionType)
                  ? 'bg-teal-100 text-teal-700 border-2 border-teal-400 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-lg">{type.emoji}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Number of Questions */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-lg">🔢</span> Number of Questions
          <span className="ml-auto bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-bold">
            {formData.question_count}
          </span>
        </label>
        <input
          type="range"
          min="5"
          max="30"
          value={formData.question_count}
          onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
          <span>5 (Quick)</span>
          <span>15 (Standard)</span>
          <span>30 (Comprehensive)</span>
        </div>
      </div>

      {/* Worksheet Language */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-lg">🌐</span> Worksheet Language
        </label>
        <select
          value={formData.language}
          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          className="select-field"
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
              {lang.flag} {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Additional Instructions */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="text-lg">✨</span> Special Instructions for AI
          <span className="text-xs font-normal text-gray-500 ml-2">(optional)</span>
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Guide the AI on what to focus on, specific concepts, or teaching style preferences.
        </p>
        <textarea
          value={formData.additional_instructions}
          onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
          placeholder="Examples:&#10;• Focus on real-world applications&#10;• Include word problems about shopping&#10;• Make questions progressively harder&#10;• Use simple vocabulary for ESL students"
          className="input-field min-h-[120px] resize-none"
        />
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-600 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Advanced Options
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 p-5 bg-gray-50 rounded-2xl animate-fade-in border border-gray-100">
          {/* Include Answer Key */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.include_answer_key}
              onChange={(e) => setFormData({ ...formData, include_answer_key: e.target.checked })}
              className="checkbox-custom"
            />
            <span className="text-gray-700 font-medium group-hover:text-teal-700 transition-colors">
              Include answer key with explanations
            </span>
          </label>
        </div>
      )}

      {/* Credit Cost Display */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
        <Coins className="w-5 h-5 text-amber-600" />
        <span className="text-amber-800 font-medium">
          This worksheet will cost{' '}
          <span className="font-bold text-amber-900">
            {getWorksheetCreditCost(formData.subject, formData.topic, formData.question_count)} credit{getWorksheetCreditCost(formData.subject, formData.topic, formData.question_count) > 1 ? 's' : ''}
          </span>
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isGenerating || !formData.topic.trim()}
        className="w-full btn-primary py-5 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {isGenerating ? (
          <>
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <span>Generating your worksheet...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span>Generate Worksheet</span>
          </>
        )}
      </button>
      {ModalComponent}
    </form>
  );
}
