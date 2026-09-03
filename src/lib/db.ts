import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Checklist, Problem, ProblemPayload, ProgressEntry, Profile } from "@/lib/types";

/**
 * All data access goes through the service-role client and bypasses RLS - the
 * caller (an API route or Server Component) is responsible for checking
 * `getCurrentUser()` and enforcing ownership before calling anything here
 * that writes, exactly as the old SQLite version trusted its callers to check
 * the handle. See src/lib/supabase/admin.ts.
 */

// --- Profiles ----------------------------------------------------------

interface ProfileRow {
  id: string;
  handle: string;
  display_name: string;
  skills: Profile["skills"];
  interests: string[];
  artifact_prefs: string[];
  time_budget: Profile["timeBudget"];
  team_size: Profile["teamSize"];
  appetite: Profile["appetite"];
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    skills: row.skills,
    interests: row.interests,
    artifactPrefs: row.artifact_prefs,
    timeBudget: row.time_budget,
    teamSize: row.team_size,
    appetite: row.appetite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create or update a profile. `profile.id` must be the caller's own
 * `auth.uid()` - every route that calls this sets it from the verified
 * session, never from client input.
 */
export async function upsertProfile(profile: Profile): Promise<Profile> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .upsert(
      {
        id: profile.id,
        handle: profile.handle,
        display_name: profile.displayName,
        skills: profile.skills,
        interests: profile.interests,
        artifact_prefs: profile.artifactPrefs,
        time_budget: profile.timeBudget,
        team_size: profile.teamSize,
        appetite: profile.appetite,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) throw error;
  return rowToProfile(data as ProfileRow);
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

/** Used only to check handle availability - never for identity/auth. */
export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

export async function countProfiles(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

// --- Problems ------------------------------------------------------------

interface ProgressRow {
  id: string;
  problem_id: string;
  body: string;
  created_at: string;
}

interface ProblemRow {
  id: string;
  fingerprint: string;
  profile_id: string;
  payload: ProblemPayload;
  status: Problem["status"];
  notes: string;
  checklist: Checklist | null;
  created_at: string;
  /** Present only on queries that embed the relation. */
  progress_entries?: ProgressRow[];
}

function rowToProgress(row: ProgressRow): ProgressEntry {
  return {
    id: row.id,
    problemId: row.problem_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function rowToProblem(row: ProblemRow): Problem {
  return {
    ...row.payload,
    id: row.id,
    fingerprint: row.fingerprint,
    profileId: row.profile_id,
    status: row.status,
    notes: row.notes,
    // Rows written before the checklist column existed come back null.
    checklist: row.checklist ?? {},
    ...(row.progress_entries
      ? {
          progress: [...row.progress_entries]
            .map(rowToProgress)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        }
      : {}),
    createdAt: row.created_at,
  };
}

/** Columns plus the embedded progress log, for views that show movement. */
const PROBLEM_WITH_PROGRESS = "*, progress_entries(*)";

/** Every fingerprint ever issued, so the same problem is never handed out twice. */
export async function allFingerprints(): Promise<Set<string>> {
  const { data, error } = await getAdminClient().from("problems").select("fingerprint");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.fingerprint as string));
}

/**
 * Insert if the fingerprint is free. Returns null when another request
 * claimed it first, which the caller treats as "draw again".
 */
export async function insertProblem(problem: Problem): Promise<Problem | null> {
  const { id, fingerprint, profileId, payload, status, notes, domainId, fit, difficulty, createdAt } =
    packProblem(problem);

  const { data, error } = await getAdminClient()
    .from("problems")
    .insert({
      id,
      fingerprint,
      profile_id: profileId,
      payload,
      status,
      notes,
      domain_id: domainId,
      fit,
      difficulty,
      created_at: createdAt,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return null; // unique_violation on fingerprint
    throw error;
  }
  return rowToProblem(data as ProblemRow);
}

/** Splits a Problem into the columns insertProblem needs, keeping that function readable. */
function packProblem(problem: Problem) {
  const {
    id,
    fingerprint,
    profileId,
    status,
    notes,
    checklist,
    progress,
    createdAt,
    dna,
    fit,
    ...rest
  } = problem;
  return {
    id,
    fingerprint,
    profileId,
    status,
    notes,
    createdAt,
    domainId: dna.domainId,
    fit: fit.score,
    difficulty: fit.difficulty,
    payload: { ...rest, dna, fit },
  };
}

export async function getProblem(id: string): Promise<Problem | null> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select(PROBLEM_WITH_PROGRESS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProblem(data as ProblemRow) : null;
}

export async function listProblemsForProfile(profileId: string): Promise<Problem[]> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select(PROBLEM_WITH_PROGRESS)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => rowToProblem(r as ProblemRow));
}

export async function updateProblem(
  id: string,
  patch: { status?: Problem["status"]; notes?: string; checklist?: Checklist },
): Promise<Problem | null> {
  const existing = await getProblem(id);
  if (!existing) return null;

  const { error } = await getAdminClient()
    .from("problems")
    .update({
      status: patch.status ?? existing.status,
      notes: patch.notes ?? existing.notes,
      checklist: patch.checklist ?? existing.checklist,
    })
    .eq("id", id);

  if (error) throw error;
  // Re-read rather than using the update's own return, so the embedded
  // progress log comes back with it.
  return getProblem(id);
}

/** Append one "what moved" line to a problem. */
export async function addProgressEntry(problemId: string, body: string): Promise<ProgressEntry> {
  const { data, error } = await getAdminClient()
    .from("progress_entries")
    .insert({ problem_id: problemId, body })
    .select()
    .single();

  if (error) throw error;
  return rowToProgress(data as ProgressRow);
}

export async function countProblems(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("problems")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

/** Club feed: recent problems joined to the handle they were issued to. */
export async function listFeed(limit = 40): Promise<(Problem & { handle: string })[]> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("*, profiles(handle), progress_entries(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r) => {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    return { ...rowToProblem(row as ProblemRow), handle: profiles?.handle ?? "unknown" };
  });
}
