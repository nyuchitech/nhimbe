/**
 * Server-side Supabase client for the nyuchi_platform_db. Use from RSC
 * and route handlers. Reads anon by default; pass an access token to act
 * as the authenticated person.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseServerClient(accessToken?: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "[mukoko] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: {
        "x-client-info": "nhimbe-web-ssr",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  });
}
