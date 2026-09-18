import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  attachEngagement,
  countFollowers,
  countFollowing,
  countForksOfProfile,
  getProfileByHandle,
  isFollowing,
  listProblemsForProfile,
  listProblemsWhereMember,
} from "@/lib/db";
import { COMMITTED_STATUSES } from "@/lib/status";

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

  const [followerCount, followingCount, allProblems, memberOf, forkCount, viewerIsFollowing] =
    await Promise.all([
      countFollowers(profile.id),
      countFollowing(profile.id),
      listProblemsForProfile(profile.id),
      listProblemsWhereMember(profile.id),
      countForksOfProfile(profile.id),
      viewer && !isOwnProfile ? isFollowing(viewer.id, profile.id) : Promise.resolve(null),
    ]);

  // Only work they've actually committed to is anyone else's business: a
  // "new" draw hasn't been kept yet, and a "passed" one is a decision not to
  // build, neither of which belongs on a public portfolio.
  const isPublic = (p: { status: (typeof COMMITTED_STATUSES)[number] | string }) =>
    COMMITTED_STATUSES.includes(p.status as (typeof COMMITTED_STATUSES)[number]);

  const [projects, joined] = await Promise.all([
    attachEngagement(allProblems.filter(isPublic), viewer?.id ?? null),
    attachEngagement(memberOf.filter(isPublic), viewer?.id ?? null),
  ]);

  // Derived from the progress entries listProblemsForProfile already embeds -
  // same one-liner the dashboard uses, no extra query.
  const logCount = allProblems.reduce((n, p) => n + (p.progress?.length ?? 0), 0);

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
    projects,
    joined,
    logCount,
    forkCount,
    followerCount,
    followingCount,
    isFollowing: viewerIsFollowing,
    isOwnProfile,
  });
}
