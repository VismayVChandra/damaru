import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_STATUSES, COLLAB_OPEN_STATUSES, COMMITTED_STATUSES } from "@/lib/status";
import type {
  AppNotification,
  BuildLogKind,
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
  ProjectRole,
  TeamMember,
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
  kind: BuildLogKind;
  image_url: string | null;
  link_url: string | null;
  profile_id: string | null;
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
  inspired_by_problem_id: string | null;
  status_changed_at: string | null;
  created_at: string;
  /** Present only on queries that embed the relation. */
  progress_entries?: ProgressRow[];
}

function rowToProgress(row: ProgressRow): ProgressEntry {
  return {
    id: row.id,
    problemId: row.problem_id,
    body: row.body,
    kind: row.kind ?? "progress",
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    profileId: row.profile_id ?? null,
    createdAt: row.created_at,
  };
}

function rowToProblem(row: ProblemRow): Problem {
  return {
    ...row.payload,
    id: row.id,
    fingerprint: row.fingerprint,
    profileId: row.profile_id,
    inspiredByProblemId: row.inspired_by_problem_id ?? null,
    status: row.status,
    notes: row.notes,
    // Rows written before the checklist column existed come back null.
    checklist: row.checklist ?? {},
    feedback: row.feedback ?? null,
    lookingForCollaborators: row.looking_for_collaborators ?? false,
    statusChangedAt: row.status_changed_at ?? null,
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
 * Every friction this person has ever been issued a problem from, regardless
 * of status - a fingerprint only blocks the exact (friction, mechanic,
 * artifact, twist, signal) combination from repeating, so on its own a small
 * domain's one most-versatile friction can resurface draw after draw with
 * just a different mechanic. That reads as "I've seen this before" even
 * though it technically wasn't - the friction and its actor are what a
 * person actually recognises, not the DNA underneath. Selects only the
 * payload rather than the fuller `listProblemsForProfile` shape, since this
 * runs on every generate/reroll and has no use for the progress log.
 */
export async function listIssuedFrictionIds(profileId: string): Promise<Set<string>> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("payload")
    .eq("profile_id", profileId);
  if (error) throw error;

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const frictionId = (row.payload as ProblemPayload).dna.frictionId;
    if (frictionId) ids.add(frictionId);
  }
  return ids;
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
    inspiredByProblemId,
    statusChangedAt,
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
      inspired_by_problem_id: inspiredByProblemId ?? null,
      // A fresh draw has not moved anywhere yet.
      status_changed_at: statusChangedAt ?? null,
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
    inspiredByProblemId,
    status,
    notes,
    checklist,
    feedback,
    lookingForCollaborators,
    statusChangedAt,
    progress,
    createdAt,
    dna,
    fit,
    // Loaded-where-needed view data, same as `progress` above - none of
    // these belong in the immutable payload, so they're pulled out here and
    // never spread into `rest`.
    team,
    roles,
    memberCount,
    ...rest
  } = problem;
  return {
    id,
    fingerprint,
    profileId,
    inspiredByProblemId,
    status,
    notes,
    lookingForCollaborators,
    statusChangedAt,
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

  // Only stamp the clock when the status genuinely moves. `!== undefined`
  // rather than truthiness, and a conditional spread rather than writing the
  // old value back, so ticking a checklist box or saving a note never reads as
  // "started building this". The guard lives here rather than in the route so
  // every caller inherits it.
  const statusChanged = patch.status !== undefined && patch.status !== existing.status;

  const { error } = await getAdminClient()
    .from("problems")
    .update({
      status: patch.status ?? existing.status,
      notes: patch.notes ?? existing.notes,
      checklist: patch.checklist ?? existing.checklist,
      feedback: "feedback" in patch ? patch.feedback : existing.feedback,
      looking_for_collaborators: patch.lookingForCollaborators ?? existing.lookingForCollaborators,
      ...(statusChanged ? { status_changed_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);

  if (error) throw error;
  // Re-read rather than using the update's own return, so the embedded
  // progress log comes back with it.
  return getProblem(id);
}

/** Append one entry to a project's build log. */
export async function addProgressEntry(
  problemId: string,
  input: {
    body: string;
    kind?: BuildLogKind;
    imageUrl?: string | null;
    linkUrl?: string | null;
    /** Whoever is posting - the owner or any team member, since 009 widened
     * this beyond the owner and left no record of which of them it was. */
    profileId?: string | null;
  },
): Promise<ProgressEntry> {
  const { data, error } = await getAdminClient()
    .from("progress_entries")
    .insert({
      problem_id: problemId,
      body: input.body,
      kind: input.kind ?? "progress",
      image_url: input.imageUrl ?? null,
      link_url: input.linkUrl ?? null,
      profile_id: input.profileId ?? null,
    })
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
 * committed statuses for the same reason `listOpenForCollaboration` is:
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
    .in("status", COMMITTED_STATUSES)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r) => {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    return { ...rowToProblem(row as ProblemRow), handle: profiles?.handle ?? "unknown" };
  });
}

/** The follow graph as a bare id list. Extracted so callers that only need
 * "who does this person follow" don't hand-roll the two-step lookup again. */
export async function listFollowingIds(viewerId: string): Promise<string[]> {
  const { data, error } = await getAdminClient()
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId);

  if (error) throw error;
  return (data ?? []).map((r) => (r as { following_id: string }).following_id);
}

