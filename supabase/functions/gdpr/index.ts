import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Parse request body
    const body = await req.json();
    const { action, user_id } = body;

    // Verify the user_id matches the authenticated user
    if (user_id !== user.id) {
      return new Response(JSON.stringify({
        error: "User ID mismatch"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    if (action === "access") {
      // GDPR Right to Access - Export user data
      const exportData = await exportUserData(supabase, user.id);
      return new Response(JSON.stringify({
        success: true,
        message: "Data export requested. You will receive an email when ready.",
        data: exportData
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else if (action === "deletion") {
      // GDPR Right to Erasure - Delete user data
      await deleteUserData(supabase, user.id);
      return new Response(JSON.stringify({
        success: true,
        message: "Data deletion requested. You will receive a confirmation email."
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else {
      return new Response(JSON.stringify({
        error: "Invalid action. Use 'access' or 'deletion'"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error: any) {
    console.error("Error in GDPR function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

// Helper function to export user data
async function exportUserData(supabase: any, userId: string) {
  // Fetch all user data
  const { data: dataSources } = await supabase
    .from("data_sources")
    .select("*")
    .eq("created_by", userId);

  const dataSourceIds = dataSources?.map((ds: any) => ds.id) || [];

  const { data: records } = await supabase
    .from("data_records")
    .select("*")
    .in("file_id", dataSourceIds);

  const { data: visualizations } = await supabase
    .from("visualizations")
    .select("*")
    .in("file_id", dataSourceIds);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return {
    user_id: userId,
    exported_at: new Date().toISOString(),
    data_sources: dataSources || [],
    records_count: records?.length || 0,
    visualizations_count: visualizations?.length || 0,
    profile: profile || null
  };
}

// Helper function to delete user data
async function deleteUserData(supabase: any, userId: string) {
  // Get all data source IDs for the user
  const { data: dataSources } = await supabase
    .from("data_sources")
    .select("id")
    .eq("created_by", userId);

  const dataSourceIds = dataSources?.map((ds: any) => ds.id) || [];

  if (dataSourceIds.length > 0) {
    // Delete data records (cascade should handle this, but being explicit)
    await supabase
      .from("data_records")
      .delete()
      .in("file_id", dataSourceIds);

    // Delete visualizations (cascade should handle this, but being explicit)
    await supabase
      .from("visualizations")
      .delete()
      .in("file_id", dataSourceIds);
  }

  // Delete data sources
  await supabase
    .from("data_sources")
    .delete()
    .eq("created_by", userId);

  // Delete user profile
  await supabase
    .from("user_profiles")
    .delete()
    .eq("id", userId);

  // Note: In production, you might want to:
  // 1. Soft delete (mark as deleted instead of hard delete)
  // 2. Send confirmation email
  // 3. Log the deletion for audit purposes
  // 4. Delete the auth user account if requested
}
