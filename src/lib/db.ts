import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  AppNotification,
  Checklist,
  CollabRequest,
  CollabRequestStatus,
  FrictionRecord,
  NotificationType,
  Problem,
  ProblemComment,
  ProblemPayload,
  ProgressEntry,
  Profile,
} from "@/lib/types";

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
  bio: string;
  skills: Profile["skills"];
  interests: string[];
  artifact_prefs: string[];
  time_budget: Profile["timeBudget"];
  team_size: Profile["teamSize"];
  appetite: Profile["appetite"];
  is_admin: boolean;
  discoverable: boolean;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio ?? "",
    skills: row.skills,
    interests: row.interests,
    artifactPrefs: row.artifact_prefs,
    timeBudget: row.time_budget,
    teamSize: row.team_size,
    appetite: row.appetite,
    isAdmin: row.is_admin,
    discoverable: row.discoverable,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create or update a profile. `profile.id` must be the caller's own
 * `auth.uid()` - every route that calls this sets it from the verified
 * session, never from client input.
 *
 * `is_admin` is deliberately absent from the column list below: an upsert
 * only touches the columns it names, so admin status cannot be granted or
 * revoked through this path no matter what the client sends.
 */
export async function upsertProfile(profile: Profile): Promise<Profile> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .upsert(
      {
        id: profile.id,
        handle: profile.handle,
        display_name: profile.displayName,
        bio: profile.bio,
        skills: profile.skills,
        interests: profile.interests,
        artifact_prefs: profile.artifactPrefs,
        time_budget: profile.timeBudget,
        team_size: profile.teamSize,
        appetite: profile.appetite,
        discoverable: profile.discoverable,
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

/**
 * Looks a profile up by its public handle - used for handle-availability
 * checks and for loading a public profile page. Never for identity/auth.
 */
export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

// --- Follows ---------------------------------------------------------------

/** Idempotent: following someone you already follow is a no-op, not an error. */
export async function followProfile(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return;
  const { error } = await getAdminClient()
    .from("follows")
    .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: "follower_id,following_id" });

  if (error) throw error;
}

export async function unfollowProfile(followerId: string, followingId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) throw error;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await getAdminClient()
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function countFollowers(profileId: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profileId);

  if (error) throw error;
  return count ?? 0;
}

export async function countFollowing(profileId: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profileId);

  if (error) throw error;
  return count ?? 0;
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
  feedback: Problem["feedback"];
  looking_for_collaborators: boolean | null;
  friction_id: string | null;
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
    feedback: row.feedback ?? null,
    lookingForCollaborators: row.looking_for_collaborators ?? false,
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
  const {
    id,
    fingerprint,
    profileId,
    payload,
    status,
    notes,
    lookingForCollaborators,
    domainId,
    frictionId,
    fit,
    difficulty,
    createdAt,
  } = packProblem(problem);

  const { data, error } = await getAdminClient()
    .from("problems")
    .insert({
      id,
      fingerprint,
      profile_id: profileId,
      payload,
      status,
      notes,
      looking_for_collaborators: lookingForCollaborators,
      domain_id: domainId,
      friction_id: frictionId,
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
    feedback,
    lookingForCollaborators,
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
    lookingForCollaborators,
    createdAt,
    domainId: dna.domainId,
    frictionId: dna.frictionId,
    fit: fit.score,
    difficulty: fit.difficulty,
    payload: { ...rest, dna, fit },
  };
}

/** Used by reroll: the old draw never really counted as issued, so it is
 * dropped rather than kept around with some synthetic status. Cascades to
 * its progress_entries, though a "new"-status problem should never have any. */
