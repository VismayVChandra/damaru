import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createNotification, getCollabRequest, respondToCollabRequest } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Accept or decline - only the recipient gets to answer. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await getCollabRequest(id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.toProfileId !== user.id) {
    return NextResponse.json({ error: "Not your request to answer." }, { status: 403 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Already answered." }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (body.status !== "accepted" && body.status !== "declined") {
    return NextResponse.json({ error: "Status must be accepted or declined." }, { status: 400 });
  }

  const updated = await respondToCollabRequest(id, body.status);
  if (body.status === "accepted" && updated) {
    await createNotification({
      profileId: existing.fromProfileId,
      type: "collab_accepted",
      actorProfileId: user.id,
      problemId: existing.problemId,
      collabRequestId: existing.id,
    });
  }
  return NextResponse.json({ request: updated });
}
