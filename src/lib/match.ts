import { ARTIFACT_BY_ID, MECHANIC_BY_ID } from "@/lib/catalog/blocks";
import { SKILLS } from "@/lib/catalog/skills";
import { categoryStrengths, isDoable, scoreFit } from "@/lib/engine/fit";
import { COLLAB_OPEN_STATUSES } from "@/lib/status";
import type { ProjectSignals } from "@/lib/db";
import type { FitBreakdown, Problem, Profile, SkillCategory } from "@/lib/types";

/**
 * "Projects you might want in on", scored against whoever is looking.
 *
 * Deterministic and local - the same catalogue lookup plus scoreFit the fork
 * route already does. No model, no API call, no randomness.
 */

export interface MatchedProject {
  problem: Problem & { handle: string };
  /** Scored for this viewer. The stored problem.fit was scored against the
   * owner at generation time and means nothing to anyone else. */
  viewerFit: FitBreakdown;
  tier: "needs_you" | "your_domain" | "doable";
  reasons: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Every way a skill might be written - id, label, alias - pointing at its
 * category. Roles carry free text ("Figma, Design systems"), so matching one
 * is a lexical lookup, not a set membership test. */
const CATEGORY_BY_TERM = new Map<string, SkillCategory>();
for (const skill of SKILLS) {
  CATEGORY_BY_TERM.set(norm(skill.id), skill.category);
  CATEGORY_BY_TERM.set(norm(skill.label), skill.category);
  for (const alias of skill.aliases ?? []) CATEGORY_BY_TERM.set(norm(alias), skill.category);
}

/** Which of a role's stated skills this person actually has. Text that doesn't
 * resolve to anything in the catalogue simply doesn't match - it never
 * produces a false positive. */
function matchedRoleSkills(roleSkills: string[], mine: Set<SkillCategory>): string[] {
  const hits: string[] = [];
  for (const raw of roleSkills) {
    const category = CATEGORY_BY_TERM.get(norm(raw));
    if (category && mine.has(category) && !hits.includes(raw)) hits.push(raw);
  }
  return hits;
}

export function rankMatches(
  viewer: Profile,
  feed: (Problem & { handle: string })[],
  signals: Map<string, ProjectSignals>,
  memberOf: Set<string>,
): MatchedProject[] {
  const strengths = categoryStrengths(viewer);
  const myCategories = new Set<SkillCategory>(
    [...strengths.entries()].filter(([, s]) => s.strength > 0).map(([c]) => c),
  );
  const interests = new Set(viewer.interests);
  const out: MatchedProject[] = [];

  for (const problem of feed) {
    if (problem.profileId === viewer.id) continue; // already yours
    if (memberOf.has(problem.id)) continue; // already on it
    if (!COLLAB_OPEN_STATUSES.includes(problem.status)) continue;

    const mechanic = MECHANIC_BY_ID.get(problem.dna.mechanicId);
    const artifact = ARTIFACT_BY_ID.get(problem.dna.artifactId);
    if (!mechanic || !artifact) continue; // a retired catalogue block

    const viewerFit = scoreFit(viewer, strengths, mechanic, artifact);
    const signal = signals.get(problem.id);
    const roleHits = signal ? matchedRoleSkills(signal.roleSkills, myCategories) : [];
    const reasons: string[] = [];

    let tier: MatchedProject["tier"];
    if (signal && signal.openRoles > 0 && roleHits.length > 0) {
      tier = "needs_you";
      reasons.push(`needs ${roleHits[0]} — you have it`);
    } else if (interests.has(problem.dna.domainId)) {
      tier = "your_domain";
      reasons.push(`${problem.domainLabel.toLowerCase()}, one of yours`);
    } else if (isDoable(viewerFit)) {
      tier = "doable";
      reasons.push("well inside what you can build");
    } else {
      continue;
    }

    if (signal && signal.openRoles > 0 && tier !== "needs_you") {
      reasons.push(`${signal.openRoles} open ${signal.openRoles === 1 ? "role" : "roles"}`);
    }
    out.push({ problem, viewerFit, tier, reasons });
  }

  // Binary tiers with a tiebreak cascade rather than one blended score - the
  // same reasoning pairing.ts gives for complements over rankings.
  const rank = { needs_you: 0, your_domain: 1, doable: 2 };
  return out.sort((a, b) => {
    if (a.tier !== b.tier) return rank[a.tier] - rank[b.tier];
    if (a.viewerFit.score !== b.viewerFit.score) return b.viewerFit.score - a.viewerFit.score;
    const aAt = signals.get(a.problem.id)?.lastActivityAt ?? a.problem.createdAt;
    const bAt = signals.get(b.problem.id)?.lastActivityAt ?? b.problem.createdAt;
    if (aAt !== bAt) return bAt.localeCompare(aAt);
    return a.problem.id.localeCompare(b.problem.id);
  });
}
