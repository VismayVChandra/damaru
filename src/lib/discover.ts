import type { Problem, SkillCategory } from "@/lib/types";
import { MECHANIC_BY_ID, ARTIFACT_BY_ID } from "@/lib/catalog/blocks";
import { lastActivityAt } from "@/lib/activity";

/**
 * What this project actually needs - from its mechanic + artifact `requires`,
 * NOT `problem.fit.covered/gaps` (those are relative to whoever it was
 * issued to, which would make Discover's filter wrong for anyone else).
 */
export function problemSkillCategories(problem: Problem): SkillCategory[] {
  const mechanic = MECHANIC_BY_ID.get(problem.dna.mechanicId);
  const artifact = ARTIFACT_BY_ID.get(problem.dna.artifactId);
  return [...new Set([...(mechanic?.requires ?? []), ...(artifact?.requires ?? [])])];
}

export interface RadarItem extends Problem {
  handle: string;
  buildLog7: number;
  likes7: number;
  comments7: number;
  tier: "moving" | "noticed";
}

/**
 * Binary tiers, not a blended score - same spirit as pairing.ts's
 * "complement, not ranking": a build-log entry this week (real movement)
 * always outranks likes/comments alone (people noticing). Count is only ever
 * a same-tier tiebreak, never the primary order.
 */
export function rankRadar(
  feed: (Problem & { handle: string })[],
  recentCounts: Map<string, { likes: number; comments: number }>,
  sinceISO: string,
): RadarItem[] {
  const items: RadarItem[] = [];
  for (const p of feed) {
    const buildLog7 = (p.progress ?? []).filter((e) => e.createdAt >= sinceISO).length;
    const { likes = 0, comments = 0 } = recentCounts.get(p.id) ?? {};
    if (buildLog7 === 0 && likes === 0 && comments === 0) continue;
    items.push({
      ...p,
      buildLog7,
      likes7: likes,
      comments7: comments,
      tier: buildLog7 > 0 ? "moving" : "noticed",
    });
  }
  return items.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === "moving" ? -1 : 1;
    const aScore = a.buildLog7 * 2 + a.likes7 + a.comments7;
    const bScore = b.buildLog7 * 2 + b.likes7 + b.comments7;
    if (aScore !== bScore) return bScore - aScore;
    return lastActivityAt(b).localeCompare(lastActivityAt(a));
  });
}
