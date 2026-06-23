import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * SERVER-ONLY. Never import this into a Client Component. It is used only by
 * trusted server routes AFTER an explicit permission check (e.g. requireAdmin),
 * or for writes the user is not allowed to do directly (recording metadata).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
