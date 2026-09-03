import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfileById, reviewFriction } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Accept or reject one submission. An accepted friction is live immediately. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile?.isAdmin) {
    return NextResponse.json({ error: "Not an admin." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (body.status !== "accepted" && body.status !== "rejected") {
    return NextResponse.json({ error: "Status must be accepted or rejected." }, { status: 400 });
  }

  const friction = await reviewFriction(id, body.status);
  if (!friction) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ friction });
}
