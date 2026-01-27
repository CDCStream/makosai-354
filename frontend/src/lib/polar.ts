// Polar.sh product configuration
export const POLAR_PRODUCTS = {
  // Subscription plans
  subscriptions: {
    starter: {
      productId: '244da7c4-b810-494c-b712-bb34d7adff77',
      name: 'Starter',
      credits: 35,
      price: 7.99,
    },
    pro: {
      productId: '7d235520-3239-4823-91c5-cdf069882a29',
      name: 'Pro',
      credits: 70,
      price: 14.99,
    },
    ultra: {
      productId: '2a031eef-64db-48cd-ba07-e50680d2c42b',
      name: 'Ultra',
      credits: 150,
      price: 29.99,
    },
  },
  // One-time credit packs
  creditPacks: {
    credits_10: {
      productId: 'f4b49fe8-8975-4f19-9f54-a49be6d19b25',
      credits: 15,
      price: 3.99,
    },
    credits_20: {
      productId: '5fc143c8-6af1-4bb5-ab18-8350a9919a9c',
      credits: 30,
      price: 6.99,
    },
    credits_50: {
      productId: 'ac8db116-617c-4686-afd4-8f0667d1ce83',
      credits: 75,
      price: 16.99,
    },
    credits_100: {
      productId: 'e9c6ee59-2b45-4c27-b32a-422f75134edd',
      credits: 150,
      price: 32.99,
    },
  },
} as const;

// Generate checkout URL with metadata
export function getCheckoutUrl(
  productId: string,
  userId: string,
  credits: number,
  productType: 'subscription' | 'credits',
  plan?: string
): string {
  const baseUrl = '/api/checkout';
  const params = new URLSearchParams({
    productId,
    metadata: JSON.stringify({
      user_id: userId,
      credits: credits.toString(),
      product_type: productType,
      plan: plan || 'free',
    }),
  });

  return `${baseUrl}?${params.toString()}`;
}

