import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { addProgressEntry, getProblem } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Append one "what moved" line. Owner only, same rule as PATCH. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (problem.profileId !== user.id) {
    return NextResponse.json({ error: "Not your problem." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!text) {
    return NextResponse.json({ error: "Write a line about what moved." }, { status: 400 });
  }

  return NextResponse.json({ entry: await addProgressEntry(id, text) });
}
