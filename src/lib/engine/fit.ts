import type {
  Appetite,
  Artifact,
  FitBreakdown,
  Mechanic,
  Profile,
  SkillCategory,
  TeamSize,
  TimeBudget,
} from "@/lib/types";
import { SKILL_BY_ID } from "@/lib/catalog/skills";

/** A level-1 skill covers a category only partially; level 3 covers it fully. */
const LEVEL_STRENGTH: Record<number, number> = { 1: 0.45, 2: 0.8, 3: 1 };

export interface CategoryStrength {
  strength: number;
  /** Labels of the skills that produced this strength, best first. */
  via: string[];
}

/** Collapse a person's skill list into per-category strength in 0..1. */
export function categoryStrengths(profile: Profile): Map<SkillCategory, CategoryStrength> {
  const map = new Map<SkillCategory, CategoryStrength>();
  for (const us of profile.skills) {
    const skill = SKILL_BY_ID.get(us.id);
    if (!skill) continue;
    const strength = LEVEL_STRENGTH[us.level] ?? 0.45;
    const current = map.get(skill.category);
    if (!current) {
      map.set(skill.category, { strength, via: [skill.label] });
    } else {
      // A second skill in a category adds a little breadth, capped at 1.
      current.strength = Math.min(1, Math.max(current.strength, strength) + 0.08);
      current.via.push(skill.label);
    }
  }
  return map;
}

/** What appetite means as a target fit score. */
const APPETITE_TARGET: Record<Appetite, number> = {
  comfort: 0.86,
  stretch: 0.68,
  deepend: 0.52,
};

export function appetiteTarget(appetite: Appetite): number {
  return APPETITE_TARGET[appetite];
}

/** Where in your own range of buildable options each appetite aims. */
const APPETITE_PERCENTILE: Record<Appetite, number> = {
  comfort: 0.85,
  stretch: 0.5,
  deepend: 0.2,
};

/**
 * The fit to aim for, as a percentile of what this person can actually reach,
 * rather than an absolute score.
 *
 * The absolutes this replaces (0.86 / 0.68 / 0.52) assumed a range of fits
 * that almost nobody has: real profiles cluster between 0.37 and 0.55, so
 * "comfort" pointed above everything available and landed on whichever single
 * combination happened to sit nearest the number - every time, for everyone
 * with similar skills.
 *
 * @param distinctAscending deduped fit scores, ascending. Deduped because
 *   otherwise a mechanic offering five shipping formats drags the percentile
 *   around purely by having more rows than one offering two.
 */
export function appetiteTargetFrom(
  distinctAscending: number[],
  appetite: Appetite,
  floor = 0,
): number {
  const n = distinctAscending.length;
  if (n === 0) return floor;
  // Below three options a percentile is a coin flip wearing a model's
  // clothes, so just take the end of the range the appetite points at.
  if (n < 3) {
    return Math.max(floor, appetite === "deepend" ? distinctAscending[0] : distinctAscending[n - 1]);
  }
  const index = Math.min(n - 1, Math.floor(APPETITE_PERCENTILE[appetite] * n));
  return Math.max(floor, distinctAscending[index]);
}

const TIME_WEIGHT: Record<TimeBudget, number> = {
  weekend: 1,
  twoweeks: 2,
  semester: 3,
};

const TEAM_CAPACITY: Record<TeamSize, number> = {
  solo: 1,
  pair: 1.6,
  team: 2.4,
};

/** Human-readable effort estimate for this artifact at this person's fit. */
function estimateEffort(
  artifact: Artifact,
  mechanic: Mechanic,
  fit: number,
  profile: Profile,
): string {
  const raw = artifact.weight + mechanic.difficulty + (1 - fit) * 2.5;
  const capacity = TEAM_CAPACITY[profile.teamSize];
  const adjusted = raw / capacity;
  // Raw runs roughly 2 (light artifact, easy crux, perfect fit) to 8.5.
  if (adjusted < 3) return "a focused weekend";
  if (adjusted < 4.2) return "about a week of evenings";
  if (adjusted < 5.4) return "two to three weeks";
  if (adjusted < 6.6) return "roughly a month";
  return "a full term, staged in milestones";
}

