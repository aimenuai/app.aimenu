import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: resellerProfile, error: resellerError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (resellerError || !resellerProfile || resellerProfile.role !== 'reseller') {
      return new Response(
        JSON.stringify({ error: 'Only resellers can invite clients' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, role, reseller_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    let clientUserId: string;

    if (existingUser) {
      clientUserId = existingUser.id;

      if (existingUser.role === 'reseller' || existingUser.role === 'admin') {
        return new Response(
          JSON.stringify({ error: 'Cannot invite a reseller or admin as a client' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingUser.reseller_id && existingUser.reseller_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'This client is already linked to another reseller' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existingUser.reseller_id) {
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            reseller_id: user.id,
            source: 'reseller'
          })
          .eq('id', clientUserId);

        if (updateError) {
          throw new Error(`Failed to update client reseller: ${updateError.message}`);
        }
      }
    } else {
      const temporaryPassword = crypto.randomUUID();

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          role: 'client',
          reseller_id: user.id,
        }
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!newUser.user) {
        throw new Error('Failed to create user: No user returned');
      }

      clientUserId = newUser.user.id;

      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: clientUserId,
          email: normalizedEmail,
          full_name: normalizedEmail.split('@')[0],
          role: 'client',
          reseller_id: user.id,
          source: 'reseller'
        });

      if (profileError) {
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }
    }

    const { data: existingLink } = await supabaseAdmin
      .from('reseller_clients')
      .select('id')
      .eq('reseller_id', user.id)
      .eq('client_id', clientUserId)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkError } = await supabaseAdmin
        .from('reseller_clients')
        .insert({
          reseller_id: user.id,
          client_id: clientUserId
        });

      if (linkError) {
        console.error('Failed to create reseller_clients link:', linkError);
      }
    }

    const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('cdn.', 'www.') || 'https://www.aimenu.ai'}/login`;

    const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (magicLinkError) {
      throw new Error(`Failed to send magic link: ${magicLinkError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser
          ? 'Magic link sent to existing client'
          : 'Client invited successfully. Magic link sent.',
        client_id: clientUserId
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in invite-client:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
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
