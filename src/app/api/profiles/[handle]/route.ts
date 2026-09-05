import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  countFollowers,
  countFollowing,
  getProfileByHandle,
  isFollowing,
  listProblemsForProfile,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The public profile page's data bundle. Deliberately a curated subset of
 * the full Profile, not the row itself - email is never in it (never has
 * been, anywhere), and this is the one place `discoverable` genuinely
 * shouldn't leak either way, so it's left out too.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const profile = await getProfileByHandle(handle.toLowerCase());
  if (!profile) return NextResponse.json({ error: "No such member." }, { status: 404 });

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === profile.id;

  const [followerCount, followingCount, allProblems, viewerIsFollowing] = await Promise.all([
    countFollowers(profile.id),
    countFollowing(profile.id),
    listProblemsForProfile(profile.id),
    viewer && !isOwnProfile ? isFollowing(viewer.id, profile.id) : Promise.resolve(null),
  ]);

  const shipped = allProblems.filter((p) => p.status === "shipped");

  return NextResponse.json({
    profile: {
      handle: profile.handle,
      displayName: profile.displayName,
      bio: profile.bio,
      skills: profile.skills,
      interests: profile.interests,
      timeBudget: profile.timeBudget,
      teamSize: profile.teamSize,
      appetite: profile.appetite,
      createdAt: profile.createdAt,
    },
    shipped,
    followerCount,
    followingCount,
    isFollowing: viewerIsFollowing,
    isOwnProfile,
  });
}
