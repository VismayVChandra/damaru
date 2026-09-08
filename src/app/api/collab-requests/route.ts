import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { listCollabRequestsFor } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything involving the signed-in member, split into incoming/outgoing. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { incoming, outgoing } = await listCollabRequestsFor(user.id);
  return NextResponse.json({ incoming, outgoing });
}
