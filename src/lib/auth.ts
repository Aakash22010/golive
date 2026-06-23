import { createClient } from "@/lib/supabase/server";

export type Role = "user" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}

/**
 * Returns the current user's profile (incl. role), or null if not signed in.
 * Uses getUser() which validates the session against Supabase Auth — do NOT
 * trust getSession() alone for authorization.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  return (profile as Profile) ?? null;
}

/** Throws-style guard for route handlers: returns profile or a 401/403 reason. */
export async function requireUser(): Promise<
  { ok: true; profile: Profile } | { ok: false; status: 401 }
> {
  const profile = await getProfile();
  if (!profile) return { ok: false, status: 401 };
  return { ok: true, profile };
}

export async function requireAdmin(): Promise<
  { ok: true; profile: Profile } | { ok: false; status: 401 | 403 }
> {
  const profile = await getProfile();
  if (!profile) return { ok: false, status: 401 };
  if (profile.role !== "admin") return { ok: false, status: 403 };
  return { ok: true, profile };
}
