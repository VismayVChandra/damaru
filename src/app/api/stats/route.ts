import { NextResponse } from "next/server";
import { countProblems, countProfiles, listAcceptedFrictions } from "@/lib/db";
import { combinationSpace, indexFrictions } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [profiles, problems, catalogue] = await Promise.all([
    countProfiles(),
    countProblems(),
    listAcceptedFrictions(),
  ]);
  return NextResponse.json({
    profiles,
    problems,
    frictions: catalogue.length,
    space: combinationSpace(indexFrictions(catalogue)),
  });
}
