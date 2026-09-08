import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfileById, listDiscoverableProfiles } from "@/lib/db";
import { categoryStrengths } from "@/lib/engine/fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRONG = 0.75;

/**
 * Every discoverable member (minus yourself) and the categories they're
 * strong in - the whole list comes back in one call and the category
 * filter chips on the client just re-render from it, rather than a
 * round-trip per click. Club-scale data, so this is cheap either way.
 * Only strengths >= STRONG are exposed, not the full skill list - same
 * "handle, name, what they said they can do" boundary Pairing already
 * holds to.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile) return NextResponse.json({ error: "Build a profile first." }, { status: 404 });

  const all = await listDiscoverableProfiles();
  const members = all
    .filter((p) => p.id !== user.id)
    .map((p) => {
      const strengths = categoryStrengths(p);
      const strongIn = [...strengths.entries()]
        .filter(([, s]) => s.strength >= STRONG)
        .map(([category]) => category);
      return { handle: p.handle, displayName: p.displayName, strongIn };
    })
    .filter((p) => p.strongIn.length > 0);

  return NextResponse.json({ members });
}
