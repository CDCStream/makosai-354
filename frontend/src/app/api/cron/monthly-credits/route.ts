import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { PLANS } from "@/lib/credits";

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
// Run at the start of each month to refresh credits for all users

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();
    const now = new Date();
    const results = {
      free: { updated: 0, errors: 0 },
      starter: { updated: 0, errors: 0 },
      pro: { updated: 0, errors: 0 },
      ultra: { updated: 0, errors: 0 },
    };

    // Get all users grouped by plan
    const { data: users, error: fetchError } = await supabase
      .from("user_credits")
      .select("user_id, plan, credits, plan_started_at");

    if (fetchError) {
      console.error("Error fetching users:", fetchError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Process each user
    for (const user of users || []) {
      const plan = user.plan as keyof typeof PLANS;
      const planCredits = PLANS[plan]?.credits || 5;

      // For FREE plan: Check if it's been a month since last credit refresh
      // For SUBSCRIPTIONS: Credits are refreshed via Polar webhook (order.paid)
      if (plan === "free") {
        // Check if user should receive monthly free credits
        const planStartDate = new Date(user.plan_started_at || now);
        const daysSinceStart = Math.floor(
          (now.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if a month has passed (roughly 30 days)
        // This should run monthly, so we check if we're in a new month
        const lastCreditMonth = planStartDate.getMonth();
        const currentMonth = now.getMonth();

        // If same month and same year, skip
        if (
          lastCreditMonth === currentMonth &&
          planStartDate.getFullYear() === now.getFullYear()
        ) {
          continue;
        }

        // Reset credits to plan amount
        const { error: updateError } = await supabase
          .from("user_credits")
          .update({
            credits: planCredits,
            plan_started_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("user_id", user.user_id);

        if (updateError) {
          console.error(`Error updating user ${user.user_id}:`, updateError);
          results.free.errors++;
          continue;
        }

        // Log transaction
        await supabase.from("credit_transactions").insert({
          user_id: user.user_id,
          amount: planCredits,
          type: "bonus",
          description: `Monthly free credits - ${planCredits} credits`,
        });

        results.free.updated++;
        console.log(`✅ Refreshed ${planCredits} free credits for user ${user.user_id}`);
      }
    }

    console.log("📊 Monthly credits refresh completed:", results);

    return NextResponse.json({
      success: true,
      message: "Monthly credits refresh completed",
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Also support GET for easy testing (protected by same auth)
export async function GET(request: NextRequest) {
  return POST(request);
}



