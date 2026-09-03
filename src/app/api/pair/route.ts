import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  countBuildingByProfile,
  getProfileById,
  listDiscoverableProfiles,
  listProblemsForProfile,
} from "@/lib/db";
import { findComplements, recurringGap } from "@/lib/pairing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Build a profile first." }, { status: 404 });
  }

  const [others, building, mine] = await Promise.all([
    listDiscoverableProfiles(),
    countBuildingByProfile(),
    listProblemsForProfile(profile.id),
  ]);

  const candidates = findComplements(
    profile,
    others.map((p) => ({ profile: p, building: building.get(p.id) ?? 0 })),
  );

  return NextResponse.json({
    candidates,
    gap: recurringGap(mine),
    discoverable: profile.discoverable,
    /** How many people could be matched against at all, for honest empty states. */
    pool: others.filter((p) => p.id !== profile.id).length,
  });
}
