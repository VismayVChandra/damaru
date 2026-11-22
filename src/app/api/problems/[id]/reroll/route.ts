import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  allFingerprints,
  deleteProblem,
  getProblem,
  getProfileById,
  insertProblem,
  listAcceptedFrictions,
  listIssuedFrictionIds,
} from "@/lib/db";
import { generateProblems, indexFrictions } from "@/lib/engine";
import type { Problem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Swaps one still-undecided card for a fresh draw in the same domain. This is
 * "I don't want this specific execution", not a decision - the old problem
 * never really counted as issued, so its fingerprint goes back into the pool
 * instead of staying reserved forever.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const existing = await getProblem(id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.profileId !== user.id) {
    return NextResponse.json({ error: "Not your problem." }, { status: 403 });
  }
  if (existing.status !== "new") {
    return NextResponse.json(
      { error: "Only an undecided problem can be rerolled." },
      { status: 409 },
    );
  }

  const profile = await getProfileById(user.id);
  if (!profile) return NextResponse.json({ error: "Build a profile first." }, { status: 404 });

  // Fetched before the old row is deleted below, so the friction being
  // rerolled away is itself excluded - otherwise the very next draw could
  // hand back the same friction with just a different mechanic attached,
  // which is exactly what rerolling was meant to get away from.
  const [issued, catalogue, seenFrictions] = await Promise.all([
    allFingerprints(),
    listAcceptedFrictions(),
    listIssuedFrictionIds(profile.id),
  ]);
  const frictions = indexFrictions(catalogue);

  let drawn: Problem | null = null;
  for (let pass = 0; pass < 4 && !drawn; pass++) {
    const [draft] = generateProblems(profile, {
      frictions,
      count: 1,
      excludeFingerprints: issued,
      excludeFrictionIds: seenFrictions,
      // "Another one like this" means another one in this domain. Interests
      // used to be a hard filter, so overriding them was enough to pin the
      // draw; now that they only tilt the odds, the pin has to be explicit.
      restrictDomains: [existing.dna.domainId],
      seed: `${profile.id}:reroll:${id}:${pass}:${Math.random()}`,
    });
    if (!draft) break;

    const candidate: Problem = {
      ...draft,
      id: crypto.randomUUID(),
      status: "new",
      notes: "",
      checklist: {},
      feedback: null,
      lookingForCollaborators: false,
      inspiredByProblemId: null,
      statusChangedAt: null,
      createdAt: new Date().toISOString(),
    };
    // A concurrent request may have taken this fingerprint between the read
    // and the write; the unique index is the real arbiter.
    drawn = await insertProblem(candidate);
    if (!drawn) issued.add(candidate.fingerprint);
  }

  if (!drawn) {
    return NextResponse.json(
      { error: "Nothing else fits this domain right now." },
      { status: 409 },
    );
  }

  // Only drop the old one once its replacement is safely written.
  await deleteProblem(id);
  return NextResponse.json({ problem: drawn });
}
