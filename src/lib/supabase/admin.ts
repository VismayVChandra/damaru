import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client. Bypasses Row Level Security entirely, so this is the
 * one piece of the app that must never be imported into anything the browser
 * can load - the `server-only` import above turns that mistake into a build
 * error instead of a leaked key.
 *
 * The server is the trusted gatekeeper: every route that touches data checks
 * `getCurrentUser()` itself before calling into `lib/db.ts`, exactly like the
 * SQLite version checked the handle. RLS in supabase/schema.sql exists as a
 * second line of defense, not the primary one.
 */
const globalForSupabase = globalThis as unknown as {
  __damaruAdmin?: ReturnType<typeof createClient<Database>>;
};

export function getAdminClient() {
  if (!globalForSupabase.__damaruAdmin) {
    globalForSupabase.__damaruAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return globalForSupabase.__damaruAdmin;
}
