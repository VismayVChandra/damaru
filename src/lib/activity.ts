import type { Checklist, Problem } from "@/lib/types";
import { SETTLED } from "@/lib/status";

/** Most recent sign of life: a progress entry if there is one, else issue date. */
export function lastActivityAt(problem: Problem): string {
  const latest = problem.progress?.[0]?.createdAt;
  return latest && latest > problem.createdAt ? latest : problem.createdAt;
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * How long a live problem has gone without movement. Returns null once
 * something is settled, or while it is still recent - the point is to make
 * stalling visible, not to nag about a problem issued on Tuesday.
 */
export function idleDays(problem: Problem): number | null {
  if (SETTLED.includes(problem.status)) return null;
  const days = daysSince(lastActivityAt(problem));
  return days >= 7 ? days : null;
}

export function checklistKeys(problem: Problem): string[] {
  return [
    ...problem.requirements.map((_, i) => `req:${i}`),
    ...problem.successCriteria.map((_, i) => `success:${i}`),
  ];
}

export interface ChecklistProgress {
  done: number;
  total: number;
  /** 0..1 */
  ratio: number;
}

export function checklistProgress(problem: Problem, override?: Checklist): ChecklistProgress {
  const state = override ?? problem.checklist ?? {};
  const keys = checklistKeys(problem);
  const done = keys.filter((k) => state[k]).length;
  return { done, total: keys.length, ratio: keys.length ? done / keys.length : 0 };
}

/**
 * Elapsed time the way someone would say it out loud. Floors rather than
 * rounds - 23.6 hours old is "23h ago", not the "24h ago" that reads as a day.
 * Past about a month it gives an actual date: "184d ago" is a number nobody
 * converts, and a build log is not an analytics dashboard.
 */
export function timeAgo(iso: string): string {
  const then = new Date(iso);
  const seconds = Math.max(0, (Date.now() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";

  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.max(1, Math.floor(minutes))}m ago`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.max(1, Math.floor(hours))}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;

  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Best-effort cover for a project: the newest build-log entry carrying an
 * image. There is no dedicated cover column, and `progress` already arrives
 * newest-first. Shared so the gallery and the feed can't drift apart. */
export function coverImage(problem: Problem): string | null {
  return (problem.progress ?? []).find((e) => e.imageUrl)?.imageUrl ?? null;
}
