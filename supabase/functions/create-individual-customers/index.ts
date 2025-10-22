import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const RESELLER_ID = '1bb68914-1890-43db-86a2-3a93a12986cc';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get all unique customers that need individual users
    const { data: customers, error: fetchError } = await supabase
      .from('stripe_subscriptions')
      .select('customer_id')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch customers: ${fetchError.message}`);
    }

    const uniqueCustomers = [...new Set(customers.map(c => c.customer_id))];

    const created = [];
    const errors = [];
    const skipped = [];

    for (let i = 0; i < uniqueCustomers.length; i++) {
      const customerId = uniqueCustomers[i];

      try {
        // Check current user for this customer
        const { data: existingCustomer } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (!existingCustomer) {
          errors.push({ customer_id: customerId, error: 'No stripe_customer record found' });
          continue;
        }

        // Check if this user already has a proper profile (not shared)
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .eq('id', existingCustomer.user_id)
          .maybeSingle();

        // If the user is already unique (not "Demo User 1"), skip
        if (userProfile && userProfile.full_name !== 'Demo User 1') {
          skipped.push({ customer_id: customerId, user_id: existingCustomer.user_id, reason: 'Already has unique user' });
          continue;
        }

        const email = `client${i + 1}@aimenu.com`;
        const password = `Client${i + 1}!Pass2024`;
        const fullName = `Client ${i + 1}`;

        // Create new auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          }
        });

        if (authError || !authData.user) {
          throw new Error(`Failed to create auth user: ${authError?.message}`);
        }

        const userId = authData.user.id;

        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            full_name: fullName,
            role: 'client',
            reseller_id: RESELLER_ID,
            source: 'reseller',
            is_disabled: false,
          });

        if (profileError) {
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'client'
          });

        if (roleError) {
          throw new Error(`Failed to create role: ${roleError.message}`);
        }

        // Update stripe_customers to point to new user
        const { error: updateCustomerError } = await supabase
          .from('stripe_customers')
          .update({ user_id: userId })
          .eq('customer_id', customerId);

        if (updateCustomerError) {
          throw new Error(`Failed to update stripe_customer: ${updateCustomerError.message}`);
        }

        // Update stripe_subscriptions to point to new user
        const { error: updateSubError } = await supabase
          .from('stripe_subscriptions')
          .update({ user_id: userId })
          .eq('customer_id', customerId);

        if (updateSubError) {
          throw new Error(`Failed to update subscription: ${updateSubError.message}`);
        }

        // Create reseller_clients link
        const { error: clientError } = await supabase
          .from('reseller_clients')
          .insert({
            reseller_id: RESELLER_ID,
            client_id: userId,
          });

        if (clientError && clientError.code !== '23505') { // Ignore duplicate key errors
          throw new Error(`Failed to create reseller_clients: ${clientError.message}`);
        }

        created.push({
          email,
          customer_id: customerId,
          user_id: userId,
        });

        console.log(`Created user ${i + 1}: ${email} -> ${customerId}`);

      } catch (error: any) {
        console.error(`Error processing ${customerId}:`, error);
        errors.push({
          customer_id: customerId,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_customers: uniqueCustomers.length,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
        details: { created, skipped, errors }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('Error in create-individual-customers:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
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
