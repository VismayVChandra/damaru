import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  createNotification,
  getFork,
  getProblem,
  getProfileById,
  hasForked,
  insertProblem,
} from "@/lib/db";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { ARTIFACT_BY_ID, MECHANIC_BY_ID, TWIST_BY_ID } from "@/lib/catalog/blocks";
import { compose } from "@/lib/engine/compose";
import { categoryStrengths, scoreFit } from "@/lib/engine/fit";
import { forkFingerprint } from "@/lib/engine/novelty";
import type { Friction, Problem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start your own version of someone else's shipped project. The fork pins the
 * source's exact DNA - so it reads as the same brief - but re-scores fit for
 * whoever is forking it, which is the honest part: the same build is a
 * different amount of work for a different person.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const source = await getProblem(id);
  if (!source) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (source.status !== "shipped") {
    return NextResponse.json({ error: "Only a shipped project can be forked." }, { status: 409 });
  }
  if (source.profileId === user.id) {
    return NextResponse.json({ error: "You can't fork your own project." }, { status: 400 });
  }

  // Checked here rather than by catching a unique violation: a fork is
  // deterministic, so there is nothing to "draw again" the way the generator
  // does when it loses a race for a fingerprint.
  if (await hasForked(id, user.id)) {
    const existing = await getFork(id, user.id);
    return NextResponse.json(
      { error: "You've already forked this one.", problem: existing },
      { status: 409 },
    );
  }

  const profile = await getProfileById(user.id);
  if (!profile) return NextResponse.json({ error: "Build a profile first." }, { status: 404 });

  const dna = source.dna;
  const domain = DOMAIN_BY_ID.get(dna.domainId);
  const mechanic = MECHANIC_BY_ID.get(dna.mechanicId);
  const artifact = ARTIFACT_BY_ID.get(dna.artifactId);
  const twist = TWIST_BY_ID.get(dna.twistId);
  if (!domain || !mechanic || !artifact || !twist) {
    return NextResponse.json(
      { error: "This project's combination is no longer available to fork." },
      { status: 409 },
    );
  }

  const fit = scoreFit(profile, categoryStrengths(profile), mechanic, artifact);

  // compose() takes a Friction to satisfy its input type but never reads it -
  // the actor and friction text it actually uses are plain strings already on
  // the pinned DNA. A placeholder keeps this off the frictions table, whose
  // row may since have been rejected or deleted.
  const friction: Friction = { actor: dna.actor, text: dna.friction, mechanics: [dna.mechanicId] };

  const composed = compose({ dna, domain, friction, mechanic, artifact, twist, fit, profile });

  const candidate: Problem = {
    ...composed,
    id: crypto.randomUUID(),
    // Not fingerprint(dna): that is the source's own key, and it is unique
    // across the whole table. See forkFingerprint.
    fingerprint: forkFingerprint(dna, profile.id),
    // Forking is already a deliberate choice, so it skips triage and lands as
    // a kept idea rather than another "new" draw to swipe on.
    status: "idea",
    notes: "",
    checklist: {},
    feedback: null,
    lookingForCollaborators: false,
    inspiredByProblemId: id,
    // Born at "idea" rather than moved there - there is no transition to date.
    statusChangedAt: null,
    createdAt: new Date().toISOString(),
  };

  const stored = await insertProblem(candidate);
  if (!stored) {
    return NextResponse.json({ error: "Could not fork this right now." }, { status: 409 });
  }

  // Best-effort, unlike every other notify call site. The fork row is already
  // committed here, so letting this throw would 500 a request that succeeded -
  // and the retry would hit hasForked's 409, leaving someone with a fork they
  // can't reach and an error they can't clear.
  //
  // The fork's id, not the source's: a fork's title is byte-identical to its
  // source (it pins the DNA, and compose() is pure), so the copy reads the
  // same either way - but this lands the owner on the new thing rather than on
  // their own project, which they have already seen.
  try {
    await createNotification({
      profileId: source.profileId,
      type: "fork",
      actorProfileId: user.id,
      problemId: stored.id,
    });
  } catch {
    /* the fork is what mattered */
  }

  return NextResponse.json({ problem: stored });
}