/** What a card needs to say about a project beyond the project itself. */
export interface ProjectSignals {
  /** Owner plus accepted members. The owner is never a project_members row,
   * so every count starts at 1 - same synthesis listTeamMembers does. */
  teamSize: number;
  /** Still flagged open AND not yet full. */
  openRoles: number;
  seatsOpen: number;
  roleNames: string[];
  /** Free text, as the owner typed it. */
  roleSkills: string[];
  buildLogCount: number;
  latestLog: ProgressEntry | null;
  /** The newest build log if it beats the project's own creation, else that. */
  lastActivityAt: string;
}

/**
 * Team size, open roles and build-log state for many projects in three
 * queries, instead of listTeamMembers + listProjectRoles per project - which
 * a feed of a dozen cards would turn into thirty round trips. Same batched
 * `.in()` + JS Map shape as countActiveByProfile.
 *
 * `filled` comes from the same project_members scan that yields `teamSize`,
 * so the two can never disagree. The returned Map has an entry for every id
 * asked for, so callers never handle undefined.
 */
export async function getProjectSignals(
  problems: Pick<Problem, "id" | "createdAt">[],
): Promise<Map<string, ProjectSignals>> {
  const map = new Map<string, ProjectSignals>();
  for (const p of problems) {
    map.set(p.id, {
      teamSize: 1,
      openRoles: 0,
      seatsOpen: 0,
      roleNames: [],
      roleSkills: [],
      buildLogCount: 0,
      latestLog: null,
      lastActivityAt: p.createdAt,
    });
  }
  const ids = problems.map((p) => p.id);
  if (ids.length === 0) return map;

  const [membersRes, rolesRes, logsRes] = await Promise.all([
    getAdminClient().from("project_members").select("problem_id, profile_id, role_id").in("problem_id", ids),
    getAdminClient()
      .from("project_roles")
      .select("id, problem_id, role_name, skills, count_needed, open")
      .in("problem_id", ids)
      .eq("open", true),
    getAdminClient()
      .from("progress_entries")
      .select("*")
      .in("problem_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  if (membersRes.error) throw membersRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (logsRes.error) throw logsRes.error;

  const filledByRole = new Map<string, number>();
  for (const row of membersRes.data ?? []) {
    const r = row as { problem_id: string; role_id: string | null };
    const entry = map.get(r.problem_id);
    if (entry) entry.teamSize++;
    if (r.role_id) filledByRole.set(r.role_id, (filledByRole.get(r.role_id) ?? 0) + 1);
  }

  for (const row of rolesRes.data ?? []) {
    const r = row as {
      id: string;
      problem_id: string;
      role_name: string;
      skills: string[] | null;
      count_needed: number;
    };
    const entry = map.get(r.problem_id);
    if (!entry) continue;
    const seats = r.count_needed - (filledByRole.get(r.id) ?? 0);
    if (seats <= 0) continue;
    entry.openRoles++;
    entry.seatsOpen += seats;
    entry.roleNames.push(r.role_name);
    for (const s of r.skills ?? []) if (!entry.roleSkills.includes(s)) entry.roleSkills.push(s);
  }

  for (const row of logsRes.data ?? []) {
    const r = row as ProgressRow;
    const entry = map.get(r.problem_id);
    if (!entry) continue;
    entry.buildLogCount++;
    // Newest first, so the first one seen for a project is its latest.
    if (!entry.latestLog) {
      entry.latestLog = rowToProgress(r);
      if (r.created_at > entry.lastActivityAt) entry.lastActivityAt = r.created_at;
    }
  }

  return map;
}

/** Shipped work, newest first, with the owner's handle - the Showcase gallery.
 * Embeds progress entries so a card can pull a cover image from the build log
 * without a second round trip. */
export async function listShippedProblems(limit = 60): Promise<(Problem & { handle: string })[]> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("*, profiles!problems_profile_id_fkey(handle), progress_entries(*)")
    .eq("status", "shipped")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r) => {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    return { ...rowToProblem(row as ProblemRow), handle: profiles?.handle ?? "unknown" };
  });
}

