import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { countLikes, createNotification, getProblem, toggleLike } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const liked = await toggleLike(id, user.id);
  if (liked) {
    await createNotification({
      profileId: problem.profileId,
      type: "like",
      actorProfileId: user.id,
      problemId: id,
    });
  }

  const likeCount = await countLikes(id);
  return NextResponse.json({ liked, likeCount });
}
