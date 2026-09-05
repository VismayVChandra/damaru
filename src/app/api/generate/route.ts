import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { allFingerprints, getProfileById, insertProblem, listAcceptedFrictions } from "@/lib/db";
import { generateProblems, indexFrictions } from "@/lib/engine";
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

  const requested = Number(body.count);
  const count = Number.isFinite(requested) ? Math.max(1, Math.min(5, Math.trunc(requested))) : 3;

  const [issued, catalogue] = await Promise.all([allFingerprints(), listAcceptedFrictions()]);
  const frictions = indexFrictions(catalogue);
  const saved: Problem[] = [];

  // Each pass excludes everything already issued globally plus anything this
  // request has just claimed, so a batch never repeats itself either.
  for (let pass = 0; pass < 4 && saved.length < count; pass++) {
    const drafts = generateProblems(profile, {
      frictions,
      count: count - saved.length,
      excludeFingerprints: issued,
      seed: `${profile.id}:${Date.now()}:${pass}:${Math.random()}`,
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
        createdAt: new Date().toISOString(),
      };
      // A concurrent request may have taken this fingerprint between the read
      // and the write; the unique index is the real arbiter.
      const stored = await insertProblem(problem);
      if (stored) {
        saved.push(stored);
        issued.add(stored.fingerprint);
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
