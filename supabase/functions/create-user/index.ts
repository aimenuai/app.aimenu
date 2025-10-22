import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      throw new Error("Unauthorized");
    }

    const { email, password, full_name, phone, role, reseller_id, source } = await req.json();

    if (!email || !password || !full_name || !role) {
      throw new Error("Missing required fields");
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("User creation failed");

    const { data: assignResult, error: assignError } = await supabaseAdmin.rpc(
      "assign_user_role_and_details",
      {
        target_user_id: newUser.user.id,
        new_role: role,
        user_full_name: full_name,
        reseller_id_param: reseller_id || null,
        caller_id_param: callerUser.id,
        source_param: source || 'admin',
      }
    );

    if (assignError) throw assignError;

    if (phone) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ phone })
        .eq("id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: newUser.user,
        assignment: assignResult,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});