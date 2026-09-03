import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfileById, listFrictionsByStatus } from "@/lib/db";
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

  return NextResponse.json({ frictions: await listFrictionsByStatus(status), status });
}
