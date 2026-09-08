import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { addComment, createNotification, getProblem, listComments } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Comments are public read, like everything else about a problem - no auth needed to see them. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const comments = await listComments(id);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 500) : "";
  if (!text) return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });

  const comment = await addComment(id, user.id, text);
  await createNotification({
    profileId: problem.profileId,
    type: "comment",
    actorProfileId: user.id,
    problemId: id,
  });

  return NextResponse.json({ comment });
}
