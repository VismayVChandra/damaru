import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfileById, upsertProfile } from "@/lib/db";
import { SKILL_BY_ID } from "@/lib/catalog/skills";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { ARTIFACT_BY_ID } from "@/lib/catalog/blocks";
import type { Appetite, Profile, TeamSize, TimeBudget, UserSkill } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_BUDGETS: TimeBudget[] = ["weekend", "twoweeks", "semester"];
const TEAM_SIZES: TeamSize[] = ["solo", "pair", "team"];
const APPETITES: Appetite[] = ["comfort", "stretch", "deepend"];

/** Handles are a public display name now, not identity - keep them boring. */
function normaliseHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const handle = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (handle.length < 2 || handle.length > 32) return null;
  return handle;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await getProfileById(user.id);
  if (!profile) return NextResponse.json({ error: "No profile yet." }, { status: 404 });
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const handle = normaliseHandle(body.handle);
  if (!handle) {
    return NextResponse.json(
      { error: "Handle must be 2-32 characters, letters, numbers, dash or underscore." },
      { status: 400 },
    );
  }

  const displayName =
    typeof body.displayName === "string" && body.displayName.trim().length > 0
      ? body.displayName.trim().slice(0, 80)
      : handle;

  // Drop anything not in the catalogue rather than trusting the client.
  const skills: UserSkill[] = Array.isArray(body.skills)
    ? body.skills
        .filter(
          (s): s is UserSkill =>
            typeof s === "object" &&
            s !== null &&
            typeof (s as UserSkill).id === "string" &&
            SKILL_BY_ID.has((s as UserSkill).id),
        )
        .map((s) => ({
          id: s.id,
          level: ([1, 2, 3].includes(Number(s.level)) ? Number(s.level) : 2) as UserSkill["level"],
        }))
        .slice(0, 40)
    : [];

  if (skills.length === 0) {
    return NextResponse.json({ error: "Pick at least one skill." }, { status: 400 });
  }

  const interests: string[] = Array.isArray(body.interests)
    ? body.interests.filter((i): i is string => typeof i === "string" && DOMAIN_BY_ID.has(i)).slice(0, 12)
    : [];

  if (interests.length === 0) {
    return NextResponse.json({ error: "Pick at least one interest." }, { status: 400 });
  }

  const artifactPrefs: string[] = Array.isArray(body.artifactPrefs)
    ? body.artifactPrefs
        .filter((a): a is string => typeof a === "string" && ARTIFACT_BY_ID.has(a))
        .slice(0, 12)
    : [];

  const timeBudget = TIME_BUDGETS.includes(body.timeBudget as TimeBudget)
    ? (body.timeBudget as TimeBudget)
    : "twoweeks";
  const teamSize = TEAM_SIZES.includes(body.teamSize as TeamSize)
    ? (body.teamSize as TeamSize)
    : "solo";
  const appetite = APPETITES.includes(body.appetite as Appetite)
    ? (body.appetite as Appetite)
    : "stretch";

  // Ownership is the session, never anything the client sends. Every profile
  // row's id IS the Supabase auth user id, so a person can only ever write
  // their own row - upsert's onConflict is "id".
  const existing = await getProfileById(user.id);
  const now = new Date().toISOString();

  const profile: Profile = {
    id: user.id,
    handle,
    displayName,
    skills,
    interests,
    artifactPrefs,
    timeBudget,
    teamSize,
    appetite,
    // Carried through, never taken from the request - upsertProfile does not
    // write this column at all, so admin status survives a profile edit.
    isAdmin: existing?.isAdmin ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    return NextResponse.json({ profile: await upsertProfile(profile) });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
    }
    throw err;
  }
}
