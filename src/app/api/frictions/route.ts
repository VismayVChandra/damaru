import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfileById, listFrictionsSubmittedBy, submitFriction } from "@/lib/db";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { MECHANIC_BY_ID } from "@/lib/catalog/blocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What this account has submitted, in any state. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ frictions: await listFrictionsSubmittedBy(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Build a profile first." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const domainId = typeof body.domainId === "string" ? body.domainId : "";
  if (!DOMAIN_BY_ID.has(domainId)) {
    return NextResponse.json({ error: "Pick a domain." }, { status: 400 });
  }

  const actor = typeof body.actor === "string" ? body.actor.trim() : "";
  if (actor.length < 3 || actor.length > 120) {
    return NextResponse.json(
      { error: "Describe who feels it, in 3 to 120 characters." },
      { status: 400 },
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 20 || text.length > 400) {
    return NextResponse.json(
      { error: "The friction needs 20 to 400 characters. Be specific." },
      { status: 400 },
    );
  }

  const mechanics = Array.isArray(body.mechanics)
    ? [...new Set(body.mechanics.filter((m): m is string => typeof m === "string" && MECHANIC_BY_ID.has(m)))]
    : [];
  if (mechanics.length === 0 || mechanics.length > 8) {
    return NextResponse.json(
      { error: "Pick between one and eight ways this could be answered." },
      { status: 400 },
    );
  }

  try {
    const friction = await submitFriction({ domainId, actor, text, mechanics, submittedBy: user.id });
    return NextResponse.json({ friction });
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: "That friction is already in the catalogue." },
        { status: 409 },
      );
    }
    throw err;
  }
}
