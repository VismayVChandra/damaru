import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createCollabRequest, createNotification, getProblem, hasPendingCollabRequest } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Request to join a specific problem someone else has flagged as open. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (problem.profileId === user.id) {
    return NextResponse.json({ error: "You can't request to join your own problem." }, { status: 400 });
  }
  if (!problem.lookingForCollaborators) {
    return NextResponse.json({ error: "This problem isn't open to collaborators." }, { status: 409 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Message is optional - a body-less request is fine.
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 300) : "";

  if (await hasPendingCollabRequest(user.id, problem.profileId, id)) {
    return NextResponse.json({ error: "You already have a pending request on this one." }, { status: 409 });
  }

  const created = await createCollabRequest({
    problemId: id,
    fromProfileId: user.id,
    toProfileId: problem.profileId,
    message,
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
