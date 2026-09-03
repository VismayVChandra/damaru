import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Session-aware client: reads the caller's auth cookies, so `auth.getUser()`
 * on it returns "who is actually signed in right now" (or null). Use this
 * anywhere you need to know the current user's identity - never for data
 * access, since it is subject to RLS and the anon key.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render, where cookies are
            // read-only. Harmless as long as middleware also refreshes the
            // session - see src/middleware.ts.
          }
        },
      },
    },
  );
}

/** The signed-in user for this request, or null if nobody is signed in. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
