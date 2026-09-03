import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Auth gate for /profile, /generate and /dashboard. A Server Component check
 * here means an unauthenticated request never even reaches those pages'
 * client-side code - no flash of protected content, no reliance on the
 * client to redirect itself.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