export async function deleteProblem(id: string): Promise<void> {
  const { error } = await getAdminClient().from("problems").delete().eq("id", id);
  if (error) throw error;
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
  patch: {
    status?: Problem["status"];
    notes?: string;
    checklist?: Checklist;
    feedback?: Problem["feedback"];
    lookingForCollaborators?: boolean;
  },
): Promise<Problem | null> {
  const existing = await getProblem(id);
  if (!existing) return null;

  const { error } = await getAdminClient()
    .from("problems")
    .update({
      status: patch.status ?? existing.status,
      notes: patch.notes ?? existing.notes,
      checklist: patch.checklist ?? existing.checklist,
      feedback: "feedback" in patch ? patch.feedback : existing.feedback,
      looking_for_collaborators: patch.lookingForCollaborators ?? existing.lookingForCollaborators,
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

export async function countShippedProblems(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("problems")
    .select("*", { count: "exact", head: true })
    .eq("status", "shipped");

  if (error) throw error;
  return count ?? 0;
}

/** Club feed: recent problems joined to the handle they were issued to. */
export async function listFeed(limit = 40): Promise<(Problem & { handle: string })[]> {
  const { data, error } = await getAdminClient()
    .from("problems")
    // Explicit constraint name: problem_likes and problem_comments both also
    // link problems to profiles now, so PostgREST can no longer infer which
    // relationship "profiles(handle)" means on its own.
    .select("*, profiles!problems_profile_id_fkey(handle), progress_entries(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r) => {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    return { ...rowToProblem(row as ProblemRow), handle: profiles?.handle ?? "unknown" };
  });
}

/**
 * The home feed: recent problems from people the viewer follows, newest
 * first - the actual "why open the app today" screen. Restricted to
 * saved/building/shipped for the same reason `listOpenForCollaboration` is:
 * a "new" draw hasn't been kept yet, so it isn't really an update about
 * someone's work.
 */
export async function listFollowingFeed(viewerId: string, limit = 40): Promise<(Problem & { handle: string })[]> {
  const { data: followRows, error: followErr } = await getAdminClient()
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId);
  if (followErr) throw followErr;

  const followingIds = (followRows ?? []).map((r) => (r as { following_id: string }).following_id);
  if (followingIds.length === 0) return [];

  const { data, error } = await getAdminClient()
    .from("problems")
    .select("*, profiles!problems_profile_id_fkey(handle)")
    .in("profile_id", followingIds)
    .in("status", ["saved", "building", "shipped"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r) => {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    return { ...rowToProblem(row as ProblemRow), handle: profiles?.handle ?? "unknown" };
  });
}

// --- Frictions -----------------------------------------------------------

interface FrictionRow {
  id: string;
  domain_id: string;
  actor: string;
  text: string;
  mechanics: string[];
  status: FrictionRecord["status"];
  submitted_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles?: { handle: string } | null;
}

function rowToFriction(row: FrictionRow): FrictionRecord {
  return {
    id: row.id,
    domainId: row.domain_id,
    actor: row.actor,
    text: row.text,
    mechanics: row.mechanics,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedByHandle: row.profiles?.handle ?? null,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/** The catalogue the generator draws from. */
export async function listAcceptedFrictions(): Promise<FrictionRecord[]> {
  const { data, error } = await getAdminClient()
    .from("frictions")
    .select("*")
    .eq("status", "accepted");

  if (error) throw error;
  return (data ?? []).map((r) => rowToFriction(r as FrictionRow));
}

/** Review queue, newest first, with the submitter's handle for attribution. */
export async function listFrictionsByStatus(
  status: FrictionRecord["status"],
): Promise<FrictionRecord[]> {
  const { data, error } = await getAdminClient()
    .from("frictions")
    .select("*, profiles(handle)")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => rowToFriction(r as FrictionRow));
}

export async function listFrictionsSubmittedBy(profileId: string): Promise<FrictionRecord[]> {
  const { data, error } = await getAdminClient()
    .from("frictions")
    .select("*, profiles(handle)")
    .eq("submitted_by", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => rowToFriction(r as FrictionRow));
}

export async function submitFriction(input: {
  domainId: string;
  actor: string;
  text: string;
  mechanics: string[];
  submittedBy: string;
}): Promise<FrictionRecord> {
  const { data, error } = await getAdminClient()
    .from("frictions")
    .insert({
      domain_id: input.domainId,
      actor: input.actor,
      text: input.text,
      mechanics: input.mechanics,
      status: "pending",
      submitted_by: input.submittedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToFriction(data as FrictionRow);
}

export async function reviewFriction(
  id: string,
  status: "accepted" | "rejected",
): Promise<FrictionRecord | null> {
  const { data, error } = await getAdminClient()
    .from("frictions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? rowToFriction(data as FrictionRow) : null;
}

export interface FrictionFeedbackCounts {
  up: number;
  down: number;
}

/**
 * Up/down tallies per friction, from problems whose owner has actually
 * weighed in. Aggregated in Node rather than SQL - club-scale data, and it
 * avoids reaching for an RPC just to GROUP BY two columns.
 */
export async function getFrictionFeedbackCounts(): Promise<Map<string, FrictionFeedbackCounts>> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("friction_id, feedback")
    .not("friction_id", "is", null)
    .not("feedback", "is", null);

  if (error) throw error;

  const counts = new Map<string, FrictionFeedbackCounts>();
  for (const row of data ?? []) {
    const { friction_id, feedback } = row as { friction_id: string; feedback: "up" | "down" };
    const entry = counts.get(friction_id) ?? { up: 0, down: 0 };
    entry[feedback]++;
    counts.set(friction_id, entry);
  }
  return counts;
}

/** How many problems have ever been drawn from each friction, feedback or not. */
export async function getFrictionIssuedCounts(): Promise<Map<string, number>> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("friction_id")
    .not("friction_id", "is", null);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const { friction_id } = row as { friction_id: string };
    counts.set(friction_id, (counts.get(friction_id) ?? 0) + 1);
  }
  return counts;
}

export async function countAcceptedFrictions(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("frictions")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted");

  if (error) throw error;
  return count ?? 0;
}

// --- Pairing -------------------------------------------------------------

/**
 * Members who have opted into being listed as possible collaborators.
 *
 * Returns full profiles because the complement calculation needs their skill
 * levels - but profiles hold no email or any other contact detail, so the
 * caller is only ever exposing a handle, a display name, and what someone
 * said they can do.
 */
export async function listDiscoverableProfiles(): Promise<Profile[]> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select("*")
    .eq("discoverable", true);

  if (error) throw error;
  return (data ?? []).map((r) => rowToProfile(r as ProfileRow));
}

/** How many problems each profile is actively building, for pairing context. */
export async function countBuildingByProfile(): Promise<Map<string, number>> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("profile_id")
    .eq("status", "building");

  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const id = (row as { profile_id: string }).profile_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

// --- Collaboration ---------------------------------------------------------

/**
 * Problems flagged open to collaborators, newest first, with the owner's
 * handle. Restricted to saved/building - a "new" problem hasn't even been
 * kept yet, and a shipped/passed one is done.
 */
export async function listOpenForCollaboration(): Promise<(Problem & { handle: string })[]> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("*, profiles!problems_profile_id_fkey(handle)")
    .eq("looking_for_collaborators", true)
    .in("status", ["saved", "building"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    return { ...rowToProblem(row as ProblemRow), handle: profiles?.handle ?? "unknown" };
  });
}

