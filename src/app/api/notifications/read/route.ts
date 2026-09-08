import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { markNotificationsRead } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  await markNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
