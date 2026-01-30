import { Worksheet, WorksheetGeneratorInput, Question, QuestionType } from './types';
import { getSupabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Helper function to distribute points evenly to make total 100
function distributePoints(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return [];

  const totalQuestions = questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  let remainder = 100 % totalQuestions;

  return questions.map((q, index) => ({
    ...q,
    points: basePoints + (index < remainder ? 1 : 0)
  }));
}

// Generate worksheet using AI
export async function generateWorksheet(input: WorksheetGeneratorInput, userId?: string): Promise<Worksheet> {
  try {
    console.log('🚀 Calling API:', `${API_URL}/api/worksheets/generate`);

    const response = await fetch(`${API_URL}/api/worksheets/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    // Get response text first
    const responseText = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response text length:', responseText.length);

    if (!response.ok) {
      // Try to parse error JSON
      let errorMessage = `Server error (${response.status})`;
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = responseText.substring(0, 200) || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      throw new Error('Server returned empty response. Please try again.');
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error('Invalid response from server. Please try again.');
    }

    // Backend returns { success: true, worksheet: {...} }
    if (data.worksheet) {
      // Distribute points to make total 100
      const worksheetWithPoints = {
        ...data.worksheet,
        questions: distributePoints(data.worksheet.questions)
      };

      // Save to Supabase if user is logged in
      if (userId) {
        try {
          await saveWorksheetToSupabase(worksheetWithPoints, userId);
        } catch (err) {
          console.error('Failed to save to Supabase, saving locally:', err);
          saveWorksheetToLocal(worksheetWithPoints);
        }
      } else {
        saveWorksheetToLocal(worksheetWithPoints);
      }

      return worksheetWithPoints;
    }

    // If no worksheet in response
    if (data.error) {
      throw new Error(data.error);
    }

    throw new Error('Invalid response format from server');
  } catch (error) {
    console.error('API generation failed:', error);
    // Re-throw with better message
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    }
    throw error;
  }
}

// Save worksheet to Supabase
async function saveWorksheetToSupabase(worksheet: Worksheet, userId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('worksheets')
    .upsert({
      id: worksheet.id,
      user_id: userId,
      title: worksheet.title,
      subject: worksheet.subject,
      topic: worksheet.topic,
      grade_level: worksheet.grade_level,
      difficulty: worksheet.difficulty,
      language: worksheet.language,
      questions: worksheet.questions,
      include_answer_key: worksheet.include_answer_key,
      additional_instructions: worksheet.additional_instructions,
      status: worksheet.status || 'draft',
      downloads: worksheet.downloads || 0,
      created_at: worksheet.created_at,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving worksheet to Supabase:', error);
    throw error;
  }
}

// Save worksheet to local storage (fallback)
function saveWorksheetToLocal(worksheet: Worksheet): void {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('makos_worksheets');
  const worksheets: Worksheet[] = stored ? JSON.parse(stored) : [];

  // Add or update worksheet
  const existingIndex = worksheets.findIndex(w => w.id === worksheet.id);
  if (existingIndex >= 0) {
    worksheets[existingIndex] = worksheet;
  } else {
    worksheets.unshift(worksheet);
  }

  // Keep only last 50 worksheets
  const trimmed = worksheets.slice(0, 50);
  localStorage.setItem('makos_worksheets', JSON.stringify(trimmed));
}

// Generate demo worksheet (fallback when API is not available)
async function generateDemoWorksheet(input: WorksheetGeneratorInput, userId?: string): Promise<Worksheet> {
  const id = 'ws_' + Math.random().toString(36).substring(2, 10);
  const questions: Question[] = [];

  for (let i = 0; i < input.question_count; i++) {
    const qType = input.question_types[i % input.question_types.length] || 'multiple_choice';
    questions.push(generateDemoQuestion(i + 1, qType as QuestionType, input.topic));
  }

  // Distribute points to make total 100
  const questionsWithPoints = distributePoints(questions);

  const worksheet: Worksheet = {
    id,
    title: `${input.topic} Worksheet`,
    subject: input.subject,
    topic: input.topic,
    grade_level: input.grade_level,
    difficulty: input.difficulty,
    language: input.language,
    questions: questionsWithPoints,
    include_answer_key: input.include_answer_key,
    additional_instructions: input.additional_instructions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'draft',
    downloads: 0,
  };

  // Save to Supabase if user is logged in
  if (userId) {
    try {
      await saveWorksheetToSupabase(worksheet, userId);
    } catch (err) {
      console.error('Failed to save to Supabase:', err);
      saveWorksheetToLocal(worksheet);
    }
  } else {
    saveWorksheetToLocal(worksheet);
  }

  return worksheet;
}

function generateDemoQuestion(num: number, type: QuestionType, topic: string): Question {
  const baseQuestion: Question = {
    id: `q_${num}`,
    type,
    question: '',
    points: type === 'essay' ? 10 : type === 'short_answer' ? 5 : 2,
  };

  switch (type) {
    case 'multiple_choice':
      return {
        ...baseQuestion,
        question: `Question ${num}: Which of the following best describes ${topic}?`,
        options: [
          `A fundamental principle of ${topic}`,
          `An unrelated concept`,
          `Something rarely used in ${topic}`,
          `None of the above`
        ],
        correct_answer: `A fundamental principle of ${topic}`,
        explanation: `This is correct because it accurately describes a core aspect of ${topic}.`,
      };
    case 'true_false':
      return {
        ...baseQuestion,
        question: `Question ${num}: True or False: ${topic} is an important subject to learn.`,
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'This statement is true because...',
      };
    case 'fill_blank':
      return {
        ...baseQuestion,
        question: `Question ${num}: The main concept of ${topic} is called __________.`,
        correct_answer: 'answer',
        explanation: 'The correct answer fills in the blank appropriately.',
      };
    case 'short_answer':
      return {
        ...baseQuestion,
        question: `Question ${num}: Briefly explain the importance of ${topic}.`,
        correct_answer: 'Sample answer explaining the importance...',
        explanation: 'A good answer should include key points about the topic.',
      };
    case 'essay':
      return {
        ...baseQuestion,
        question: `Question ${num}: Write a detailed essay about ${topic} and its impact on society.`,
        correct_answer: 'Essays are graded based on content, structure, and clarity.',
        explanation: 'A good essay should have an introduction, body paragraphs, and conclusion.',
      };
    default:
      return baseQuestion;
  }
}

// Fetch all worksheets from Supabase
export async function fetchWorksheets(userId?: string): Promise<Worksheet[]> {
  if (!userId) {
    // Not logged in - return local storage worksheets
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('makos_worksheets');
    return stored ? JSON.parse(stored) : [];
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('worksheets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching worksheets from Supabase:', error);
    // Fallback to local storage
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('makos_worksheets');
    return stored ? JSON.parse(stored) : [];
  }

  return data || [];
}

// Get a single worksheet by ID
export async function getWorksheet(id: string, userId?: string): Promise<Worksheet | null> {
  if (userId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('worksheets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching worksheet:', error);
      // Fallback to local
      const worksheets = await fetchWorksheets();
      return worksheets.find(w => w.id === id) || null;
    }

    return data;
  }

  // Fallback to local storage
  const worksheets = await fetchWorksheets();
  return worksheets.find(w => w.id === id) || null;
}

// Delete a worksheet
export async function deleteWorksheet(id: string, userId?: string): Promise<void> {
  if (userId) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('worksheets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting worksheet:', error);
      throw error;
    }
    return;
  }

  // Fallback to local storage
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('makos_worksheets');
  if (!stored) return;

  const worksheets: Worksheet[] = JSON.parse(stored);
  const filtered = worksheets.filter(w => w.id !== id);
  localStorage.setItem('makos_worksheets', JSON.stringify(filtered));
}

// Save/update a worksheet
export function saveWorksheet(worksheet: Worksheet): void {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('makos_worksheets');
  const worksheets: Worksheet[] = stored ? JSON.parse(stored) : [];

  const existingIndex = worksheets.findIndex(w => w.id === worksheet.id);

  if (existingIndex >= 0) {
    // Update existing worksheet
    worksheets[existingIndex] = {
      ...worksheet,
      updated_at: new Date().toISOString()
    };
  } else {
    // Add new worksheet
    worksheets.unshift(worksheet);
  }

  localStorage.setItem('makos_worksheets', JSON.stringify(worksheets));
}

// Demo worksheets for initial display
function getDemoWorksheets(): Worksheet[] {
  const demoData: Worksheet[] = [
    {
      id: 'demo_1',
      title: 'Photosynthesis Basics',
      subject: 'biology',
      topic: 'Photosynthesis',
      grade_level: '7',
      difficulty: 'medium',
      language: 'en',
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'What is the primary pigment involved in photosynthesis?',
          options: ['Chlorophyll', 'Carotenoid', 'Hemoglobin', 'Melanin'],
          correct_answer: 'Chlorophyll',
          explanation: 'Chlorophyll absorbs light energy for photosynthesis.',
          points: 0,
        },
        {
          id: 'q2',
          type: 'fill_blank',
          question: 'Plants convert light energy into __________ energy.',
          correct_answer: 'chemical',
          explanation: 'Photosynthesis converts light energy to chemical energy stored in glucose.',
          points: 0,
        },
      ],
      include_answer_key: true,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      status: 'published',
      downloads: 15,
    },
    {
      id: 'demo_2',
      title: 'Basic Fractions',
      subject: 'math',
      topic: 'Fractions',
      grade_level: '4',
      difficulty: 'easy',
      language: 'en',
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'What is 1/2 + 1/4?',
          options: ['1/2', '3/4', '2/4', '1/6'],
          correct_answer: '3/4',
          explanation: '1/2 = 2/4, so 2/4 + 1/4 = 3/4',
          points: 0,
        },
      ],
      include_answer_key: true,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 172800000).toISOString(),
      status: 'draft',
      downloads: 8,
    },
  ];

  // Distribute points to make total 100 for each demo worksheet
  return demoData.map(ws => ({
    ...ws,
    questions: distributePoints(ws.questions)
  }));
}

// Export worksheet as PDF (triggers print dialog)
export function exportWorksheetPDF(worksheet: Worksheet): void {
  window.print();
}

// Send welcome email to new user
export async function sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/email/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name: name || '' }),
    });

    if (!response.ok) {
      console.error('Failed to send welcome email');
      return false;
    }

    console.log('✅ Welcome email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}
