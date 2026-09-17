import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  createCollabRequest,
  createNotification,
  getProblem,
  getProjectRole,
  hasPendingCollabRequest,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Request to join a specific problem - either someone flagged the whole
 * project open (`roleId` absent), or a specific published role (`roleId`
 * set). Publishing a role is itself an invitation, so it satisfies the gate
 * on its own; the owner doesn't also have to flip the general flag.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (problem.profileId === user.id) {
    return NextResponse.json({ error: "You can't request to join your own problem." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Message is optional - a body-less request is fine.
  }

  const roleId = typeof body.roleId === "string" ? body.roleId : null;
  let role = null;
  if (roleId) {
    role = await getProjectRole(roleId);
    if (!role || role.problemId !== id) {
      return NextResponse.json({ error: "That role doesn't exist." }, { status: 404 });
    }
    if (!role.open || role.filled >= role.countNeeded) {
      return NextResponse.json({ error: "That role is already filled." }, { status: 409 });
    }
  } else if (!problem.lookingForCollaborators) {
    return NextResponse.json({ error: "This problem isn't open to collaborators." }, { status: 409 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 300) : "";

  if (await hasPendingCollabRequest(user.id, problem.profileId, id, roleId)) {
    return NextResponse.json({ error: "You already have a pending request on this one." }, { status: 409 });
  }

  const created = await createCollabRequest({
    problemId: id,
    fromProfileId: user.id,
    toProfileId: problem.profileId,
    message,
    roleId,
  });
  await createNotification({
    profileId: problem.profileId,
    type: "collab_request",
    actorProfileId: user.id,
    problemId: id,
    collabRequestId: created.id,
  });
  return NextResponse.json({ request: created });
}
