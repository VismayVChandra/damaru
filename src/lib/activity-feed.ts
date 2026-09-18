import type { ActivityProject, ActivitySources } from "@/lib/db";
import type { BuildLogKind, Problem } from "@/lib/types";

/**
 * The club's activity stream, merged out of records that already exist -
 * projects, build logs, roles, team joins - rather than a parallel event log.
 *
 * Likes and comments are deliberately absent. "Meaningful progress outranks
 * popularity" is easiest to guarantee by never putting popularity in the
 * ranking at all; engagement shows up as a demoted count on a card instead.
 */

export type ActivityKind =
  | "started"
  | "forked"
  | "build_log"
  | "status_moved"
  | "shipped"
  | "role_opened"
  | "joined";

interface ActivityBase {
  /** `${kind}:${sourceRowId}` - collision-proof across five source tables. */
  id: string;
  /** The one field everything sorts on. */
  at: string;
  actor: { handle: string };
  /**
   * False when the actor is inferred rather than recorded: build-log entries
   * written before authorship was tracked fall back to the project's owner.
   * Renderers phrase those around the project rather than the person.
   */
  actorIsExact: boolean;
  project: ActivityProject;
}

export type ActivityItem =
  | (ActivityBase & { kind: "started" })
  | (ActivityBase & { kind: "forked"; sourceTitle: string | null; sourceId: string | null })
  | (ActivityBase & {
      kind: "build_log";
      logKind: BuildLogKind;
      body: string;
      linkUrl: string | null;
    })
  | (ActivityBase & { kind: "status_moved"; status: Problem["status"] })
  | (ActivityBase & { kind: "shipped" })
  | (ActivityBase & { kind: "role_opened"; roleName: string })
  | (ActivityBase & { kind: "joined"; roleName: string });

/** Dot colour per kind, matching the five tones BUILD_LOG_META already uses so
 * a build-log line reads the same on Home as on a project page. */
export const ACTIVITY_TONE: Record<ActivityKind, string> = {
  started: "cool",
  forked: "cool",
  build_log: "good", // overridden per logKind by the renderer
  status_moved: "warn",
  shipped: "good",
  role_opened: "warn",
  joined: "good",
};

export interface FeedOptions {
  /** Cap per project so one prolific logger can't own the page. */
  perProjectCap?: number;
  limit?: number;
}

/** A transition this close to creation is the same act - generating a problem
 * and keeping it is one event, not two. */
const BIRTH_WINDOW_MS = 60_000;
/** A "shipped" build log this close to the status move is the same act. */
const SHIP_COLLAPSE_MS = 10 * 60_000;

export function buildActivityFeed(sources: ActivitySources, opts: FeedOptions = {}): ActivityItem[] {
  const perProjectCap = opts.perProjectCap ?? 3;
  const limit = opts.limit ?? 25;
  const { projects } = sources;
  const items: ActivityItem[] = [];

  for (const project of projects.values()) {
    // A fork is not also a start - it says something more specific.
    if (project.inspiredByProblemId) {
      const source = projects.get(project.inspiredByProblemId);
      items.push({
        kind: "forked",
        id: `forked:${project.id}`,
        at: project.createdAt,
        actor: { handle: project.ownerHandle },
        actorIsExact: true,
        project,
        // The source may be gone - 010's FK is `on delete set null`.
        sourceId: source?.id ?? null,
        sourceTitle: source?.title ?? null,
      });
    } else {
      items.push({
        kind: "started",
        id: `started:${project.id}`,
        at: project.createdAt,
        actor: { handle: project.ownerHandle },
        actorIsExact: true,
        project,
      });
    }

    if (project.statusChangedAt) {
      const moved = new Date(project.statusChangedAt).getTime();
      const born = new Date(project.createdAt).getTime();
      if (moved - born > BIRTH_WINDOW_MS) {
        items.push({
          kind: project.status === "shipped" ? "shipped" : "status_moved",
          id: `status:${project.id}`,
          at: project.statusChangedAt,
          actor: { handle: project.ownerHandle },
          actorIsExact: true,
          project,
          status: project.status,
        } as ActivityItem);
      }
    }
  }

  for (const entry of sources.progress) {
    const project = projects.get(entry.problemId);
    if (!project) continue; // a draw that was never kept, or a deleted project
    items.push({
      kind: "build_log",
      id: `build_log:${entry.id}`,
      at: entry.createdAt,
      actor: { handle: entry.authorHandle ?? project.ownerHandle },
      actorIsExact: Boolean(entry.authorHandle),
      project,
      logKind: entry.kind,
      body: entry.body,
      linkUrl: entry.linkUrl,
    });
  }

  for (const role of sources.roles) {
    const project = projects.get(role.problemId);
    if (!project) continue;
    items.push({
      kind: "role_opened",
      id: `role_opened:${role.id}`,
      at: role.createdAt,
      actor: { handle: project.ownerHandle },
      actorIsExact: true,
      project,
      roleName: role.roleName,
    });
  }

  for (const join of sources.joins) {
    const project = projects.get(join.problemId);
    if (!project) continue;
    items.push({
      kind: "joined",
      id: `joined:${join.problemId}:${join.profileId}`,
      at: join.joinedAt,
      actor: { handle: join.handle },
      actorIsExact: true,
      project,
      roleName: join.roleName,
    });
  }

  // Shipping usually produces both a status move and a build log saying so.
  // Keep the log - it has a human sentence in it - and drop the bare move.
  const shippedLogTimes = new Map<string, number>();
  for (const item of items) {
    if (item.kind === "build_log" && item.logKind === "shipped") {
      shippedLogTimes.set(item.project.id, new Date(item.at).getTime());
    }
  }
  const merged = items.filter((item) => {
    if (item.kind !== "shipped") return true;
    const logAt = shippedLogTimes.get(item.project.id);
    return logAt === undefined || Math.abs(new Date(item.at).getTime() - logAt) > SHIP_COLLAPSE_MS;
  });

  // Tie-break on id so the order is total and reproducible across runs.
  merged.sort((a, b) => (a.at === b.at ? a.id.localeCompare(b.id) : b.at.localeCompare(a.at)));

  const perProject = new Map<string, number>();
  const capped: ActivityItem[] = [];
  for (const item of merged) {
    const seen = perProject.get(item.project.id) ?? 0;
    if (seen >= perProjectCap) continue;
    perProject.set(item.project.id, seen + 1);
    capped.push(item);
    if (capped.length >= limit) break;
  }
  return capped;
}

/** The same stream, narrowed to a person's network. Not a second query - the
 * club-wide fetch already contains everything the follow graph could show. */
export function filterByFollowing(items: ActivityItem[], followingIds: Set<string>): ActivityItem[] {
  return items.filter((i) => followingIds.has(i.project.ownerProfileId));
}
