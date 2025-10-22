import { supabase } from './supabase';

interface CheckoutSessionParams {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
}

export async function createCheckoutSession(params: CheckoutSessionParams) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  const requestBody: any = {
    price_id: params.priceId,
    mode: params.mode,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };

  if (params.promoCode) {
    requestBody.promo_code = params.promoCode;
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const { url } = await response.json();

  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL received');
  }
}

export async function createCustomerPortalSession(returnUrl: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-customer-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      return_url: returnUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create customer portal session');
  }

  const { url } = await response.json();

  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No portal URL received');
  }
}