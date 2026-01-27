import { Webhooks } from "@polar-sh/nextjs";
import { getSupabase } from "@/lib/supabase";
import { PLANS } from "@/lib/credits";

// Helper to get plan credits
function getPlanCredits(plan: string): number {
  const planData = PLANS[plan as keyof typeof PLANS];
  return planData?.credits || 5;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    const supabase = getSupabase();

    // Handle different webhook events
    switch (payload.type) {
      case "checkout.created":
        console.log("🛒 Checkout created:", payload.data.id);
        break;

      case "checkout.updated":
        console.log("🔄 Checkout updated:", payload.data.id);

        // If checkout is confirmed/succeeded
        if (payload.data.status === "succeeded") {
          const metadata = payload.data.metadata as Record<string, string> | undefined;
          const userId = metadata?.user_id;
          const creditsToAdd = parseInt(metadata?.credits || "0");
          const productType = metadata?.product_type; // 'subscription' or 'credits'
          const plan = metadata?.plan;

          if (userId && creditsToAdd > 0) {
            if (productType === "credits") {
              // EXTRA CREDIT PACKS: Add to existing credits (cumulative)
              const { data: userCredits } = await supabase
                .from("user_credits")
                .select("credits")
                .eq("user_id", userId)
                .single();

              const currentCredits = userCredits?.credits || 0;
              const newCredits = currentCredits + creditsToAdd;

              await supabase
                .from("user_credits")
                .upsert({
                  user_id: userId,
                  credits: newCredits,
                  updated_at: new Date().toISOString(),
                });

              await supabase.from("credit_transactions").insert({
                user_id: userId,
                amount: creditsToAdd,
                type: "purchase",
                description: `Purchased ${creditsToAdd} extra credits`,
              });

              console.log(`✅ Added ${creditsToAdd} extra credits to user ${userId} (total: ${newCredits})`);
            } else if (productType === "subscription") {
              // SUBSCRIPTION: Reset credits to plan amount
              const planCredits = getPlanCredits(plan || "free");

              await supabase
                .from("user_credits")
                .upsert({
                  user_id: userId,
                  credits: planCredits,
                  plan: plan || "free",
                  plan_started_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

              await supabase.from("credit_transactions").insert({
                user_id: userId,
                amount: planCredits,
                type: "subscription",
                description: `${plan?.charAt(0).toUpperCase()}${plan?.slice(1)} plan - ${planCredits} monthly credits`,
              });

              console.log(`✅ Subscription activated: ${plan} plan with ${planCredits} credits for user ${userId}`);
            }
          }
        }
        break;

      case "subscription.created":
        console.log("📦 Subscription created:", payload.data.id);
        // Save subscription ID for future cancellation
        const subCreatedMetadata = payload.data.metadata as Record<string, string> | undefined;
        const subCreatedUserId = subCreatedMetadata?.user_id;

        if (subCreatedUserId) {
          await supabase
            .from("user_credits")
            .update({
              polar_subscription_id: payload.data.id,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", subCreatedUserId);

          console.log(`📝 Saved subscription ID ${payload.data.id} for user ${subCreatedUserId}`);
        }
        break;

      case "subscription.updated":
        console.log("🔄 Subscription updated:", payload.data.id);
        break;

      // Handle subscription renewal (monthly payment successful)
      case "order.paid":
        console.log("💰 Order paid:", payload.data.id);

        const orderMetadata = payload.data.metadata as Record<string, string> | undefined;
        const orderUserId = orderMetadata?.user_id;
        const orderPlan = orderMetadata?.plan;
        const orderProductType = orderMetadata?.product_type;

        // Only process subscription renewals, not one-time purchases
        if (orderUserId && orderProductType === "subscription" && orderPlan) {
          const planCredits = getPlanCredits(orderPlan);

          // Reset credits to plan amount (subscription renewal)
          await supabase
            .from("user_credits")
            .update({
              credits: planCredits,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", orderUserId);

          await supabase.from("credit_transactions").insert({
            user_id: orderUserId,
            amount: planCredits,
            type: "subscription",
            description: `Monthly renewal - ${orderPlan?.charAt(0).toUpperCase()}${orderPlan?.slice(1)} plan (${planCredits} credits)`,
          });

          console.log(`🔄 Subscription renewed: ${planCredits} credits for user ${orderUserId}`);
        }
        break;

      case "subscription.canceled":
        console.log("❌ Subscription canceled:", payload.data.id);
        // Downgrade user to free plan (keep remaining credits)
        const subMetadata = payload.data.metadata as Record<string, string> | undefined;
        const subUserId = subMetadata?.user_id;

        if (subUserId) {
          await supabase
            .from("user_credits")
            .update({
              plan: "free",
              updated_at: new Date().toISOString()
            })
            .eq("user_id", subUserId);

          await supabase.from("credit_transactions").insert({
            user_id: subUserId,
            amount: 0,
            type: "subscription",
            description: "Subscription canceled - downgraded to Free plan",
          });

          console.log(`⬇️ Downgraded user ${subUserId} to free plan`);
        }
        break;

      default:
        console.log("📨 Webhook event:", payload.type);
    }
  },
});
