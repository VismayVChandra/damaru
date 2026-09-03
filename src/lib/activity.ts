import type { Checklist, Problem } from "@/lib/types";

/** Statuses that represent finished business - staleness is meaningless for these. */
const SETTLED: Problem["status"][] = ["shipped", "passed"];

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

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
