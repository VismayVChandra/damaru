import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProblem, updateProblem } from "@/lib/db";
import type { Checklist, Problem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: Problem["status"][] = ["new", "saved", "building", "shipped", "passed"];

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ problem });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const existing = await getProblem(id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // The admin client bypasses RLS, so this check is the only thing standing
  // between "PATCH any problem id you can guess" and real ownership.
  if (existing.profileId !== user.id) {
    return NextResponse.json({ error: "Not your problem." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const patch: {
    status?: Problem["status"];
    notes?: string;
    checklist?: Checklist;
    feedback?: Problem["feedback"];
  } = {};
  if (typeof body.status === "string" && STATUSES.includes(body.status as Problem["status"])) {
    patch.status = body.status as Problem["status"];
  }
  if (typeof body.notes === "string") {
    patch.notes = body.notes.slice(0, 4000);
  }
  if ("feedback" in body) {
    // Explicit null clears it (clicking an already-active thumb again), so
    // this has to distinguish "not sent" from "sent as null" - only present
    // the key to updateProblem when the client actually meant to change it.
    if (body.feedback === "up" || body.feedback === "down" || body.feedback === null) {
      patch.feedback = body.feedback;
    } else {
      return NextResponse.json({ error: "Feedback must be up, down, or null." }, { status: 400 });
    }
  }
  if (body.checklist && typeof body.checklist === "object" && !Array.isArray(body.checklist)) {
    // Keep only keys this problem actually has, so a client cannot stuff
    // arbitrary data into the column.
    const valid = new Set([
      ...existing.requirements.map((_, i) => `req:${i}`),
      ...existing.successCriteria.map((_, i) => `success:${i}`),
    ]);
    patch.checklist = Object.fromEntries(
      Object.entries(body.checklist as Record<string, unknown>)
        .filter(([k, v]) => valid.has(k) && v === true)
        .map(([k]) => [k, true]),
    );
  }

  const updated = await updateProblem(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ problem: updated });
}
