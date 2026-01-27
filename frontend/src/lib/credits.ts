import { supabase } from './supabase';

export interface UserCredits {
  id: string;
  user_id: string;
  credits: number;
  plan: string;
  plan_expires_at: string | null;
  polar_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'bonus' | 'subscription';
  description: string;
  created_at: string;
}

export interface Plan {
  name: string;
  price: number;
  yearlyPrice: number;
  credits: number;
  features: string[];
}

export interface CreditPack {
  credits: number;
  price: number;
  priceId: string;
}

export const PLANS: Record<string, Plan> = {
  free: {
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    credits: 5,
    features: [
      '5 credits per month',
      'All question types',
      'PDF & HTML export',
      'Basic support',
    ],
  },
  starter: {
    name: 'Starter',
    price: 7.99,
    yearlyPrice: 76.70,
    credits: 100,
    features: [
      '100 credits per month',
      'All question types',
      'PDF & HTML export',
      'Priority support',
      'No watermark',
    ],
  },
  pro: {
    name: 'Pro',
    price: 14.99,
    yearlyPrice: 143.90,
    credits: 200,
    features: [
      '200 credits per month',
      'All question types',
      'PDF & HTML export',
      'Priority support',
      'No watermark',
      'Answer key customization (coming soon)',
    ],
  },
  ultra: {
    name: 'Ultra',
    price: 29.99,
    yearlyPrice: 287.90,
    credits: 400,
    features: [
      '400 credits per month',
      'All question types',
      'PDF & HTML export',
      'Priority support',
      'No watermark',
      'Answer key customization (coming soon)',
      'Team sharing (coming soon)',
    ],
  },
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    credits: 40,
    price: 3.99,
    priceId: 'credits_40',
  },
  {
    credits: 70,
    price: 6.99,
    priceId: 'credits_70',
  },
  {
    credits: 150,
    price: 16.99,
    priceId: 'credits_150',
  },
  {
    credits: 300,
    price: 32.99,
    priceId: 'credits_300',
  },
];

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching credits:', error.message, error.code, error.details);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error fetching credits:', err);
    return null;
  }
}

export async function createUserCredits(userId: string): Promise<UserCredits | null> {
  try {
    // First check if record already exists
    const existing = await getUserCredits(userId);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('user_credits')
      .insert({
        user_id: userId,
        credits: 5, // Free tier bonus
        plan: 'free',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credits:', error.message);
      return null;
    }

    // Log the bonus transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 5,
        type: 'bonus',
        description: 'Welcome bonus - Free tier',
      });

    return data;
  } catch (err) {
    console.error('Unexpected error creating credits:', err);
    return null;
  }
}

export async function useCredits(userId: string, amount: number, description: string): Promise<boolean> {
  try {
    const userCredits = await getUserCredits(userId);

    if (!userCredits || userCredits.credits < amount) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ credits: userCredits.credits - amount })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error using credits:', updateError.message);
      return false;
    }

    // Log the transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        type: 'usage',
        description,
      });

    return true;
  } catch (err) {
    console.error('Unexpected error using credits:', err);
    return false;
  }
}

export async function addCredits(userId: string, amount: number, type: 'purchase' | 'subscription' | 'bonus', description: string): Promise<boolean> {
  try {
    const userCredits = await getUserCredits(userId);

    if (!userCredits) {
      // Create user credits record first
      await createUserCredits(userId);
      return addCredits(userId, amount, type, description);
    }

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ credits: userCredits.credits + amount })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error adding credits:', updateError.message);
      return false;
    }

    // Log the transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount,
        type,
        description,
      });

    return true;
  } catch (err) {
    console.error('Unexpected error adding credits:', err);
    return false;
  }
}

// Check if topic/subject requires diagrams (more expensive)
function needsDiagrams(subject: string, topic: string): boolean {
  const subjectLower = subject.toLowerCase();
  const topicLower = topic.toLowerCase();

  const diagramSubjects = ['geometry', 'math', 'mathematics', 'trigonometry', 'physics', 'science', 'electronics', 'electrical'];
  const diagramTopics = ['triangle', 'circle', 'angle', 'polygon', 'shape', 'circuit', 'resistor', 'voltage', 'current', 'ohm', 'force', 'vector', 'motion', 'projectile', 'sine', 'cosine', 'tangent', 'pythagor', 'area', 'perimeter', 'volume', 'coordinate'];

  for (const s of diagramSubjects) {
    if (subjectLower.includes(s)) return true;
  }
  for (const t of diagramTopics) {
    if (topicLower.includes(t)) return true;
  }
  return false;
}

export function getWorksheetCreditCost(subject: string = '', topic: string = '', questionCount: number = 10): number {
  // Base cost: 1 for normal, 2 for diagram-required topics
  let baseCost = needsDiagrams(subject, topic) ? 2 : 1;

  // Double cost for worksheets with more than 15 questions
  if (questionCount > 15) {
    baseCost = baseCost * 2;
  }

  return baseCost;
}

export async function getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching transactions:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching transactions:', err);
    return [];
  }
}
