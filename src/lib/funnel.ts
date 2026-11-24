import { COMMITTED_STATUSES, STALL_DAYS } from "@/lib/status";
import type { BuildLogKind, ProjectStatus } from "@/lib/types";

/**
 * What happens to a problem after it is generated.
 *
 * The club shipped five phases of social features on top of an activity
 * stream nobody could see the supply side of: 70 briefs issued, and no way
 * to answer "how many of those did anyone actually start?" without opening
 * the database by hand. Every number here already existed in `problems` and
 * `progress_entries` - this just asks them the one question that decides
 * whether the product works.
 *
 * Pure, like `activity-feed.ts` and `match.ts`: rows in, numbers out, no
 * client and no I/O, so it can be reasoned about and tested without a
 * database.
 */

// --- Input ----------------------------------------------------------------

export interface FunnelProblem {
  id: string;
  profileId: string;
  status: ProjectStatus;
  createdAt: string;
  statusChangedAt: string | null;
  isFork: boolean;
  domainId: string;
  mechanicId: string;
  artifactId: string;
  /** 0..1, scored against the person it was issued to. */
  fitScore: number;
  /** 1..5, for that same person. */
  difficulty: number;
  /** Free text, e.g. "a full term, staged in milestones". */
  estimate: string;
}

export interface FunnelLog {
  problemId: string;
  createdAt: string;
  kind: BuildLogKind;
}

export interface FunnelMember {
  id: string;
  handle: string;
  createdAt: string;
}

export interface FunnelSources {
  problems: FunnelProblem[];
  logs: FunnelLog[];
  members: FunnelMember[];
}

// --- Output ---------------------------------------------------------------

export interface FunnelStage {
  key: string;
  label: string;
  /** What this stage means, in the UI, so a number is never shown bare. */
  blurb: string;
  count: number;
  /** Share of the stage directly above. Null for the first. */
  ofPrevious: number | null;
  /** Share of everything generated. */
  ofTotal: number;
}

export interface EvidenceOfWork {
  committed: number;
  withLog: number;
  logs: number;
  /** Shipped but never logged anything - finished work with no trail. */
  shippedWithoutLog: number;
  medianLogsPerLogged: number | null;
}

export interface Cohort {
  label: string;
  n: number;
  medianDifficulty: number | null;
  medianFit: number | null;
  /** Estimate string -> count, most common first. */
  estimates: [string, number][];
}

export interface MemberRow {
  handle: string;
  generated: number;
  triaged: number;
  committed: number;
  logged: number;
  shipped: number;
  /** Distinct calendar days on which they generated at least one problem. */
  activeDays: number;
  lastSeen: string | null;
}

export interface Concentration {
  /** [id, count, share] ordered by count desc. */
  top: [string, number, number][];
  distinct: number;
  /** Share held by the single most common value. */
  leaderShare: number;
}

export interface FunnelReport {
  generatedTotal: number;
  stages: FunnelStage[];
  evidence: EvidenceOfWork;
  shipped: Cohort;
  stalled: Cohort;
  /** Effort estimate mix across everything issued - the "are briefs too big"
   *  question, answerable without any outcome data at all. */
  estimateMix: [string, number][];
  members: MemberRow[];
  returnRate: { generatedAtAll: number; onMoreThanOneDay: number };
  concentration: { artifacts: Concentration; mechanics: Concentration; domains: Concentration };
  forks: number;
  generationsByDay: [string, number][];
  /** Days with no activity at the end of the window - a quiet club is the
   *  single most important thing not to round away. */
  daysSinceLastGeneration: number | null;
  daysSinceLastLog: number | null;
}

// --- Helpers --------------------------------------------------------------

