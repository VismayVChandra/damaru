import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { attachEngagement, countFollowing, listFollowingFeed } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The home feed: recent work from people the signed-in person follows. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const [feed, followingCount] = await Promise.all([
    listFollowingFeed(user.id),
    countFollowing(user.id),
  ]);
  const problems = await attachEngagement(feed, user.id);

  return NextResponse.json({ problems, followingCount });
}
