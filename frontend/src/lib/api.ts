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

// Progress callback type
type ProgressCallback = (step: number, message: string) => void;

// Generate worksheet using AI with streaming progress
export async function generateWorksheet(
  input: WorksheetGeneratorInput,
  userId?: string,
  onProgress?: ProgressCallback
): Promise<Worksheet> {
  try {
    // Use streaming endpoint if progress callback is provided
    if (onProgress) {
      return await generateWorksheetWithProgress(input, userId, onProgress);
    }

    const response = await fetch(`${API_URL}/api/worksheets/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate worksheet');
    }

    const data = await response.json();

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

    return data;
  } catch (error) {
    console.error('API generation failed, using demo generation:', error);
    // Return demo worksheet
    return generateDemoWorksheet(input, userId);
  }
}

// Generate worksheet with streaming progress updates
async function generateWorksheetWithProgress(
  input: WorksheetGeneratorInput,
  userId: string | undefined,
  onProgress: ProgressCallback
): Promise<Worksheet> {
  console.log('🚀 Starting SSE generation...');

  return new Promise((resolve, reject) => {
    const controller = new AbortController();

    fetch(`${API_URL}/api/worksheets/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    }).then(async (response) => {
      console.log('🚀 SSE Response received, status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        reject(new Error(errorData.error || 'Failed to generate worksheet'));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        reject(new Error('No response body'));
        return;
      }

      console.log('🚀 Starting to read SSE stream...');
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Capture event type
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          // Handle data lines
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            try {
              const data = JSON.parse(dataStr);

              // Handle different event types
              if (currentEventType === 'progress' && data.step !== undefined) {
                onProgress(data.step, data.message);
              }
              else if (currentEventType === 'error') {
                reject(new Error(data.message || 'Generation failed'));
                return;
              }
              else if (currentEventType === 'complete') {
                console.log('🚀 Complete event received!', { hasWorksheet: !!data.worksheet, hasId: !!data.id });
                // Handle both wrapped {success, worksheet} and direct worksheet formats
                const worksheet = data.worksheet || (data.id ? data : null);

                if (worksheet && worksheet.id) {
                  const worksheetWithPoints = {
                    ...worksheet,
                    questions: distributePoints(worksheet.questions)
                  };

                  // Save to Supabase if user is logged in
                  if (userId) {
                    try {
                      await saveWorksheetToSupabase(worksheetWithPoints, userId);
                    } catch (err) {
                      console.error('Failed to save to Supabase:', err);
                      saveWorksheetToLocal(worksheetWithPoints);
                    }
                  } else {
                    saveWorksheetToLocal(worksheetWithPoints);
                  }

                  resolve(worksheetWithPoints);
                  return;
                } else if (data.error) {
                  reject(new Error(data.error));
                  return;
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for partial data
              console.debug('SSE parse skip:', dataStr.substring(0, 50));
            }

            // Reset event type after processing
            currentEventType = '';
          }
        }
      }

      reject(new Error('Stream ended without result'));
    }).catch(reject);
  });
}

// Save worksheet to Supabase
async function saveWorksheetToSupabase(worksheet: Worksheet, userId: string): Promise<void> {
  const supabase = getSupabase();

  // Debug: Log what we're trying to save
  console.log('📝 Saving worksheet to Supabase:', {
    id: worksheet.id,
    userId: userId,
    title: worksheet.title,
    questionCount: worksheet.questions?.length,
    hasImages: worksheet.questions?.some(q => q.image) || false
  });

  const { data, error } = await supabase
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
      additional_instructions: worksheet.additional_instructions || '',
      status: worksheet.status || 'draft',
      downloads: worksheet.downloads || 0,
      created_at: worksheet.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select();

  console.log('📝 Supabase response:', { data, error });

  if (error) {
    console.error('Error saving worksheet to Supabase:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      full: JSON.stringify(error)
    });
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
