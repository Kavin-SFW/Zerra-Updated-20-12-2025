import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's tenant_id
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'access';
    const body = req.method === 'POST' ? await req.json() : {};

    switch (action) {
      case 'access':
        return handleDataAccess(supabaseClient, user.id, userProfile.tenant_id);
      case 'delete':
        return handleDataDeletion(supabaseClient, user.id, userProfile.tenant_id, body);
      case 'consent':
        return handleConsent(supabaseClient, user.id, userProfile.tenant_id, body, req.headers);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in GDPR function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleDataAccess(supabase: any, userId: string, tenantId: string) {
  // Collect all user data
  const userData: any = {};

  // User profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  userData.profile = profile;

  // Data sources
  const { data: dataSources } = await supabase
    .from('data_sources')
    .select('*')
    .eq('created_by', userId)
    .eq('tenant_id', tenantId);
  userData.data_sources = dataSources;

  // Analytics
  const { data: analytics } = await supabase
    .from('descriptive_analytics')
    .select('*')
    .eq('created_by', userId)
    .eq('tenant_id', tenantId);
  userData.analytics = analytics;

  // Chat sessions
  const { data: chatSessions } = await supabase
    .from('chat_sessions')
    .select('*, chat_messages(*)')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);
  userData.chat_sessions = chatSessions;

  // Predictions
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(100);
  userData.predictions = predictions;

  // Create request record
  const { data: request } = await supabase
    .from('gdpr_data_requests')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      request_type: 'access',
      status: 'completed',
      requested_data: { scope: 'all' },
      response_data: userData,
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
    .select()
    .single();

  return new Response(JSON.stringify({ 
    success: true, 
    data: userData,
    request_id: request?.id,
    expires_at: request?.expires_at
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleDataDeletion(supabase: any, userId: string, tenantId: string, body: any) {
  const { confirm } = body;

  if (confirm !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Deletion must be confirmed with confirm: "DELETE"' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create deletion request
  const { data: request } = await supabase
    .from('gdpr_data_requests')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      request_type: 'deletion',
      status: 'processing',
      requested_data: { scope: 'all' },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  const deletedTables: string[] = [];
  let deletedCount = 0;

  // Delete user's data sources
  const { data: dataSources } = await supabase
    .from('data_sources')
    .select('id')
    .eq('created_by', userId)
    .eq('tenant_id', tenantId);

  if (dataSources && dataSources.length > 0) {
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('created_by', userId)
      .eq('tenant_id', tenantId);
    
    if (!error) {
      deletedTables.push('data_sources');
      deletedCount += dataSources.length;
    }
  }

  // Delete analytics
  const { error: analyticsError } = await supabase
    .from('descriptive_analytics')
    .delete()
    .eq('created_by', userId)
    .eq('tenant_id', tenantId);
  if (!analyticsError) deletedTables.push('descriptive_analytics');

  // Delete chat sessions (cascades to messages)
  const { error: chatError } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);
  if (!chatError) deletedTables.push('chat_sessions');

  // Anonymize user profile (soft delete)
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      email: `deleted_${userId.substring(0, 8)}@deleted.local`,
      full_name: 'Deleted User',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (!profileError) deletedTables.push('user_profiles');

  // Create deletion log
  const { data: deletionLog } = await supabase
    .from('gdpr_deletion_logs')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      request_id: request?.id,
      deleted_tables: deletedTables,
      deleted_records_count: deletedCount,
      anonymized_records_count: 1, // user profile
    })
    .select()
    .single();

  // Update request status
  await supabase
    .from('gdpr_data_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', request?.id);

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Data deletion completed',
    deleted_tables: deletedTables,
    deleted_records_count: deletedCount,
    deletion_log_id: deletionLog?.id
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleConsent(supabase: any, userId: string, tenantId: string, body: any, headers: Headers) {
  const { consent_type, granted, version } = body;

  if (!consent_type || typeof granted !== 'boolean' || !version) {
    return new Response(JSON.stringify({ error: 'consent_type, granted, and version are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ipAddress = headers.get('x-forwarded-for') || null;
  const userAgent = headers.get('user-agent') || null;

  const { data: consent } = await supabase
    .from('gdpr_consents')
    .upsert({
      tenant_id: tenantId,
      user_id: userId,
      consent_type,
      granted,
      version,
      ip_address: ipAddress,
      user_agent: userAgent,
    }, { onConflict: 'tenant_id,user_id,consent_type' })
    .select()
    .single();

  return new Response(JSON.stringify({ success: true, consent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

