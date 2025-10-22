import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode, id: sessionId } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);

      // Capture promo code information from checkout session
      await capturePromoCodeUsage(sessionId, customerId);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    }
  }
}

async function capturePromoCodeUsage(sessionId: string, customerId: string) {
  try {
    // Retrieve the full checkout session with expanded discount information
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['total_details.breakdown', 'line_items.data.discounts'],
    });

    console.info(`Checkout session retrieved: ${sessionId}`);

    // Check if any discounts were applied
    if (!session.total_details?.breakdown?.discounts || session.total_details.breakdown.discounts.length === 0) {
      console.info(`No discounts applied to session: ${sessionId}`);
      return;
    }

    // Get user_id from customer_id
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerError || !customerData) {
      console.error(`Error fetching user for customer ${customerId}:`, customerError);
      return;
    }

    const userId = customerData.user_id;

    // Process each discount
    for (const discount of session.total_details.breakdown.discounts) {
      const discountAmount = discount.amount;
      const promotionCodeId = discount.discount?.promotion_code;

      if (!promotionCodeId) {
        console.info(`Discount found but no promotion code ID for session ${sessionId}`);
        continue;
      }

      // Retrieve the promotion code details from Stripe
      const promotionCode = await stripe.promotionCodes.retrieve(promotionCodeId as string);
      console.info(`Promotion code retrieved: ${promotionCode.code}`);

      // Find matching promo code in database
      const { data: promoCodeData, error: promoError } = await supabase
        .from('reseller_promo_codes')
        .select('id, reseller_id')
        .eq('promo_code_stripe_id', promotionCodeId)
        .maybeSingle();

      if (promoError) {
        console.error(`Error fetching promo code for ${promotionCodeId}:`, promoError);
      }

      // Store promo code usage
      const { error: usageError } = await supabase.from('promo_code_usage').insert({
        checkout_session_id: sessionId,
        customer_id: customerId,
        user_id: userId,
        promo_code_id: promoCodeData?.id || null,
        promo_code_stripe_id: promotionCodeId as string,
        discount_amount: discountAmount,
        currency: session.currency || 'eur',
      });

      if (usageError) {
        console.error(`Error storing promo code usage:`, usageError);
      } else {
        console.info(`Promo code usage recorded for session ${sessionId}`);

        // Update user profile with promo code and reseller if not already set
        if (promoCodeData?.id && promoCodeData?.reseller_id) {
          await supabase
            .from('user_profiles')
            .update({ 
              promo_code_id: promoCodeData.id,
              reseller_id: promoCodeData.reseller_id,
              source: 'reseller'
            })
            .eq('id', userId)
            .is('promo_code_id', null);

          // Create entry in reseller_clients table
          await supabase
            .from('reseller_clients')
            .insert({
              reseller_id: promoCodeData.reseller_id,
              client_id: userId
            })
            .select()
            .maybeSingle();
        }
      }
    }
  } catch (error) {
    console.error(`Error capturing promo code usage for session ${sessionId}:`, error);
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // Get user_id from customer_id first
    const { data: customerData, error: customerLookupError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerLookupError) {
      console.error('Error fetching user_id for customer:', customerLookupError);
      throw new Error('Failed to fetch user_id for customer');
    }

    if (!customerData?.user_id) {
      console.error(`No user_id found for customer: ${customerId}`);
      throw new Error('No user_id found for customer');
    }

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          user_id: customerData.user_id,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // Get promo code information for this subscription
    const { data: promoUsage } = await supabase
      .from('promo_code_usage')
      .select('promo_code_id, discount_amount')
      .eq('customer_id', customerId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        user_id: customerData.user_id,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
        promo_code_id: promoUsage?.promo_code_id || null,
        discount_amount: promoUsage?.discount_amount || null,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);

    // Handle commission based on subscription status
    if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
      // Cancel any pending commissions for this subscription
      await cancelCommissionsForSubscription(subscription.id);
    } else if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Create commission for any active/trialing subscription from a reseller's client
      await createCommissionForSubscription(subscription, customerId, promoUsage?.promo_code_id || null, promoUsage?.discount_amount || 0);
    }
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function cancelCommissionsForSubscription(subscriptionId: string) {
  try {
    // Mark all pending commissions for this subscription as cancelled
    const { error } = await supabase
      .from('reseller_commissions')
      .update({ status: 'cancelled' })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'pending');

    if (error) {
      console.error(`Error cancelling commissions for subscription ${subscriptionId}:`, error);
    } else {
      console.info(`Cancelled pending commissions for subscription ${subscriptionId}`);
    }
  } catch (error) {
    console.error(`Error in cancelCommissionsForSubscription:`, error);
  }
}

async function createCommissionForSubscription(
  subscription: Stripe.Subscription,
  customerId: string,
  promoCodeId: string | null,
  discountAmount: number
) {
  try {
    // Get user_id and reseller_id from customer
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!customerData || !customerData.user_id) {
      console.error(`Customer not found for ${customerId}`);
      return;
    }

    // Get user profile to check if they have a reseller
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('reseller_id')
      .eq('id', customerData.user_id)
      .maybeSingle();

    if (!userProfile || !userProfile.reseller_id) {
      console.info(`User ${customerData.user_id} has no reseller - no commission needed`);
      return;
    }

    // Check if commission already exists for this subscription
    const { data: existingCommission } = await supabase
      .from('reseller_commissions')
      .select('id')
      .eq('subscription_id', subscription.id)
      .maybeSingle();

    if (existingCommission) {
      console.info(`Commission already exists for subscription ${subscription.id}`);
      return;
    }

    // Get commission rate from promo code if provided, otherwise use default 50%
    let commissionRate = 50.00;
    if (promoCodeId) {
      const { data: promoCodeData } = await supabase
        .from('reseller_promo_codes')
        .select('commission_rate')
        .eq('id', promoCodeId)
        .maybeSingle();

      if (promoCodeData?.commission_rate) {
        commissionRate = Number(promoCodeData.commission_rate);
      }
    }

    // Calculate commission amount
    // Base price is €399 = 39900 cents
    const basePrice = 39900;
    const finalAmount = basePrice - discountAmount;
    const commissionAmount = Math.round(finalAmount * commissionRate / 100);

    // Create commission record
    const { error: commissionError } = await supabase
      .from('reseller_commissions')
      .insert({
        reseller_id: userProfile.reseller_id,
        user_id: customerData.user_id,
        subscription_id: subscription.id,
        promo_code_id: promoCodeId,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        currency: 'eur',
        status: 'pending',
        period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });

    if (commissionError) {
      console.error(`Error creating commission:`, commissionError);
    } else {
      console.info(`Commission created for subscription ${subscription.id}: ${commissionAmount} cents (${commissionRate}% of ${finalAmount} cents)`);
    }
  } catch (error) {
    console.error(`Error in createCommissionForSubscription:`, error);
  }
}
