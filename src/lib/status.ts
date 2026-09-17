import type { BuildLogKind, ProjectStatus } from "@/lib/types";

/**
 * Single source of truth for the project status ladder and the build-log
 * kind vocabulary - shared by server routes, `db.ts`, and client components,
 * so the 7 statuses and 5 log kinds never drift into duplicate copies again.
 */

export const STATUS_FLOW: ProjectStatus[] = [
  "new",
  "idea",
  "prototype",
  "building",
  "beta",
  "shipped",
  "passed",
];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  new: "New",
  idea: "Idea",
  prototype: "Prototype",
  building: "Building",
  beta: "Beta",
  shipped: "Shipped",
  passed: "Passed",
};

/** The one obvious next step along the ladder, where one exists. */
export const NEXT_STATUS: Partial<Record<ProjectStatus, ProjectStatus>> = {
  new: "idea",
  idea: "prototype",
  prototype: "building",
  building: "beta",
  beta: "shipped",
};

export const NEXT_LABEL: Partial<Record<ProjectStatus, string>> = {
  new: "Make it a project",
  idea: "Start a prototype",
  prototype: "Start building",
  building: "Open a beta",
  beta: "Mark as shipped",
};

/** Committed and not finished - what "someone is actually working on this" means. */
export const ACTIVE_STATUSES: ProjectStatus[] = ["prototype", "building", "beta"];
/** Committed at all, finished or not - the feed-worthy set. */
export const COMMITTED_STATUSES: ProjectStatus[] = ["idea", "prototype", "building", "beta", "shipped"];
/** Can still take on a collaborator. */
export const COLLAB_OPEN_STATUSES: ProjectStatus[] = ["idea", "prototype", "building", "beta"];
/** Finished business - staleness and "open to collaborators" are both moot. */
export const SETTLED: ProjectStatus[] = ["shipped", "passed"];

export const BUILD_LOG_KINDS: BuildLogKind[] = [
  "progress",
  "blocked",
  "looking_for_help",
  "milestone",
  "shipped",
];

export const BUILD_LOG_META: Record<BuildLogKind, { icon: string; label: string; tone: string }> = {
  progress: { icon: "🟢", label: "Progress", tone: "good" },
  blocked: { icon: "🔴", label: "Blocked", tone: "ember" },
  looking_for_help: { icon: "🟡", label: "Looking for help", tone: "warn" },
  milestone: { icon: "🎉", label: "Milestone", tone: "cool" },
  shipped: { icon: "🚀", label: "Shipped", tone: "good" },
};