const DAY_MS = 86_400_000;
const day = (iso: string) => iso.slice(0, 10);

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function tally<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function ranked(m: Map<string, number>): [string, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function concentrationOf(counts: Map<string, number>, total: number, topN = 6): Concentration {
  const order = ranked(counts);
  return {
    top: order.slice(0, topN).map(([id, n]) => [id, n, total ? n / total : 0]),
    distinct: order.length,
    leaderShare: total && order.length ? order[0][1] / total : 0,
  };
}

// "Stalled" (STALL_DAYS, in status.ts) is deliberately generous: committed,
// not shipped, and nothing has happened on it for three weeks. A student
// project with no movement for three weeks over a term is not resting, and
// calling it active would be the flattering read rather than the true one.
// The build-log nudge reads the same constant, so the page measuring stalling
// and the prompt reacting to it cannot disagree about what it means.

// --- The report -----------------------------------------------------------

export function buildFunnel(sources: FunnelSources, now = new Date()): FunnelReport {
  const { problems, logs, members } = sources;
  const total = problems.length;

  const logsByProblem = new Map<string, FunnelLog[]>();
  for (const l of logs) {
    const arr = logsByProblem.get(l.problemId);
    if (arr) arr.push(l);
    else logsByProblem.set(l.problemId, [l]);
  }
  const hasLog = (p: FunnelProblem) => (logsByProblem.get(p.id)?.length ?? 0) > 0;

  const committedSet = new Set<ProjectStatus>(COMMITTED_STATUSES);
  const triaged = problems.filter((p) => p.status !== "new");
  const committed = problems.filter((p) => committedSet.has(p.status));
  const shippedP = problems.filter((p) => p.status === "shipped");

  // Each stage is a strict subset of the one above it, so the funnel can
  // never read as more than 100% - "shipped" is checked against `committed`,
  // not against the build log, because a project can be marked shipped
  // without one. That gap is surfaced in `evidence` instead of being quietly
  // folded into the ladder.
  const mk = (
    key: string,
    label: string,
    blurb: string,
    count: number,
    prev: number | null,
  ): FunnelStage => ({
    key,
    label,
    blurb,
    count,
    ofPrevious: prev === null ? null : prev ? count / prev : 0,
    ofTotal: total ? count / total : 0,
  });

  const stages: FunnelStage[] = [
    mk("generated", "Generated", "Briefs the engine issued.", total, null),
    mk("triaged", "Triaged", "Someone made a call: saved or passed.", triaged.length, total),
    mk(
      "committed",
      "Committed",
      "Kept as a project rather than passed on.",
      committed.length,
      triaged.length,
    ),
    mk("shipped", "Shipped", "Finished and marked done.", shippedP.length, committed.length),
  ];

  // --- Evidence of work ---------------------------------------------------
  const committedWithLog = committed.filter(hasLog);
  const evidence: EvidenceOfWork = {
    committed: committed.length,
    withLog: committedWithLog.length,
    logs: logs.length,
    shippedWithoutLog: shippedP.filter((p) => !hasLog(p)).length,
    medianLogsPerLogged: median(
      committedWithLog.map((p) => logsByProblem.get(p.id)?.length ?? 0),
    ),
  };

  // --- Who finishes vs who stalls -----------------------------------------
  const lastTouch = (p: FunnelProblem) => {
    const ls = logsByProblem.get(p.id) ?? [];
    const times = [p.createdAt, p.statusChangedAt, ...ls.map((l) => l.createdAt)].filter(
      (t): t is string => Boolean(t),
    );
    return times.sort().at(-1) ?? p.createdAt;
  };
  const stalledP = committed.filter(
    (p) =>
      p.status !== "shipped" &&
      (now.getTime() - new Date(lastTouch(p)).getTime()) / DAY_MS > STALL_DAYS,
  );

  const cohort = (label: string, ps: FunnelProblem[]): Cohort => ({
    label,
    n: ps.length,
    medianDifficulty: median(ps.map((p) => p.difficulty)),
    medianFit: median(ps.map((p) => p.fitScore)),
    estimates: ranked(tally(ps, (p) => p.estimate)).slice(0, 4),
  });

  // --- Per member ----------------------------------------------------------
  const memberRows: MemberRow[] = members
    .map((m) => {
      const mine = problems.filter((p) => p.profileId === m.id);
      const mineCommitted = mine.filter((p) => committedSet.has(p.status));
      const days = new Set(mine.map((p) => day(p.createdAt)));
      const touches = mine.map(lastTouch).sort();
      return {
        handle: m.handle,
        generated: mine.length,
        triaged: mine.filter((p) => p.status !== "new").length,
        committed: mineCommitted.length,
        logged: mineCommitted.filter(hasLog).length,
        shipped: mine.filter((p) => p.status === "shipped").length,
        activeDays: days.size,
        lastSeen: touches.at(-1) ?? null,
      };
    })
    .sort((a, b) => b.generated - a.generated || a.handle.localeCompare(b.handle));

  const generators = memberRows.filter((m) => m.generated > 0);

  // --- Catalogue concentration, as actually issued -------------------------
  // The audit script simulates draws; this measures the ones real people got.
  const concentration = {
    artifacts: concentrationOf(tally(problems, (p) => p.artifactId), total),
    mechanics: concentrationOf(tally(problems, (p) => p.mechanicId), total),
    domains: concentrationOf(tally(problems, (p) => p.domainId), total),
  };

  const byDay = ranked(tally(problems, (p) => day(p.createdAt)))
    .sort((a, b) => a[0].localeCompare(b[0]));

  const sinceDays = (iso: string | undefined) =>
    iso === undefined ? null : Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);

  return {
    generatedTotal: total,
    stages,
    evidence,
    shipped: cohort("Shipped", shippedP),
    stalled: cohort(`Stalled (${STALL_DAYS}d+ untouched)`, stalledP),
    estimateMix: ranked(tally(problems, (p) => p.estimate)),
    members: memberRows,
    returnRate: {
      generatedAtAll: generators.length,
      onMoreThanOneDay: generators.filter((m) => m.activeDays > 1).length,
    },
    concentration,
    forks: problems.filter((p) => p.isFork).length,
    generationsByDay: byDay,
    daysSinceLastGeneration: sinceDays(
      problems.map((p) => p.createdAt).sort().at(-1),
    ),
    daysSinceLastLog: sinceDays(logs.map((l) => l.createdAt).sort().at(-1)),
  };
}
