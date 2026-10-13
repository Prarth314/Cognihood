import { createClient } from 'npm:@supabase/supabase-js@2.110.1';

const allowedOrigins = () => (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:3000')
  .split(',').map(value => value.trim()).filter(Boolean);

Deno.serve(async request => {
  const origin = request.headers.get('origin') ?? '';
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': allowedOrigins().includes(origin) ? origin : allowedOrigins()[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (request.method === 'OPTIONS') {
    return allowedOrigins().includes(origin)
      ? new Response(null, { status: 204, headers })
      : new Response(JSON.stringify({ error: 'Origin is not allowed.' }), { status: 403, headers });
  }
  if (request.method !== 'POST' || (origin && !allowedOrigins().includes(origin))) {
    return new Response(JSON.stringify({ error: 'Request is not allowed.' }), { status: 403, headers });
  }

  const authorization = request.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Authentication or server configuration is missing.' }), { status: 401, headers });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session.' }), { status: 401, headers });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Account deletion failed', error.message);
    return new Response(JSON.stringify({ error: 'Account deletion failed.' }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ deleted: true }), { status: 200, headers });
});
