import { Webhooks } from "@polar-sh/nextjs";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/credits";

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get plan credits
function getPlanCredits(plan: string): number {
  const planData = PLANS[plan as keyof typeof PLANS];
  return planData?.credits || 5;
}

// Helper to find user by email
async function findUserByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error || !data) {
    console.error("Error listing users:", error);
    return null;
  }
  const user = data.users.find(u => u.email === email);
  return user?.id || null;
}

// Helper to detect plan from Polar product
function detectPlanFromProduct(productId: string): { plan: string; credits: number } | null {
  const productPlans: Record<string, { plan: string; credits: number }> = {
    // Monthly subscriptions
    '244da7c4-b810-494c-b712-bb34d7adff77': { plan: 'starter', credits: 100 },
    '7d235520-3239-4823-91c5-cdf069882a29': { plan: 'pro', credits: 200 },
    '2a031eef-64db-48cd-ba07-e50680d2c42b': { plan: 'ultra', credits: 400 },
    // Yearly subscriptions
    '41f1d15e-329d-4adc-8fdc-30b1962d23f7': { plan: 'starter', credits: 100 },
    '81b9d8f3-e101-41b8-8014-5f627aea60d6': { plan: 'pro', credits: 200 },
    '0c6bc052-2a24-429c-ac56-6643d0fd3fed': { plan: 'ultra', credits: 400 },
  };
  return productPlans[productId] || null;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    // Log full payload for debugging
    console.log("📦 Webhook received:", payload.type);
    console.log("📦 Full payload data:", JSON.stringify(payload.data, null, 2));

    // Handle different webhook events
    switch (payload.type) {
      case "checkout.created":
        console.log("🛒 Checkout created:", payload.data.id);
        break;

      case "checkout.updated":
        console.log("🔄 Checkout updated:", payload.data.id);
        console.log("🔄 Checkout status:", payload.data.status);

        // If checkout is confirmed/succeeded
        if (payload.data.status === "succeeded") {
          const metadata = payload.data.metadata as Record<string, string> | undefined;
          const customerEmail = (payload.data as Record<string, unknown>).customerEmail as string | undefined;

          console.log("✅ Payment succeeded!");
          console.log("📧 Customer email:", customerEmail);
          console.log("📝 Metadata:", JSON.stringify(metadata, null, 2));

          // Try to get user_id from metadata, or find by email
          let userId = metadata?.user_id;

          if (!userId && customerEmail) {
            console.log("🔍 No user_id in metadata, searching by email...");
            userId = await findUserByEmail(customerEmail) || undefined;
            console.log("🔍 Found user_id by email:", userId);
          }

          if (!userId) {
            console.error("❌ Could not find user for checkout:", payload.data.id);
            break;
          }

          // Try to detect plan from product if not in metadata
          let productType = metadata?.product_type;
          let plan = metadata?.plan;
          let creditsToAdd = parseInt(metadata?.credits || "0");

          // Check product_id to detect subscription type
          const productId = (payload.data as Record<string, unknown>).product_id as string;
          if (productId && !plan) {
            const detected = detectPlanFromProduct(productId);
            if (detected) {
              plan = detected.plan;
              creditsToAdd = detected.credits;
              productType = "subscription";
              console.log("🔍 Detected plan from product:", plan, "credits:", creditsToAdd);
            }
          }

          console.log("📝 Final processing - userId:", userId, "credits:", creditsToAdd, "type:", productType, "plan:", plan);

          if (productType === "credits" && creditsToAdd > 0) {
            // EXTRA CREDIT PACKS: Add to existing credits (cumulative)
            const { data: userCredits } = await supabaseAdmin
              .from("user_credits")
              .select("credits")
              .eq("user_id", userId)
              .single();

            const currentCredits = userCredits?.credits || 0;
            const newCredits = currentCredits + creditsToAdd;

            // Update existing record
            const { error: updateError } = await supabaseAdmin
              .from("user_credits")
              .update({
                credits: newCredits,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);

            if (updateError) {
              console.error("❌ Error updating credits:", updateError);
            }

            await supabaseAdmin.from("credit_transactions").insert({
              user_id: userId,
              amount: creditsToAdd,
              type: "purchase",
              description: `Purchased ${creditsToAdd} extra credits`,
            });

            console.log(`✅ Added ${creditsToAdd} extra credits to user ${userId} (total: ${newCredits})`);
          } else if (productType === "subscription" && plan) {
            // SUBSCRIPTION: Reset credits to plan amount
            const planCredits = getPlanCredits(plan);

            // First try to update existing record
            const { data: existingUser, error: selectError } = await supabaseAdmin
              .from("user_credits")
              .select("id")
              .eq("user_id", userId)
              .single();

            if (existingUser) {
              // Update existing record
              const { error: updateError } = await supabaseAdmin
                .from("user_credits")
                .update({
                  credits: planCredits,
                  plan: plan,
                  plan_started_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId);

              if (updateError) {
                console.error("❌ Error updating user_credits:", updateError);
              } else {
                console.log(`✅ Updated user_credits: plan=${plan}, credits=${planCredits}`);
              }
            } else {
              // Insert new record
              const { error: insertError } = await supabaseAdmin
                .from("user_credits")
                .insert({
                  user_id: userId,
                  credits: planCredits,
                  plan: plan,
                  plan_started_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

              if (insertError) {
                console.error("❌ Error inserting user_credits:", insertError);
              } else {
                console.log(`✅ Inserted user_credits: plan=${plan}, credits=${planCredits}`);
              }
            }

            const { error: txError } = await supabaseAdmin.from("credit_transactions").insert({
              user_id: userId,
              amount: planCredits,
              type: "subscription",
              description: `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan - ${planCredits} monthly credits`,
            });

            if (txError) {
              console.error("❌ Error inserting transaction:", txError);
            }

            console.log(`✅ Subscription activated: ${plan} plan with ${planCredits} credits for user ${userId}`);
          } else {
            console.log("⚠️ Unknown product type or missing data, skipping credit update");
          }
        }
        break;

      case "subscription.created":
        console.log("📦 Subscription created:", payload.data.id);
        // Save subscription ID for future cancellation
        const subCreatedMetadata = payload.data.metadata as Record<string, string> | undefined;
        let subCreatedUserId = subCreatedMetadata?.user_id;

        // Try to find by email if no user_id
        if (!subCreatedUserId) {
          const subEmail = (payload.data as Record<string, unknown>).customerEmail as string;
          if (subEmail) {
            subCreatedUserId = await findUserByEmail(subEmail) || undefined;
          }
        }

        if (subCreatedUserId) {
          await supabaseAdmin
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
        let orderUserId = orderMetadata?.user_id;
        let orderPlan = orderMetadata?.plan;
        const orderProductType = orderMetadata?.product_type;

        // Try to find by email if no user_id
        if (!orderUserId) {
          const orderEmail = (payload.data as Record<string, unknown>).customerEmail as string;
          if (orderEmail) {
            orderUserId = await findUserByEmail(orderEmail) || undefined;
          }
        }

        // Try to detect plan from product
        const orderProductId = (payload.data as Record<string, unknown>).product_id as string;
        if (!orderPlan && orderProductId) {
          const detected = detectPlanFromProduct(orderProductId);
          if (detected) {
            orderPlan = detected.plan;
          }
        }

        // Only process subscription renewals
        if (orderUserId && orderPlan) {
          const planCredits = getPlanCredits(orderPlan);

          // Reset credits to plan amount (subscription renewal)
          await supabaseAdmin
            .from("user_credits")
            .update({
              credits: planCredits,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", orderUserId);

          await supabaseAdmin.from("credit_transactions").insert({
            user_id: orderUserId,
            amount: planCredits,
            type: "subscription",
            description: `Monthly renewal - ${orderPlan.charAt(0).toUpperCase()}${orderPlan.slice(1)} plan (${planCredits} credits)`,
          });

          console.log(`🔄 Subscription renewed: ${planCredits} credits for user ${orderUserId}`);
        }
        break;

      case "subscription.canceled":
        console.log("❌ Subscription canceled:", payload.data.id);
        // Downgrade user to free plan (keep remaining credits)
        const subMetadata = payload.data.metadata as Record<string, string> | undefined;
        let subUserId = subMetadata?.user_id;

        // Try to find by email if no user_id
        if (!subUserId) {
          const cancelEmail = (payload.data as Record<string, unknown>).customerEmail as string;
          if (cancelEmail) {
            subUserId = await findUserByEmail(cancelEmail) || undefined;
          }
        }

        if (subUserId) {
          await supabaseAdmin
            .from("user_credits")
            .update({
              plan: "free",
              updated_at: new Date().toISOString()
            })
            .eq("user_id", subUserId);

          await supabaseAdmin.from("credit_transactions").insert({
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
