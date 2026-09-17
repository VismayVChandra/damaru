import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProblem, removeTeamMember } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The owner removes anyone; a member can only remove themselves. */
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; profileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id, profileId } = await ctx.params;
  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isOwner = problem.profileId === user.id;
  const isSelf = profileId === user.id;
  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: "You can only remove yourself." }, { status: 403 });
  }
  if (profileId === problem.profileId) {
    return NextResponse.json({ error: "The project owner isn't a removable team member." }, { status: 400 });
  }

  await removeTeamMember(id, profileId);
  return NextResponse.json({ ok: true });
}