/** Has this person already forked this project? Checked before inserting a
 * fork, not after: `insertProblem`'s "unique violation means draw again"
 * contract is meaningless for a fork, which has nothing to redraw. */
export async function hasForked(sourceProblemId: string, forkingProfileId: string): Promise<boolean> {
  const { count, error } = await getAdminClient()
    .from("problems")
    .select("id", { count: "exact", head: true })
    .eq("inspired_by_problem_id", sourceProblemId)
    .eq("profile_id", forkingProfileId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/** How many projects other people started from this person's work - the
 * payoff for shipping something good enough that someone wanted their own. */
export async function countForksOfProfile(profileId: string): Promise<number> {
  // Two steps rather than a self-join: PostgREST needs an explicit constraint
  // name to embed a self-referencing FK, and the id list is club-scale.
  const { data: mine, error: mineErr } = await getAdminClient()
    .from("problems")
    .select("id")
    .eq("profile_id", profileId);
  if (mineErr) throw mineErr;

  const ids = (mine ?? []).map((r) => (r as { id: string }).id);
  if (ids.length === 0) return 0;

  const { count, error } = await getAdminClient()
    .from("problems")
    .select("id", { count: "exact", head: true })
    .in("inspired_by_problem_id", ids);
  if (error) throw error;
  return count ?? 0;
}

/** Their existing fork of this project, so a repeat attempt can be handed a
 * link to it rather than a bare error. */
export async function getFork(sourceProblemId: string, forkingProfileId: string): Promise<Problem | null> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select(PROBLEM_WITH_PROGRESS)
    .eq("inspired_by_problem_id", sourceProblemId)
    .eq("profile_id", forkingProfileId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProblem(data as ProblemRow) : null;
}

/** A project as an activity item needs it - enough to name and link it, never
 * the whole payload. */
export interface ActivityProject {
  id: string;
  title: string;
  status: Problem["status"];
  domainIcon: string;
  domainLabel: string;
  ownerProfileId: string;
  ownerHandle: string;
  inspiredByProblemId: string | null;
  createdAt: string;
  statusChangedAt: string | null;
}

export interface ActivitySources {
  /** Every committed project, keyed by id - the spine every event hangs off. */
  projects: Map<string, ActivityProject>;
  progress: (ProgressEntry & { authorHandle?: string })[];
  roles: { id: string; problemId: string; roleName: string; createdAt: string }[];
  joins: { problemId: string; profileId: string; handle: string; roleName: string; joinedAt: string }[];
}

/**
 * Raw material for the club-wide activity feed, deliberately un-merged: the
 * merge, the collapse rules and the ordering are pure logic and live in
 * src/lib/activity-feed.ts, the same way rankRadar lives in discover.ts rather
 * than here.
 *
 * Four queries in parallel, plus one handle lookup - the cost is independent
 * of how long the feed is and how many projects exist. The projects query is
 * deliberately unlimited and untimed: something that happened today can belong
 * to a project started a year ago, so ordering and limiting it would silently
 * drop the very events the window is meant to catch. Club-scale, same order of
 * cost /discover already pays.
 */
export async function listClubActivitySources(sinceISO: string): Promise<ActivitySources> {
  const admin = getAdminClient();

  const [problemsRes, progressRes, rolesRes, joinsRes] = await Promise.all([
    admin
      .from("problems")
      .select("*, profiles!problems_profile_id_fkey(handle)")
      .in("status", COMMITTED_STATUSES),
    admin.from("progress_entries").select("*").gte("created_at", sinceISO).order("created_at", { ascending: false }),
    admin.from("project_roles").select("id, problem_id, role_name, created_at").gte("created_at", sinceISO),
    admin.from("project_members").select("problem_id, profile_id, role_name, joined_at").gte("joined_at", sinceISO),
  ]);
  if (problemsRes.error) throw problemsRes.error;
  if (progressRes.error) throw progressRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (joinsRes.error) throw joinsRes.error;

  const projects = new Map<string, ActivityProject>();
  for (const r of problemsRes.data ?? []) {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    const problem = rowToProblem(row as ProblemRow);
    projects.set(problem.id, {
      id: problem.id,
      title: problem.title,
      status: problem.status,
      domainIcon: problem.domainIcon,
      domainLabel: problem.domainLabel,
      ownerProfileId: problem.profileId,
      ownerHandle: profiles?.handle ?? "unknown",
      inspiredByProblemId: problem.inspiredByProblemId,
      createdAt: problem.createdAt,
      statusChangedAt: problem.statusChangedAt,
    });
  }

  // Everyone who needs naming: build-log authors and joiners. One lookup.
  const progressRows = (progressRes.data ?? []) as ProgressRow[];
  const joinRows = (joinsRes.data ?? []) as {
    problem_id: string;
    profile_id: string;
    role_name: string | null;
    joined_at: string;
  }[];
  const peopleIds = [
    ...new Set([
      ...progressRows.map((r) => r.profile_id).filter((id): id is string => Boolean(id)),
      ...joinRows.map((r) => r.profile_id),
    ]),
  ];
  const handleById = new Map<string, string>();
  if (peopleIds.length > 0) {
    const { data, error } = await admin.from("profiles").select("id, handle").in("id", peopleIds);
    if (error) throw error;
    for (const p of data ?? []) {
      const row = p as { id: string; handle: string };
      handleById.set(row.id, row.handle);
    }
  }

  return {
    projects,
    progress: progressRows.map((r) => ({
      ...rowToProgress(r),
      authorHandle: r.profile_id ? handleById.get(r.profile_id) : undefined,
    })),
    roles: rolesRes.data
      ? (rolesRes.data as { id: string; problem_id: string; role_name: string; created_at: string }[]).map((r) => ({
          id: r.id,
          problemId: r.problem_id,
          roleName: r.role_name,
          createdAt: r.created_at,
        }))
      : [],
    joins: joinRows.map((r) => ({
      problemId: r.problem_id,
      profileId: r.profile_id,
      handle: handleById.get(r.profile_id) ?? "unknown",
      roleName: r.role_name ?? "",
      joinedAt: r.joined_at,
    })),
  };
}

/**
 * Weekly Digest source data: from people the viewer follows, in the last N
 * days - new (kept) problems, plus the build-log entries logged against any
 * of their committed problems (not just ones started this week - progress on
 * an older project is still "what happened this week").
 */
export async function listFollowingActivity(
  viewerId: string,
  sinceISO: string,
): Promise<{
  newProblems: (Problem & { handle: string })[];
  progressEntries: (ProgressEntry & {
    problemId: string;
    problemTitle: string;
    handle: string;
    domainIcon: string;
    domainLabel: string;
  })[];
}> {
  const { data: followRows, error: followErr } = await getAdminClient()
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId);
  if (followErr) throw followErr;

  const followingIds = (followRows ?? []).map((r) => (r as { following_id: string }).following_id);
  if (followingIds.length === 0) return { newProblems: [], progressEntries: [] };

  const { data: problemRows, error: probErr } = await getAdminClient()
    .from("problems")
    .select("*, profiles!problems_profile_id_fkey(handle)")
    .in("profile_id", followingIds)
    .in("status", COMMITTED_STATUSES)
    .order("created_at", { ascending: false });
  if (probErr) throw probErr;

  const allProblems = (problemRows ?? []).map((r) => {
    const { profiles, ...row } = r as ProblemRow & { profiles: { handle: string } | null };
    return { ...rowToProblem(row as ProblemRow), handle: profiles?.handle ?? "unknown" };
  });
  const newProblems = allProblems.filter((p) => p.createdAt >= sinceISO);

  const problemIds = allProblems.map((p) => p.id);
  const { data: progressRows, error: progErr } = problemIds.length
    ? await getAdminClient()
        .from("progress_entries")
        .select("*")
        .in("problem_id", problemIds)
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false })
    : { data: [] as ProgressRow[], error: null };
  if (progErr) throw progErr;

  const metaById = new Map(allProblems.map((p) => [p.id, p]));
  const progressEntries = (progressRows ?? []).map((r) => {
    const row = r as ProgressRow;
    const meta = metaById.get(row.problem_id)!;
    return {
      ...rowToProgress(row),
      problemId: row.problem_id,
      problemTitle: meta.title,
      handle: meta.handle,
      domainIcon: meta.domainIcon,
      domainLabel: meta.domainLabel,
    };
  });

  return { newProblems, progressEntries };
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

