import { NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';
import { getSupabase } from '@/lib/supabase';

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get subscription ID from user_credits
    const { data: userCredits, error: fetchError } = await supabase
      .from('user_credits')
      .select('polar_subscription_id, plan')
      .eq('user_id', userId)
      .single();

    if (fetchError || !userCredits) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userCredits.polar_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    if (userCredits.plan === 'free') {
      return NextResponse.json({ error: 'You are already on the free plan' }, { status: 400 });
    }

    // Cancel subscription via Polar API
    await polar.subscriptions.cancel({
      id: userCredits.polar_subscription_id,
    });

    // Update user to free plan
    await supabase
      .from('user_credits')
      .update({
        plan: 'free',
        polar_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Log the cancellation
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: 0,
      type: 'subscription',
      description: 'Subscription canceled by user',
    });

    return NextResponse.json({ success: true, message: 'Subscription canceled successfully' });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
