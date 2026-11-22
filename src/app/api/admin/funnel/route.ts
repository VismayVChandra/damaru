import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getFunnelSources, getProfileById } from "@/lib/db";
import { buildFunnel } from "@/lib/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What happens to a brief after it is generated. Admin only, and gated the
 * same way the review queue is - `is_admin` is set by hand in the database
 * and is absent from the profile upsert, so it cannot be granted through the
 * API.
 *
 * Admin-only despite containing no private data: it is per-member outcomes,
 * and "who in the club has finished nothing" is not a leaderboard the club
 * should be able to browse. Same reasoning as `pairing.ts` refusing to
 * produce a sortable score.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile?.isAdmin) {
    return NextResponse.json({ error: "Not an admin." }, { status: 403 });
  }

  const report = buildFunnel(await getFunnelSources());
  return NextResponse.json({ report });
}
