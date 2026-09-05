import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { followProfile, getProfileByHandle, unfollowProfile } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { handle } = await ctx.params;
  const target = await getProfileByHandle(handle.toLowerCase());
  if (!target) return NextResponse.json({ error: "No such member." }, { status: 404 });
  if (target.id === user.id) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  }

  await followProfile(user.id, target.id);
  return NextResponse.json({ following: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { handle } = await ctx.params;
  const target = await getProfileByHandle(handle.toLowerCase());
  if (!target) return NextResponse.json({ error: "No such member." }, { status: 404 });

  await unfollowProfile(user.id, target.id);
  return NextResponse.json({ following: false });
}
