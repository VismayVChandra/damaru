import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createCollabRequest, createNotification, getProfileByHandle, hasPendingCollabRequest } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A general "let's work together" request, not tied to any specific problem. */
export async function POST(request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { handle } = await ctx.params;
  const target = await getProfileByHandle(handle.toLowerCase());
  if (!target) return NextResponse.json({ error: "No such member." }, { status: 404 });
  if (target.id === user.id) {
    return NextResponse.json({ error: "You can't send yourself a request." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Message is optional.
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 300) : "";

  if (await hasPendingCollabRequest(user.id, target.id, null)) {
    return NextResponse.json({ error: "You already have a pending request to them." }, { status: 409 });
  }

  const created = await createCollabRequest({
    problemId: null,
    fromProfileId: user.id,
    toProfileId: target.id,
    message,
  });
  await createNotification({
    profileId: target.id,
    type: "collab_request",
    actorProfileId: user.id,
    collabRequestId: created.id,
  });
  return NextResponse.json({ request: created });
}