/** How many projects each profile has actively in flight, for pairing context. */
export async function countActiveByProfile(): Promise<Map<string, number>> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("profile_id")
    .in("status", ACTIVE_STATUSES);

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
 * handle. Restricted to statuses that can still take on a collaborator - a
 * "new" problem hasn't even been kept yet, and a shipped/passed one is done.
 */
export async function listOpenForCollaboration(): Promise<(Problem & { handle: string })[]> {
  const { data, error } = await getAdminClient()
    .from("problems")
    .select("*, profiles!problems_profile_id_fkey(handle)")
    .eq("looking_for_collaborators", true)
    .in("status", COLLAB_OPEN_STATUSES)
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
  role_id: string | null;
  created_at: string;
  responded_at: string | null;
}

/**
 * Fills in the handles (and, for problem-tied requests, the problem's
 * title/domain, and for role-tied requests, the role's name) that the row
 * itself doesn't carry. Done as batched follow-up queries rather than a
 * PostgREST embed, since `collab_requests` has two foreign keys into
 * `profiles` - disambiguating that in an embedded select needs exact
 * constraint-name hints, and this is club-scale data where a plain
 * `.in(...)` is simpler and just as fast.
 */
async function hydrateCollabRequests(rows: CollabRequestRow[]): Promise<CollabRequest[]> {
  if (rows.length === 0) return [];

  const profileIds = [...new Set(rows.flatMap((r) => [r.from_profile_id, r.to_profile_id]))];
  const problemIds = [...new Set(rows.map((r) => r.problem_id).filter((id): id is string => id !== null))];
  const roleIds = [...new Set(rows.map((r) => r.role_id).filter((id): id is string => id !== null))];

  const [profilesRes, problemsRes, rolesRes] = await Promise.all([
    getAdminClient().from("profiles").select("id, handle").in("id", profileIds),
    problemIds.length > 0
      ? getAdminClient().from("problems").select("id, payload").in("id", problemIds)
      : Promise.resolve({ data: [] as { id: string; payload: ProblemPayload }[], error: null }),
    roleIds.length > 0
      ? getAdminClient().from("project_roles").select("id, role_name").in("id", roleIds)
      : Promise.resolve({ data: [] as { id: string; role_name: string }[], error: null }),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (problemsRes.error) throw problemsRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const handleById = new Map((profilesRes.data ?? []).map((p) => [p.id as string, p.handle as string]));
  const problemById = new Map(
    (problemsRes.data ?? []).map((p) => [p.id as string, p.payload as ProblemPayload]),
  );
  const roleNameById = new Map((rolesRes.data ?? []).map((r) => [r.id as string, r.role_name as string]));

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
      roleId: row.role_id,
      roleName: row.role_id ? roleNameById.get(row.role_id) : undefined,
    };
  });
}

