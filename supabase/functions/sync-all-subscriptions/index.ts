import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Starting sync of all Stripe subscriptions...');

    let hasMore = true;
    let startingAfter: string | undefined;
    let totalSynced = 0;
    let totalErrors = 0;
    const errors: Array<{ subscription_id: string; customer_id: string; error: string }> = [];

    while (hasMore) {
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        status: 'all',
        expand: ['data.customer', 'data.default_payment_method'],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      console.log(`Fetched ${subscriptions.data.length} subscriptions from Stripe`);

      for (const subscription of subscriptions.data) {
        try {
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

          if (!customerId) {
            console.error(`No customer ID for subscription ${subscription.id}`);
            errors.push({
              subscription_id: subscription.id,
              customer_id: 'N/A',
              error: 'No customer ID found'
            });
            totalErrors++;
            continue;
          }

          const { data: customerData } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .maybeSingle();

          if (!customerData) {
            console.warn(`No user found for customer ${customerId}, skipping subscription ${subscription.id}`);
            errors.push({
              subscription_id: subscription.id,
              customer_id: customerId,
              error: 'No user found in stripe_customers table'
            });
            totalErrors++;
            continue;
          }

          const { data: promoUsage } = await supabase
            .from('promo_code_usage')
            .select('promo_code_id, discount_amount')
            .eq('customer_id', customerId)
            .order('applied_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const paymentMethod = typeof subscription.default_payment_method !== 'string'
            ? subscription.default_payment_method
            : null;

          const { error: subError } = await supabase
            .from('stripe_subscriptions')
            .upsert(
              {
                customer_id: customerId,
                user_id: customerData.user_id,
                subscription_id: subscription.id,
                price_id: subscription.items.data[0]?.price?.id || null,
                current_period_start: subscription.current_period_start || null,
                current_period_end: subscription.current_period_end || null,
                cancel_at_period_end: subscription.cancel_at_period_end || false,
                payment_method_brand: paymentMethod?.card?.brand || null,
                payment_method_last4: paymentMethod?.card?.last4 || null,
                status: subscription.status,
                promo_code_id: promoUsage?.promo_code_id || null,
                discount_amount: promoUsage?.discount_amount || null,
                created_at: new Date(subscription.created * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'subscription_id',
              }
            );

          if (subError) {
            console.error(`Error syncing subscription ${subscription.id}:`, subError);
            errors.push({
              subscription_id: subscription.id,
              customer_id: customerId,
              error: `Database error: ${subError.message}`
            });
            totalErrors++;
          } else {
            totalSynced++;

            if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
              await cancelCommissionsForSubscription(subscription.id);
            } else if (promoUsage?.promo_code_id && subscription.status === 'active') {
              await createCommissionForSubscription(subscription, customerId, promoUsage.promo_code_id, promoUsage.discount_amount || 0);
            }
          }
        } catch (err: any) {
          console.error(`Error processing subscription ${subscription.id}:`, err);
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || 'N/A';
          errors.push({
            subscription_id: subscription.id,
            customer_id: customerId,
            error: err.message || 'Unknown error'
          });
          totalErrors++;
        }
      }

      hasMore = subscriptions.has_more;
      if (hasMore && subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    console.log(`Sync complete. Synced: ${totalSynced}, Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        errors: totalErrors,
        errorDetails: errors,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error syncing subscriptions:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function cancelCommissionsForSubscription(subscriptionId: string) {
  try {
    const { error } = await supabase
      .from('reseller_commissions')
      .update({ status: 'cancelled' })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'pending');

    if (error) {
      console.error(`Error cancelling commissions for subscription ${subscriptionId}:`, error);
    }
  } catch (error) {
    console.error(`Error in cancelCommissionsForSubscription:`, error);
  }
}

async function createCommissionForSubscription(
  subscription: Stripe.Subscription,
  customerId: string,
  promoCodeId: string,
  discountAmount: number
) {
  try {
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!customerData) {
      return;
    }

    const { data: promoCodeData } = await supabase
      .from('reseller_promo_codes')
      .select('reseller_id, commission_rate, discount_percent')
      .eq('id', promoCodeId)
      .maybeSingle();

    if (!promoCodeData) {
      return;
    }

    const { data: existingCommission } = await supabase
      .from('reseller_commissions')
      .select('id')
      .eq('subscription_id', subscription.id)
      .eq('period_start', new Date(subscription.current_period_start * 1000).toISOString())
      .maybeSingle();

    if (existingCommission) {
      return;
    }

    const basePrice = 39900;
    const discountPercent = promoCodeData.discount_percent || 0;
    const finalAmount = basePrice * (1 - Number(discountPercent) / 100);
    const commissionAmount = Math.round(finalAmount * Number(promoCodeData.commission_rate) / 100);

    await supabase
      .from('reseller_commissions')
      .insert({
        reseller_id: promoCodeData.reseller_id,
        user_id: customerData.user_id,
        subscription_id: subscription.id,
        promo_code_id: promoCodeId,
        commission_amount: commissionAmount,
        commission_rate: promoCodeData.commission_rate,
        currency: 'eur',
        status: 'pending',
        period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });
  } catch (error) {
    console.error(`Error in createCommissionForSubscription:`, error);
  }
}