interface CollabRequestRow {
  id: string;
  problem_id: string | null;
  from_profile_id: string;
  to_profile_id: string;
  message: string;
  status: CollabRequestStatus;
  created_at: string;
  responded_at: string | null;
}

/**
 * Fills in the handles (and, for problem-tied requests, the problem's
 * title/domain) that the row itself doesn't carry. Done as a couple of
 * batched follow-up queries rather than a PostgREST embed, since
 * `collab_requests` has two foreign keys into `profiles` - disambiguating
 * that in an embedded select needs exact constraint-name hints, and this is
 * club-scale data where a plain `.in(...)` is simpler and just as fast.
 */
async function hydrateCollabRequests(rows: CollabRequestRow[]): Promise<CollabRequest[]> {
  if (rows.length === 0) return [];

  const profileIds = [...new Set(rows.flatMap((r) => [r.from_profile_id, r.to_profile_id]))];
  const problemIds = [...new Set(rows.map((r) => r.problem_id).filter((id): id is string => id !== null))];

  const [profilesRes, problemsRes] = await Promise.all([
    getAdminClient().from("profiles").select("id, handle").in("id", profileIds),
    problemIds.length > 0
      ? getAdminClient().from("problems").select("id, payload").in("id", problemIds)
      : Promise.resolve({ data: [] as { id: string; payload: ProblemPayload }[], error: null }),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (problemsRes.error) throw problemsRes.error;

  const handleById = new Map((profilesRes.data ?? []).map((p) => [p.id as string, p.handle as string]));
  const problemById = new Map(
    (problemsRes.data ?? []).map((p) => [p.id as string, p.payload as ProblemPayload]),
  );

  return rows.map((row) => {
    const problem = row.problem_id ? problemById.get(row.problem_id) : undefined;
    return {
      id: row.id,
      problemId: row.problem_id,
      fromProfileId: row.from_profile_id,
      fromHandle: handleById.get(row.from_profile_id) ?? "unknown",
      toProfileId: row.to_profile_id,
      toHandle: handleById.get(row.to_profile_id) ?? "unknown",
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      problemTitle: problem?.title,
      problemDomainIcon: problem?.domainIcon,
      problemDomainLabel: problem?.domainLabel,
    };
  });
}

export interface CollabRequestInput {
  /** Null for a general request not tied to any problem. */
  problemId?: string | null;
  fromProfileId: string;
  toProfileId: string;
  message: string;
}

export async function createCollabRequest(input: CollabRequestInput): Promise<CollabRequest> {
  const { data, error } = await getAdminClient()
    .from("collab_requests")
    .insert({
      problem_id: input.problemId ?? null,
      from_profile_id: input.fromProfileId,
      to_profile_id: input.toProfileId,
      message: input.message,
    })
    .select()
    .single();

  if (error) throw error;
  const [hydrated] = await hydrateCollabRequests([data as CollabRequestRow]);
  return hydrated;
}

/** So the route can refuse a duplicate before it ever reaches the database. */
export async function hasPendingCollabRequest(
  fromProfileId: string,
  toProfileId: string,
  problemId: string | null,
): Promise<boolean> {
  let query = getAdminClient()
    .from("collab_requests")
    .select("id", { count: "exact", head: true })
    .eq("from_profile_id", fromProfileId)
    .eq("to_profile_id", toProfileId)
    .eq("status", "pending");
  query = problemId ? query.eq("problem_id", problemId) : query.is("problem_id", null);

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getCollabRequest(id: string): Promise<CollabRequest | null> {
  const { data, error } = await getAdminClient()
    .from("collab_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const [hydrated] = await hydrateCollabRequests([data as CollabRequestRow]);
  return hydrated;
}

export async function respondToCollabRequest(
  id: string,
  status: "accepted" | "declined",
): Promise<CollabRequest | null> {
  const { error } = await getAdminClient()
    .from("collab_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  return getCollabRequest(id);
}

/** Everything involving this person, newest first, split by direction. */
export async function listCollabRequestsFor(
  profileId: string,
): Promise<{ incoming: CollabRequest[]; outgoing: CollabRequest[] }> {
  const { data, error } = await getAdminClient()
    .from("collab_requests")
    .select("*")
    .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const hydrated = await hydrateCollabRequests((data ?? []) as CollabRequestRow[]);
  return {
    incoming: hydrated.filter((r) => r.toProfileId === profileId),
    outgoing: hydrated.filter((r) => r.fromProfileId === profileId),
  };
}

// --- Engagement: likes + comments -------------------------------------------

/** Toggles the viewer's like on a problem. Returns the new state. */
export async function toggleLike(problemId: string, profileId: string): Promise<boolean> {
  const { data: existing, error: selErr } = await getAdminClient()
    .from("problem_likes")
    .select("profile_id")
    .eq("problem_id", problemId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await getAdminClient()
      .from("problem_likes")
      .delete()
      .eq("problem_id", problemId)
      .eq("profile_id", profileId);
    if (error) throw error;
    return false;
  }

  const { error } = await getAdminClient()
    .from("problem_likes")
    .insert({ problem_id: problemId, profile_id: profileId });
  if (error) throw error;
  return true;
}

export async function countLikes(problemId: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("problem_likes")
    .select("*", { count: "exact", head: true })
    .eq("problem_id", problemId);
  if (error) throw error;
  return count ?? 0;
}

interface CommentRow {
  id: string;
  problem_id: string;
  profile_id: string;
  body: string;
  created_at: string;
  profiles?: { handle: string } | null;
}

function rowToComment(row: CommentRow): ProblemComment {
  return {
    id: row.id,
    problemId: row.problem_id,
    profileId: row.profile_id,
    handle: row.profiles?.handle ?? "unknown",
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listComments(problemId: string): Promise<ProblemComment[]> {
  const { data, error } = await getAdminClient()
    .from("problem_comments")
    .select("*, profiles(handle)")
    .eq("problem_id", problemId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToComment(r as CommentRow));
}

export async function addComment(problemId: string, profileId: string, body: string): Promise<ProblemComment> {
  const { data, error } = await getAdminClient()
    .from("problem_comments")
    .insert({ problem_id: problemId, profile_id: profileId, body })
    .select("*, profiles(handle)")
    .single();
  if (error) throw error;
  return rowToComment(data as CommentRow);
}

interface EngagementInfo {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

/**
 * Batched like/comment counts for a set of problems, aggregated in Node -
 * club-scale data, same reasoning as everywhere else in this file that skips
 * a GROUP BY RPC for a couple of `.in()` queries.
 */
async function getEngagementFor(problemIds: string[], viewerId: string | null): Promise<Map<string, EngagementInfo>> {
  const map = new Map<string, EngagementInfo>();
  for (const id of problemIds) map.set(id, { likeCount: 0, commentCount: 0, likedByMe: false });
  if (problemIds.length === 0) return map;

  const [likesRes, commentsRes] = await Promise.all([
    getAdminClient().from("problem_likes").select("problem_id, profile_id").in("problem_id", problemIds),
    getAdminClient().from("problem_comments").select("problem_id").in("problem_id", problemIds),
  ]);
  if (likesRes.error) throw likesRes.error;
  if (commentsRes.error) throw commentsRes.error;

  for (const row of likesRes.data ?? []) {
    const r = row as { problem_id: string; profile_id: string };
    const entry = map.get(r.problem_id);
    if (!entry) continue;
    entry.likeCount++;
    if (viewerId && r.profile_id === viewerId) entry.likedByMe = true;
  }
  for (const row of commentsRes.data ?? []) {
    const r = row as { problem_id: string };
    const entry = map.get(r.problem_id);
    if (entry) entry.commentCount++;
  }
  return map;
}

/** Joins like/comment counts (and whether the viewer liked it) onto a list of problems. */
export async function attachEngagement<T extends Problem>(problems: T[], viewerId: string | null): Promise<T[]> {
  const map = await getEngagementFor(problems.map((p) => p.id), viewerId);
  return problems.map((p) => ({ ...p, ...(map.get(p.id) ?? { likeCount: 0, commentCount: 0, likedByMe: false }) }));
}

// --- Notifications -----------------------------------------------------------

interface NotificationRow {
  id: string;
  profile_id: string;
  type: NotificationType;
  actor_profile_id: string | null;
  problem_id: string | null;
  collab_request_id: string | null;
  read: boolean;
  created_at: string;
}

/**
 * Fills in the actor's handle and, where relevant, the problem's title - a
 * couple of batched `.in()` lookups rather than a PostgREST embed, since
 * `notifications` has two foreign keys into `profiles` (recipient and actor)
 * the same way `collab_requests` does. See `hydrateCollabRequests` above.
 */
async function hydrateNotifications(rows: NotificationRow[]): Promise<AppNotification[]> {
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actor_profile_id).filter((id): id is string => id !== null))];
  const problemIds = [...new Set(rows.map((r) => r.problem_id).filter((id): id is string => id !== null))];

  const [actorsRes, problemsRes] = await Promise.all([
    actorIds.length > 0
      ? getAdminClient().from("profiles").select("id, handle").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; handle: string }[], error: null }),
    problemIds.length > 0
      ? getAdminClient().from("problems").select("id, payload").in("id", problemIds)
      : Promise.resolve({ data: [] as { id: string; payload: ProblemPayload }[], error: null }),
  ]);
  if (actorsRes.error) throw actorsRes.error;
  if (problemsRes.error) throw problemsRes.error;

  const handleById = new Map((actorsRes.data ?? []).map((p) => [p.id as string, p.handle as string]));
  const problemById = new Map((problemsRes.data ?? []).map((p) => [p.id as string, p.payload as ProblemPayload]));

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    actorHandle: row.actor_profile_id ? handleById.get(row.actor_profile_id) ?? "unknown" : null,
    problemId: row.problem_id,
    problemTitle: row.problem_id ? problemById.get(row.problem_id)?.title : undefined,
    read: row.read,
    createdAt: row.created_at,
  }));
}

export interface CreateNotificationInput {
  /** Who should see this. */
  profileId: string;
  type: NotificationType;
  /** Who caused it - omitted for a hypothetical system notification. */
  actorProfileId?: string | null;
  problemId?: string | null;
  collabRequestId?: string | null;
}

/** A no-op when the actor and the recipient are the same person - nobody needs to be told about their own action. */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (input.actorProfileId && input.actorProfileId === input.profileId) return;

  const { error } = await getAdminClient().from("notifications").insert({
    profile_id: input.profileId,
    type: input.type,
    actor_profile_id: input.actorProfileId ?? null,
    problem_id: input.problemId ?? null,
    collab_request_id: input.collabRequestId ?? null,
  });
  if (error) throw error;
}

export async function listNotifications(profileId: string, limit = 30): Promise<AppNotification[]> {
  const { data, error } = await getAdminClient()
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateNotifications((data ?? []) as NotificationRow[]);
}

export async function countUnreadNotifications(profileId: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationsRead(profileId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("notifications")
    .update({ read: true })
    .eq("profile_id", profileId)
    .eq("read", false);
  if (error) throw error;
}
