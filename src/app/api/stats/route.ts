import { NextResponse } from "next/server";
import { countProblems, countProfiles } from "@/lib/db";
import { combinationSpace } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    profiles: countProfiles(),
    problems: countProblems(),
    space: combinationSpace(),
  });
}
