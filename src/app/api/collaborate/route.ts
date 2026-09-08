import { NextResponse } from "next/server";
import { listOpenForCollaboration } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, like the club feed - browsing what's open doesn't need an
 * account, only sending a request does. Each problem already carries its
 * own `fit.gaps`/`fit.stretch`, which is exactly "what this person could
 * use a hand with," so there's no separate field to maintain for that.
 */
export async function GET() {
  const problems = await listOpenForCollaboration();
  return NextResponse.json({ problems });
}
