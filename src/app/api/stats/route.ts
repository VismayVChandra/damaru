import { NextResponse } from "next/server";
import { countProblems, countProfiles } from "@/lib/db";
import { combinationSpace } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [profiles, problems] = await Promise.all([countProfiles(), countProblems()]);
  return NextResponse.json({ profiles, problems, space: combinationSpace() });
}
