import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Bypasses row level security. Only the review engine uses it, after the caller has been checked. */
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
