import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is signed in, and their profile if they have made one yet. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, profile: null });

  const profile = await getProfileById(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email }, profile });
}
