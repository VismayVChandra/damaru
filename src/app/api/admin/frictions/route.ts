import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getFrictionFeedbackCounts, getProfileById, listFrictionsByStatus } from "@/lib/db";
import type { FrictionRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: FrictionRecord["status"][] = ["pending", "accepted", "rejected"];

/** The review queue. Admin only - is_admin is set by hand in the database. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile?.isAdmin) {
    return NextResponse.json({ error: "Not an admin." }, { status: 403 });
  }

  const raw = new URL(request.url).searchParams.get("status");
  const status = STATUSES.includes(raw as FrictionRecord["status"])
    ? (raw as FrictionRecord["status"])
    : "pending";

  const frictions = await listFrictionsByStatus(status);

  // Only accepted frictions can have been drawn from by the generator, so
  // there is nothing to tally for pending/rejected - skip the extra query.
  const feedback =
    status === "accepted"
      ? Object.fromEntries(await getFrictionFeedbackCounts())
      : {};

  return NextResponse.json({ frictions, status, feedback });
}
