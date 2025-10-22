import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      appInfo: {
        name: 'Bolt Integration',
        version: '1.0.0',
      },
    });

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      throw new Error('Unauthorized');
    }

    // Verify caller is admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      throw new Error('Only admins can create promo codes');
    }

    const { reseller_id, promo_code_text, coupon_id, discount_percent, discount_amount, currency, commission_rate } = await req.json();

    if (!reseller_id) {
      throw new Error('reseller_id is required');
    }

    // Verify reseller exists and get their email
    const { data: resellerProfile, error: resellerError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, full_name')
      .eq('id', reseller_id)
      .maybeSingle();

    if (resellerError || !resellerProfile) {
      throw new Error('Reseller not found');
    }

    if (resellerProfile.role !== 'reseller') {
      throw new Error('User is not a reseller');
    }

    // Get reseller email from auth.users
    const { data: { user: resellerUser }, error: resellerUserError } = await supabaseAdmin.auth.admin.getUserById(reseller_id);
    
    if (resellerUserError || !resellerUser?.email) {
      throw new Error('Failed to get reseller email');
    }

    // Create or retrieve coupon in Stripe
    let stripeCoupon: Stripe.Coupon;
    
    if (coupon_id) {
      // Use existing coupon
      stripeCoupon = await stripe.coupons.retrieve(coupon_id);
    } else {
      // Create new coupon with reseller email as name
      const couponParams: Stripe.CouponCreateParams = {
        duration: 'repeating',
        duration_in_months: 12,
        name: resellerUser.email,
      };

      if (discount_percent) {
        couponParams.percent_off = discount_percent;
      } else if (discount_amount && currency) {
        couponParams.amount_off = Math.round(discount_amount * 100);
        couponParams.currency = currency.toLowerCase();
      } else {
        throw new Error('Either discount_percent or (discount_amount and currency) must be provided');
      }

      stripeCoupon = await stripe.coupons.create(couponParams);
    }

    // Generate promo code text if not provided
    const finalPromoCode = promo_code_text || `RESELLER${reseller_id.substring(0, 8).toUpperCase()}`;

    // Create promotion code in Stripe
    const promotionCode = await stripe.promotionCodes.create({
      code: finalPromoCode,
      coupon: stripeCoupon.id,
      metadata: {
        reseller_id: reseller_id,
        reseller_name: resellerProfile.full_name,
        reseller_email: resellerUser.email,
      },
    });

    console.log(`Created Stripe promotion code: ${promotionCode.id} with code: ${promotionCode.code}`);

    // Store in database
    const { data: dbPromoCode, error: dbError } = await supabaseAdmin
      .from('reseller_promo_codes')
      .insert({
        reseller_id: reseller_id,
        promo_code_stripe_id: promotionCode.id,
        promo_code_text: promotionCode.code,
        coupon_id: stripeCoupon.id,
        discount_percent: stripeCoupon.percent_off || null,
        discount_amount: stripeCoupon.amount_off ? stripeCoupon.amount_off / 100 : null,
        currency: stripeCoupon.currency || null,
        is_active: promotionCode.active,
        commission_rate: commission_rate || 50,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing promo code in database:', dbError);
      // Try to delete the Stripe promotion code to maintain consistency
      try {
        await stripe.promotionCodes.update(promotionCode.id, { active: false });
      } catch (cleanupError) {
        console.error('Failed to deactivate Stripe promotion code:', cleanupError);
      }
      throw new Error('Failed to store promo code in database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        promo_code: dbPromoCode,
        stripe_promotion_code: promotionCode,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error creating reseller promo code:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
