import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { deleteProjectRole, getProblem, getProjectRole, updateProjectRole } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOwnedRole(problemId: string, roleId: string, userId: string) {
  const role = await getProjectRole(roleId);
  if (!role || role.problemId !== problemId) return { error: "Not found." as const, status: 404 as const };

  const problem = await getProblem(problemId);
  if (!problem) return { error: "Not found." as const, status: 404 as const };
  if (problem.profileId !== userId) return { error: "Not your project." as const, status: 403 as const };

  return { role };
}

/** Edit a role, or flip `open` to stop taking applications early. Owner only. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string; roleId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id, roleId } = await ctx.params;
  const check = await requireOwnedRole(id, roleId, user.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const patch: Parameters<typeof updateProjectRole>[1] = {};

  if (typeof body.roleName === "string") {
    const roleName = body.roleName.trim();
    if (roleName.length < 2 || roleName.length > 60) {
      return NextResponse.json({ error: "Role name must be 2-60 characters." }, { status: 400 });
    }
    patch.roleName = roleName;
  }
  if (Array.isArray(body.skills)) {
    patch.skills = body.skills.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, 8);
  }
  if (body.countNeeded !== undefined) {
    const countNeeded = Number(body.countNeeded);
    if (!Number.isFinite(countNeeded) || countNeeded < 1 || countNeeded > 20) {
      return NextResponse.json({ error: "Seats needed must be between 1 and 20." }, { status: 400 });
    }
    patch.countNeeded = Math.trunc(countNeeded);
  }
  if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 500);
  if (typeof body.commitment === "string") patch.commitment = body.commitment.trim().slice(0, 60);
  if (typeof body.duration === "string") patch.duration = body.duration.trim().slice(0, 60);
  if (typeof body.open === "boolean") patch.open = body.open;

  const role = await updateProjectRole(roleId, patch);
  return NextResponse.json({ role });
}

/** Owner only. Members who joined via this role keep their credit - see the schema comment. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; roleId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id, roleId } = await ctx.params;
  const check = await requireOwnedRole(id, roleId, user.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  await deleteProjectRole(roleId);
  return NextResponse.json({ ok: true });
}
