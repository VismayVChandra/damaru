import { NextResponse } from "next/server";
import { getProblem, updateProblem } from "@/lib/db";
import type { Problem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: Problem["status"][] = ["new", "saved", "building", "shipped", "passed"];

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const problem = getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ problem });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

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

  const updated = updateProblem(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ problem: updated });
}
