import { createClient } from '@supabase/supabase-js'

/**
 * Client-side Supabase client with anon key.
 * This respects Row Level Security (RLS) policies.
 * Safe to use in browser and client components.
 */
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Server-side Supabase client with service role key.
 * This bypasses Row Level Security (RLS) and should only be used in server-side code.
 * DO NOT use in client components or expose to browser.
 */
export function getSupabaseServer() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
