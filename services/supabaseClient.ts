
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  '';

export const isSupabaseConfigured = (): boolean =>
  Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project'));

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await getSupabase().from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
