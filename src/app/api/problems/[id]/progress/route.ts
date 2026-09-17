import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { addProgressEntry, getProblem, isTeamMember } from "@/lib/db";
import { BUILD_LOG_KINDS } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only a plain http(s) URL is accepted - both fields render as <a href>/<img src>. */
function validUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, 2000);
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

/** Append one build-log entry. Owner or any team member - teams are the point. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const problem = await getProblem(id);
  if (!problem) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (problem.profileId !== user.id && !(await isTeamMember(id, user.id))) {
    return NextResponse.json({ error: "Only the project's team can post here." }, { status: 403 });
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

  const kind =
    typeof body.kind === "string" && BUILD_LOG_KINDS.includes(body.kind as (typeof BUILD_LOG_KINDS)[number])
      ? (body.kind as (typeof BUILD_LOG_KINDS)[number])
      : "progress";

  const imageUrl = validUrl(body.imageUrl);
  if (imageUrl === undefined && body.imageUrl !== undefined) {
    return NextResponse.json({ error: "Image URL must start with http:// or https://." }, { status: 400 });
  }
  const linkUrl = validUrl(body.linkUrl);
  if (linkUrl === undefined && body.linkUrl !== undefined) {
    return NextResponse.json({ error: "Link must start with http:// or https://." }, { status: 400 });
  }

  const entry = await addProgressEntry(id, {
    body: text,
    kind,
    imageUrl: imageUrl ?? null,
    linkUrl: linkUrl ?? null,
  });
  return NextResponse.json({ entry });
}
