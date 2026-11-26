import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  allFingerprints,
  getDnaUsage,
  getProfileById,
  insertProblem,
  listAcceptedFrictions,
  listIssuedFrictionIds,
} from "@/lib/db";
import { generateProblems, indexFrictions } from "@/lib/engine";
import { MOOD_BY_ID } from "@/lib/catalog/moods";
import { DEFAULT_GENERATE, MAX_GENERATE } from "@/lib/limits";
import type { Problem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Build a profile first." }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* count is optional, so a body-less request is fine */
  }

  // Say no out loud rather than quietly handing back fewer than was asked for.
  const requested = body.count === undefined ? DEFAULT_GENERATE : Number(body.count);
  if (!Number.isInteger(requested) || requested < 1 || requested > MAX_GENERATE) {
    return NextResponse.json(
      { error: `Ask for between 1 and ${MAX_GENERATE} briefs at a time.` },
      { status: 400 },
    );
  }
  const count = requested;
  // An unrecognised mood is ignored rather than rejected - same posture as
  // the rest of this body, and the engine falls back to an unmooded draw.
  const moodId = typeof body.mood === "string" && MOOD_BY_ID.has(body.mood) ? body.mood : undefined;

  const [issued, catalogue, seenFrictions, clubUsage, personalUsage] = await Promise.all([
    allFingerprints(),
    listAcceptedFrictions(),
    listIssuedFrictionIds(profile.id),
    getDnaUsage(),
    getDnaUsage(profile.id),
  ]);
  const frictions = indexFrictions(catalogue);
  const saved: Problem[] = [];
  // Carried across passes so the later ones keep spreading out rather than
  // each starting from a clean slate and landing in the same place.
  const usedMechanics = new Set<string>();
  const usedArtifacts = new Set<string>();

  // Each pass excludes everything already issued globally plus anything this
  // request has just claimed, so a batch never repeats itself either.
  for (let pass = 0; pass < 4 && saved.length < count; pass++) {
    const drafts = generateProblems(profile, {
      frictions,
      count: count - saved.length,
      excludeFingerprints: issued,
      excludeFrictionIds: seenFrictions,
      excludeMechanics: usedMechanics,
      excludeArtifacts: usedArtifacts,
      clubUsage,
      personalUsage,
      seed: `${profile.id}:${Date.now()}:${pass}:${Math.random()}`,
      moodId,
    });

    if (drafts.length === 0) break;

    for (const draft of drafts) {
      const problem: Problem = {
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
      const stored = await insertProblem(problem);
      if (stored) {
        saved.push(stored);
        issued.add(stored.fingerprint);
        usedMechanics.add(stored.dna.mechanicId);
        usedArtifacts.add(stored.dna.artifactId);
        // Keep the novelty pressure honest within the request, so pass two
        // already knows what pass one handed out.
        clubUsage.mechanics.set(stored.dna.mechanicId, (clubUsage.mechanics.get(stored.dna.mechanicId) ?? 0) + 1);
        clubUsage.artifacts.set(stored.dna.artifactId, (clubUsage.artifacts.get(stored.dna.artifactId) ?? 0) + 1);
        clubUsage.total++;
        personalUsage.mechanics.set(stored.dna.mechanicId, (personalUsage.mechanics.get(stored.dna.mechanicId) ?? 0) + 1);
        personalUsage.artifacts.set(stored.dna.artifactId, (personalUsage.artifacts.get(stored.dna.artifactId) ?? 0) + 1);
        personalUsage.total++;
      }
    }
  }

  if (saved.length === 0) {
    return NextResponse.json(
      {
        error:
          "Every problem that fits you has already been issued. Add a skill or an interest to open up new combinations.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ problems: saved });
}