export interface CollabRequestInput {
  /** Null for a general request not tied to any problem. */
  problemId?: string | null;
  fromProfileId: string;
  toProfileId: string;
  message: string;
  /** Set when this request is an application to a specific published role. */
  roleId?: string | null;
}

export async function createCollabRequest(input: CollabRequestInput): Promise<CollabRequest> {
  const { data, error } = await getAdminClient()
    .from("collab_requests")
    .insert({
      problem_id: input.problemId ?? null,
      from_profile_id: input.fromProfileId,
      to_profile_id: input.toProfileId,
      message: input.message,
      role_id: input.roleId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  const [hydrated] = await hydrateCollabRequests([data as CollabRequestRow]);
  return hydrated;
}

/**
 * So the route can refuse a duplicate before it ever reaches the database.
 * The dedupe key includes `roleId`, so applying to a second open role on the
 * same project isn't wrongly rejected as a repeat of the first application.
 */
export async function hasPendingCollabRequest(
  fromProfileId: string,
  toProfileId: string,
  problemId: string | null,
  roleId: string | null = null,
): Promise<boolean> {
  let query = getAdminClient()
    .from("collab_requests")
    .select("id", { count: "exact", head: true })
    .eq("from_profile_id", fromProfileId)
    .eq("to_profile_id", toProfileId)
    .eq("status", "pending");
  query = problemId ? query.eq("problem_id", problemId) : query.is("problem_id", null);
  query = roleId ? query.eq("role_id", roleId) : query.is("role_id", null);

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

/**
 * Likes and comments in the last N days, per problem - the raw signal behind
 * Project Radar. Deliberately separate from getEngagementFor: that one is
 * viewer-relative (likedByMe) and all-time; this one is neither.
 */
export async function getRecentEngagementCounts(
  problemIds: string[],
  sinceISO: string,
): Promise<Map<string, { likes: number; comments: number }>> {
  const map = new Map<string, { likes: number; comments: number }>();
  for (const id of problemIds) map.set(id, { likes: 0, comments: 0 });
  if (problemIds.length === 0) return map;

  const [likesRes, commentsRes] = await Promise.all([
    getAdminClient().from("problem_likes").select("problem_id").in("problem_id", problemIds).gte("created_at", sinceISO),
    getAdminClient().from("problem_comments").select("problem_id").in("problem_id", problemIds).gte("created_at", sinceISO),
  ]);
  if (likesRes.error) throw likesRes.error;
  if (commentsRes.error) throw commentsRes.error;

  for (const row of likesRes.data ?? []) map.get((row as { problem_id: string }).problem_id)!.likes++;
  for (const row of commentsRes.data ?? []) map.get((row as { problem_id: string }).problem_id)!.comments++;
  return map;
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

// --- Team ----------------------------------------------------------------

interface ProjectMemberRow {
  problem_id: string;
  profile_id: string;
  role_name: string;
  role_id: string | null;
  joined_at: string;
}

/**
 * A project's team: the owner first - synthesised from `problems.profile_id`,
 * never a row of its own (see the schema comment on `project_members`) - then
 * everyone whose collab request to join was accepted, oldest first. Batched
 * `.in()` over `profiles` rather than an embed, for consistency with the
 * rest of this file's hydration pattern.
 */
export async function listTeamMembers(problemId: string): Promise<TeamMember[]> {
  const { data: problemRow, error: problemErr } = await getAdminClient()
    .from("problems")
    .select("profile_id, created_at")
    .eq("id", problemId)
    .maybeSingle();
  if (problemErr) throw problemErr;
  if (!problemRow) return [];

  const { data: memberRows, error: memberErr } = await getAdminClient()
    .from("project_members")
    .select("problem_id, profile_id, role_name, role_id, joined_at")
    .eq("problem_id", problemId)
    .order("joined_at", { ascending: true });
  if (memberErr) throw memberErr;

  const members = (memberRows ?? []) as ProjectMemberRow[];
  const profileIds = [problemRow.profile_id, ...members.map((m) => m.profile_id)];
  const { data: profileRows, error: profilesErr } = await getAdminClient()
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", profileIds);
  if (profilesErr) throw profilesErr;

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id as string,
      { handle: p.handle as string, displayName: p.display_name as string },
    ]),
  );

  const owner: TeamMember = {
    profileId: problemRow.profile_id,
    handle: profileById.get(problemRow.profile_id)?.handle ?? "unknown",
    displayName: profileById.get(problemRow.profile_id)?.displayName ?? "unknown",
    roleName: "",
    roleId: null,
    isOwner: true,
    joinedAt: problemRow.created_at,
  };

  return [
    owner,
    ...members.map((m) => ({
      profileId: m.profile_id,
      handle: profileById.get(m.profile_id)?.handle ?? "unknown",
      displayName: profileById.get(m.profile_id)?.displayName ?? "unknown",
      roleName: m.role_name,
      roleId: m.role_id,
      isOwner: false,
      joinedAt: m.joined_at,
    })),
  ];
}

/** Idempotent: accepting an already-accepted request again just re-confirms the same row. */
export async function addTeamMember(input: {
  problemId: string;
  profileId: string;
  roleName?: string;
  roleId?: string | null;
}): Promise<void> {
  const { error } = await getAdminClient()
    .from("project_members")
    .upsert(
      {
        problem_id: input.problemId,
        profile_id: input.profileId,
        role_name: input.roleName ?? "",
        role_id: input.roleId ?? null,
      },
      { onConflict: "problem_id,profile_id" },
    );
  if (error) throw error;
}

export async function removeTeamMember(problemId: string, profileId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("project_members")
    .delete()
    .eq("problem_id", problemId)
    .eq("profile_id", profileId);
  if (error) throw error;
}

/** Authz helper: may this person post to the project's build log? */
export async function isTeamMember(problemId: string, profileId: string): Promise<boolean> {
  const { data, error } = await getAdminClient()
    .from("project_members")
    .select("profile_id")
    .eq("problem_id", problemId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Projects someone has joined but doesn't own - the dashboard's "projects I joined". */
export async function listProblemsWhereMember(profileId: string): Promise<Problem[]> {
  const { data: memberRows, error: memberErr } = await getAdminClient()
    .from("project_members")
    .select("problem_id")
    .eq("profile_id", profileId);
  if (memberErr) throw memberErr;

  const problemIds = (memberRows ?? []).map((m) => m.problem_id as string);
  if (problemIds.length === 0) return [];

  const { data, error } = await getAdminClient()
    .from("problems")
    .select(PROBLEM_WITH_PROGRESS)
    .in("id", problemIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToProblem(r as ProblemRow));
}

// --- Project roles ---------------------------------------------------------

interface ProjectRoleRow {
  id: string;
  problem_id: string;
  role_name: string;
  skills: string[];
  count_needed: number;
  description: string;
  commitment: string;
  duration: string;
  open: boolean;
  created_at: string;
}

function rowToRole(row: ProjectRoleRow, filled: number): ProjectRole {
  return {
    id: row.id,
    problemId: row.problem_id,
    roleName: row.role_name,
    skills: row.skills ?? [],
    countNeeded: row.count_needed,
    filled,
    description: row.description,
    commitment: row.commitment,
    duration: row.duration,
    open: row.open,
    createdAt: row.created_at,
  };
}

/** Roles for one project, with `filled` derived from project_members - never stored, so it can't drift. */
export async function listProjectRoles(problemId: string): Promise<ProjectRole[]> {
  const { data: roleRows, error: rolesErr } = await getAdminClient()
    .from("project_roles")
    .select("*")
    .eq("problem_id", problemId)
    .order("created_at", { ascending: true });
  if (rolesErr) throw rolesErr;
  if (!roleRows || roleRows.length === 0) return [];

  const roleIds = roleRows.map((r) => r.id as string);
  const { data: memberRows, error: membersErr } = await getAdminClient()
    .from("project_members")
    .select("role_id")
    .in("role_id", roleIds);
  if (membersErr) throw membersErr;

  const filledByRole = new Map<string, number>();
  for (const row of memberRows ?? []) {
    const roleId = (row as { role_id: string | null }).role_id;
    if (!roleId) continue;
    filledByRole.set(roleId, (filledByRole.get(roleId) ?? 0) + 1);
  }

  return roleRows.map((r) => rowToRole(r as ProjectRoleRow, filledByRole.get(r.id as string) ?? 0));
}

export async function getProjectRole(id: string): Promise<ProjectRole | null> {
  const { data, error } = await getAdminClient()
    .from("project_roles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { count, error: countErr } = await getAdminClient()
    .from("project_members")
    .select("*", { count: "exact", head: true })
    .eq("role_id", id);
  if (countErr) throw countErr;

  return rowToRole(data as ProjectRoleRow, count ?? 0);
}

export interface CreateProjectRoleInput {
  problemId: string;
  roleName: string;
  skills: string[];
  countNeeded: number;
  description: string;
  commitment: string;
  duration: string;
}

export async function createProjectRole(input: CreateProjectRoleInput): Promise<ProjectRole> {
  const { data, error } = await getAdminClient()
    .from("project_roles")
    .insert({
      problem_id: input.problemId,
      role_name: input.roleName,
      skills: input.skills,
      count_needed: input.countNeeded,
      description: input.description,
      commitment: input.commitment,
      duration: input.duration,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToRole(data as ProjectRoleRow, 0);
}

export async function updateProjectRole(
  id: string,
  patch: {
    roleName?: string;
    skills?: string[];
    countNeeded?: number;
    description?: string;
    commitment?: string;
    duration?: string;
    open?: boolean;
  },
): Promise<ProjectRole | null> {
  const { error } = await getAdminClient()
    .from("project_roles")
    .update({
      ...(patch.roleName !== undefined ? { role_name: patch.roleName } : {}),
      ...(patch.skills !== undefined ? { skills: patch.skills } : {}),
      ...(patch.countNeeded !== undefined ? { count_needed: patch.countNeeded } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.commitment !== undefined ? { commitment: patch.commitment } : {}),
      ...(patch.duration !== undefined ? { duration: patch.duration } : {}),
      ...(patch.open !== undefined ? { open: patch.open } : {}),
    })
    .eq("id", id);
  if (error) throw error;
  return getProjectRole(id);
}

export async function deleteProjectRole(id: string): Promise<void> {
  const { error } = await getAdminClient().from("project_roles").delete().eq("id", id);
  if (error) throw error;
}
