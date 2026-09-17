import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createProjectRole, getProblem, listProjectRoles } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open roles are public, like everything else about a project. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const roles = await listProjectRoles(id);
  return NextResponse.json({ roles });
}

/** Publish a new open role. Owner only. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (problem.profileId !== user.id) {
    return NextResponse.json({ error: "Not your project." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const roleName = typeof body.roleName === "string" ? body.roleName.trim() : "";
  if (roleName.length < 2 || roleName.length > 60) {
    return NextResponse.json({ error: "Role name must be 2-60 characters." }, { status: 400 });
  }

  const skills = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, 8)
    : [];

  const countNeeded = Number(body.countNeeded);
  if (!Number.isFinite(countNeeded) || countNeeded < 1 || countNeeded > 20) {
    return NextResponse.json({ error: "Seats needed must be between 1 and 20." }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
  const commitment = typeof body.commitment === "string" ? body.commitment.trim().slice(0, 60) : "";
  const duration = typeof body.duration === "string" ? body.duration.trim().slice(0, 60) : "";

  const role = await createProjectRole({
    problemId: id,
    roleName,
    skills,
    countNeeded: Math.trunc(countNeeded),
    description,
    commitment,
    duration,
  });
  return NextResponse.json({ role });
}
