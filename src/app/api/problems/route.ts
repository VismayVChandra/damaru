import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfileById, listProblemsForProfile } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "My problems" for the signed-in account. The public club feed is served
 * separately by src/app/browse/page.tsx, which reads listFeed() directly as
 * a Server Component - it needs no auth and isn't scoped to one person.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile) return NextResponse.json({ problems: [], profile: null });

  return NextResponse.json({ problems: await listProblemsForProfile(profile.id), profile });
}
