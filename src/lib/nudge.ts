import { COMMITTED_STATUSES, QUIET_DAYS, STALL_DAYS } from "@/lib/status";
import type { Problem, ProjectStatus } from "@/lib/types";

/**
 * Who should be asked "what moved?", and what to ask them.
 *
 * Measured, not assumed: 15 projects had been committed to and none had ever
 * written a single build-log line. The club feed, Project Radar and the
 * weekly digest are all built on that table, so they were unsupplied rather
 * than underperforming. The write path already existed and was easy enough -
 * what was missing was anyone asking.
 *
 * Pure, like `funnel.ts` and `match.ts`: projects in, one decision out.
 *
 * One nudge, never a list. A pile of overdue projects reads as a to-do list
 * with a guilt column, and the way to lose someone is to make opening the
 * app feel like opening an inbox.
 */

export type NudgeReason =
  /** Committed a couple of days ago and nothing logged yet. */
  | "first"
  /** Has a log, but not lately. */
  | "quiet"
  /** Nothing at all for STALL_DAYS - a different question, and an honest exit. */
  | "stalled";

export interface Nudge {
  problemId: string;
  title: string;
  status: ProjectStatus;
  reason: NudgeReason;
  /** Whole days since committing (`first`) or since the last sign of life. */
  days: number;
  /**
   * True when `days` was worked out from the creation date alone - a project
   * kept before `status_changed_at` existed, with nothing logged since. Then
   * the number is only an upper bound: someone who generated a brief in
   * September and kept it last week would read "80 days", and telling them
   * "nothing on this for 80 days" would be false. The copy leaves the number
   * out rather than assert something the data cannot support.
   */
  approximate: boolean;
  /** The brief's own answer to "where do I begin" - offered, never imposed. */
  startingAngle: string;
}

/**
 * Give someone time to actually start before asking whether they have. The
 * first line is the most valuable one anyone ever writes - it is the
 * difference between a project and a saved brief - but a prompt the morning
 * after saving it is just noise.
 */
export const FIRST_LOG_AFTER_DAYS = 2;

/** "Not now" quiets the whole nudge, not one project, for this long. */
export const SNOOZE_DAYS = 3;

/**
 * A cookie rather than localStorage, deliberately. Home is rendered on the
 * server, and the server has to know about a snooze to leave the card out of
 * the HTML - otherwise it renders for everyone and then vanishes for anyone
 * who snoozed it, which is a layout jump on the one element meant to be
 * calm. It holds a timestamp and nothing personal.
 */
export const NUDGE_SNOOZE_COOKIE = "damaru_nudge_until";

const DAY_MS = 86_400_000;

/** Statuses where "someone is working on this" is still a live claim. */
const OPEN = new Set<ProjectStatus>(COMMITTED_STATUSES.filter((s) => s !== "shipped"));

/** What to ask first when several qualify: the ones still within reach. */
const PRIORITY: Record<NudgeReason, number> = { first: 0, quiet: 1, stalled: 2 };

export function isSnoozed(raw: string | null | undefined, now = new Date()): boolean {
  const until = Number(raw);
  return Number.isFinite(until) && until > now.getTime();
}

const ms = (iso: string) => new Date(iso).getTime();

/**
 * The single best thing to ask this person about, or null.
 *
 * Takes any list of problems and filters to the viewer's own, so a caller
 * holding the whole club's feed cannot nudge someone about a project that
 * isn't theirs. Team members are not nudged - the owner is accountable for a
 * project's log, and asking everyone on a team about the same project would
 * turn one prompt into several.
 */
export function pickNudge(
  problems: Pick<
    Problem,
    "id" | "profileId" | "title" | "status" | "createdAt" | "statusChangedAt" | "progress" | "startingAngle"
  >[],
  viewerId: string,
  now = new Date(),
): Nudge | null {
  const candidates: Nudge[] = [];

  for (const p of problems) {
    if (p.profileId !== viewerId || !OPEN.has(p.status)) continue;

    const logs = p.progress ?? [];
    // `statusChangedAt` is null on anything committed before that column
    // existed. Falling back to creation is the conservative read: it can only
    // make a project look older than it is, never newer.
    const committedAt = p.statusChangedAt ? ms(p.statusChangedAt) : ms(p.createdAt);
    const lastTouch = Math.max(ms(p.createdAt), committedAt, ...logs.map((l) => ms(l.createdAt)));

    const idle = Math.floor((now.getTime() - lastTouch) / DAY_MS);
    const sinceCommit = Math.floor((now.getTime() - committedAt) / DAY_MS);

    let reason: NudgeReason;
    let days: number;
    if (idle >= STALL_DAYS) {
      // Checked first: asking "what's the first thing you did?" about a brief
      // kept six weeks ago is the wrong question. Ask whether it is still on.
      reason = "stalled";
      days = idle;
    } else if (logs.length === 0) {
      if (sinceCommit < FIRST_LOG_AFTER_DAYS) continue;
      reason = "first";
      days = sinceCommit;
    } else if (idle >= QUIET_DAYS) {
      reason = "quiet";
      days = idle;
    } else {
      continue;
    }

    candidates.push({
      problemId: p.id,
      title: p.title,
      status: p.status,
      reason,
      days,
      // Both clocks unknown: no recorded status move and no log to anchor on.
      approximate: !p.statusChangedAt && logs.length === 0,
      startingAngle: p.startingAngle,
    });
  }

  // Within a tier, the most recent first - the one that is easiest to pick
  // back up - with the id as a final tiebreak so the choice is reproducible.
  candidates.sort(
    (a, b) =>
      PRIORITY[a.reason] - PRIORITY[b.reason] ||
      a.days - b.days ||
      a.problemId.localeCompare(b.problemId),
  );
  return candidates[0] ?? null;
}
