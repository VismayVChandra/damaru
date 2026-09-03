import { NextResponse } from "next/server";
import { getProfileByHandle, listProblemsForProfile, listRecentProblems } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const handle = params.get("handle")?.trim().toLowerCase();

  if (handle) {
    const profile = getProfileByHandle(handle);
    if (!profile) {
      return NextResponse.json({ error: "No profile with that handle." }, { status: 404 });
    }
    return NextResponse.json({ problems: listProblemsForProfile(profile.id), profile });
  }

  const limit = Math.max(1, Math.min(100, Number(params.get("limit")) || 40));
  return NextResponse.json({ problems: listRecentProblems(limit) });
}
