// Worksheet Generator Types

export type QuestionType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'true_false'
  | 'short_answer'
  | 'essay';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type WorksheetStatus = 'draft' | 'published';


export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correct_answer?: string | string[];
  explanation?: string;
  points: number;
  image?: string;
  latex_diagram?: string; // TikZ code for geometry/diagrams
}

export interface Worksheet {
  id: string;
  title: string;
  subject: string;
  topic: string;
  grade_level: string;
  difficulty: Difficulty;
  language: string;
  questions: Question[];
  include_answer_key: boolean;
  additional_instructions?: string;
  created_at: string;
  updated_at: string;
  status: WorksheetStatus;
  downloads: number;
}

export interface WorksheetGeneratorInput {
  title?: string; // Optional custom title
  topic: string;
  subject: string;
  grade_level: string;
  difficulty: Difficulty;
  question_count: number;
  question_types: QuestionType[];
  language: string;
  include_answer_key: boolean;
  additional_instructions?: string;
}

// Subject options
export const SUBJECTS = [
  { value: 'math', label: 'Mathematics', emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'english', label: 'English', emoji: '📖' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'geography', label: 'Geography', emoji: '🌍' },
  { value: 'biology', label: 'Biology', emoji: '🧬' },
  { value: 'chemistry', label: 'Chemistry', emoji: '⚗️' },
  { value: 'physics', label: 'Physics', emoji: '⚛️' },
  { value: 'art', label: 'Art', emoji: '🎨' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'literature', label: 'Literature', emoji: '📚' },
  { value: 'social_studies', label: 'Social Studies', emoji: '🏛️' },
  { value: 'computer_science', label: 'Computer Science', emoji: '💻' },
  { value: 'foreign_language', label: 'Foreign Language', emoji: '🗣️' },
  { value: 'other', label: 'Other', emoji: '📝' },
] as const;

// Grade levels
export const GRADE_LEVELS = [
  { value: 'k', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' },
  { value: 'college', label: 'College' },
  { value: 'adult', label: 'Adult Education' },
] as const;

// Question types
export const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', emoji: '🔘' },
  { value: 'fill_blank', label: 'Fill in the Blank', emoji: '✏️' },
  { value: 'true_false', label: 'True/False', emoji: '✓✗' },
  { value: 'short_answer', label: 'Short Answer', emoji: '💬' },
  { value: 'essay', label: 'Essay', emoji: '📝' },
] as const;

// Difficulties
export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-700' },
] as const;

// Languages for worksheet output
export const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { value: 'pl', label: 'Polski', flag: '🇵🇱' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'zh_Hans', label: '中文 (简体)', flag: '🇨🇳' },
  { value: 'zh_Hant', label: '中文 (繁體)', flag: '🇹🇼' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { value: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'th', label: 'ไทย', flag: '🇹🇭' },
  { value: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { value: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { value: 'fil', label: 'Filipino', flag: '🇵🇭' },
  { value: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { value: 'no', label: 'Norsk', flag: '🇳🇴' },
  { value: 'da', label: 'Dansk', flag: '🇩🇰' },
  { value: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { value: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { value: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { value: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { value: 'ro', label: 'Română', flag: '🇷🇴' },
  { value: 'he', label: 'עברית', flag: '🇮🇱' },
  { value: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { value: 'ur', label: 'اردو', flag: '🇵🇰' },
  { value: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
  { value: 'az', label: 'Azərbaycan', flag: '🇦🇿' },
  { value: 'kk', label: 'Қазақша', flag: '🇰🇿' },
  { value: 'uz', label: 'Oʻzbek', flag: '🇺🇿' },
  { value: 'sr', label: 'Srpski', flag: '🇷🇸' },
  { value: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  { value: 'bg', label: 'Български', flag: '🇧🇬' },
  { value: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { value: 'sl', label: 'Slovenščina', flag: '🇸🇮' },
  { value: 'lt', label: 'Lietuvių', flag: '🇱🇹' },
  { value: 'lv', label: 'Latviešu', flag: '🇱🇻' },
  { value: 'et', label: 'Eesti', flag: '🇪🇪' },
  { value: 'uk', label: 'Українська', flag: '🇺🇦' },
] as const;
