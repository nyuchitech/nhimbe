/**
 * Browser Supabase client for the nyuchi_platform_db.
 *
 * The Stytch session is the source of truth — the worker mints a bridge
 * Supabase JWT which we set with `setSession()`. Schemas are accessed via
 * `supabase.schema('events' | 'circles' | 'identity' | 'places' | ...)`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "[mukoko] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "nhimbe.supabase.auth",
    },
    global: {
      headers: { "x-client-info": "nhimbe-web" },
    },
  });
  return cached;
}