export function scoreFit(
  profile: Profile,
  strengths: Map<SkillCategory, CategoryStrength>,
  mechanic: Mechanic,
  artifact: Artifact,
): FitBreakdown {
  const required = Array.from(new Set([...mechanic.requires, ...artifact.requires]));
  const nice = artifact.nice.filter((c) => !required.includes(c));

  const covered: FitBreakdown["covered"] = [];
  const stretch: SkillCategory[] = [];
  const gaps: SkillCategory[] = [];

  let total = 0;
  for (const category of required) {
    const entry = strengths.get(category);
    const strength = entry?.strength ?? 0;
    total += strength;
    if (strength >= 0.75) covered.push({ category, via: entry?.via.slice(0, 3) ?? [] });
    else if (strength > 0) stretch.push(category);
    else gaps.push(category);
  }

  const coverage = required.length ? total / required.length : 0;
  const niceBonus =
    nice.length === 0
      ? 0
      : (nice.reduce((sum, c) => sum + (strengths.get(c)?.strength ?? 0), 0) / nice.length) * 0.12;

  const score = Math.min(1, Math.round((coverage * 0.88 + niceBonus) * 100) / 100);

  // Difficulty is relative to this person, not absolute.
  const rawDifficulty =
    1 +
    (mechanic.difficulty - 1) * 0.85 +
    (artifact.weight - 1) * 0.55 +
    (1 - score) * 2.4 -
    (TIME_WEIGHT[profile.timeBudget] - 1) * 0.25;
  const difficulty = Math.max(1, Math.min(5, Math.round(rawDifficulty)));

  return {
    score,
    covered,
    stretch,
    gaps,
    difficulty,
    estimate: estimateEffort(artifact, mechanic, score, profile),
  };
}

/** Skill categories that mean working with physical things. */
const PHYSICAL_CATEGORIES: ReadonlySet<SkillCategory> = new Set<SkillCategory>([
  "hardware",
  "mechanical",
  "electrical",
  "civil",
  "chemical",
  "aerospace",
  "biomedical",
  "environmental",
  "industrial",
]);

/** Does this person list any skill that involves physical things? */
export function hasPhysicalSkills(strengths: Map<SkillCategory, CategoryStrength>): boolean {
  for (const category of strengths.keys()) if (PHYSICAL_CATEGORIES.has(category)) return true;
  return false;
}

/**
 * Would building this mean working with physical things?
 *
 * The doability bar tolerates one missing skill, which is right for "you've
 * never used Postgres" and wrong for "you have never touched a circuit": a
 * software-only profile paired a sensor mechanic with a dashboard, covered the
 * dashboard half, and was handed a hardware project as "doable". A missing
 * physical skill is not a gap you can read your way across, so for someone with
 * no physical skills at all this is a gate, not a score.
 */
export function isPhysicalWork(mechanic: Mechanic, artifact: Artifact): boolean {
  return (
    artifact.kind === "physical" ||
    mechanic.requires.some((c) => PHYSICAL_CATEGORIES.has(c)) ||
    artifact.requires.some((c) => PHYSICAL_CATEGORIES.has(c))
  );
}

/** How far the doability floor has been lowered to find anything at all. */
export interface DoabilityBar {
  minFit: number;
  maxGaps: number;
}

/** The bar we would like to clear: one gap at most, and a real footing. */
export const DEFAULT_BAR: DoabilityBar = { minFit: 0.34, maxGaps: 1 };

/**
 * Doability floor. Below this the person spends the whole project fighting
 * tools rather than the problem — but see `RELAXATIONS` in the generator: a
 * narrow profile gets a lowered bar and an honest caveat, never an empty page.
 */
export function isDoable(fit: FitBreakdown, bar: DoabilityBar = DEFAULT_BAR): boolean {
  return fit.score >= bar.minFit && fit.gaps.length <= bar.maxGaps;
}
