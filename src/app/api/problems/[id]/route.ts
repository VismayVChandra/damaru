import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProblem, updateProblem } from "@/lib/db";
import type { Problem } from "@/lib/types";

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

  const patch: { status?: Problem["status"]; notes?: string } = {};
  if (typeof body.status === "string" && STATUSES.includes(body.status as Problem["status"])) {
    patch.status = body.status as Problem["status"];
  }
  if (typeof body.notes === "string") {
    patch.notes = body.notes.slice(0, 4000);
  }

  const updated = await updateProblem(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ problem: updated });
}
