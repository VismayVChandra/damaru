import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { countUnreadNotifications, listNotifications } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const [items, unreadCount] = await Promise.all([
    listNotifications(user.id),
    countUnreadNotifications(user.id),
  ]);
  return NextResponse.json({ items, unreadCount });
}
