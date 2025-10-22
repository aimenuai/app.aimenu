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

const MISSING_CUSTOMERS = [
  'cus_TECt65JyzZD8Gh',
  'cus_TECe9gPxI9BygU',
  'cus_TEBGVdH64PceI0',
  'cus_TEAGkyYwBDbIFJ',
  'cus_TE6S3z47PjDEge',
  'cus_TE6OZX9yhPUvmq',
  'cus_TE6Jy1m3zmQq9b',
  'cus_TE6HdbR0pPEaPK',
  'cus_TE6FRdBg0auvbh',
  'cus_TE6BxtehhYZqBU',
  'cus_TE4iBABJoHhkEm',
  'cus_TE4D5uJcThh6x2',
  'cus_TE3ftzBf42wzFT',
  'cus_TE3TIOimHNFuQ1',
  'cus_TE0oK1yMBGshge',
  'cus_TDu2XnmLcEUSJt',
  'cus_TDsGMY33I3t6Cx',
  'cus_TDn56UFhyKWgnn',
  'cus_TDmxuL53g8y1RH',
  'cus_TDmtiC0A3d3o7g',
  'cus_TDmRx4zDm1E8G9',
  'cus_TDmDBANPaOSoZq',
  'cus_TDmAoeG5pOi3gD',
  'cus_TDm6UrjudaedHH',
  'cus_TDlkLrkJuEoA6K',
  'cus_TDlYEEwRhCKLID'
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const created = [];
    const errors = [];
    let counter = 1;

    for (const customerId of MISSING_CUSTOMERS) {
      try {
        const { data: existing } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (existing) {
          console.log(`Customer ${customerId} already exists, skipping`);
          continue;
        }

        const email = `demo${counter}@aimenu.com`;
        const password = `Demo${counter}!Pass2024`;
        const fullName = `Demo User ${counter}`;

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

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'client'
          });

        if (roleError) {
          throw new Error(`Failed to create role: ${roleError.message}`);
        }

        const { error: customerError } = await supabase
          .from('stripe_customers')
          .insert({
            user_id: userId,
            customer_id: customerId,
          });

        if (customerError) {
          throw new Error(`Failed to create stripe_customers: ${customerError.message}`);
        }

        const { error: clientError } = await supabase
          .from('reseller_clients')
          .insert({
            reseller_id: RESELLER_ID,
            client_id: userId,
          });

        if (clientError) {
          throw new Error(`Failed to create reseller_clients: ${clientError.message}`);
        }

        created.push({
          email,
          customer_id: customerId,
          user_id: userId,
        });

        console.log(`Created user ${counter}: ${email} -> ${customerId}`);
        counter++;

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
        created: created.length,
        errors: errors.length,
        details: { created, errors }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('Error in create-missing-customers:', error);
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
