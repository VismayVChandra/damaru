import type { Problem, Profile, SkillCategory } from "@/lib/types";
import { categoryStrengths } from "@/lib/engine/fit";

/**
 * Complement, not ranking.
 *
 * Every problem the generator issues already knows which skill categories the
 * person is missing - `fit.ts` computes it and the card shows one chip. This
 * turns that into the useful question: who in the club covers what you don't,
 * and what do you cover for them.
 *
 * Deliberately absent: any notion of a "strong" or "weak" member overall, any
 * total, any ordering that would read as a leaderboard. The unit is always a
 * pair and always mutual where possible.
 */

/** Level 2+ in a category. Enough to carry that part of a project. */
const STRONG = 0.75;
/** Level 1 or nothing. The person would be learning it from scratch. */
const WEAK = 0.5;

export interface PairCandidate {
  handle: string;
  displayName: string;
  /** Categories you are thin on that they can carry. */
  theyCover: SkillCategory[];
  /** Categories they are thin on that you can carry. */
  youCover: SkillCategory[];
  /** Domains you both said you care about. */
  sharedInterests: string[];
  /** How many problems they are actively building right now. */
  building: number;
  /** True when the cover runs both ways - the pairings worth making. */
  mutual: boolean;
}

export interface PairInput {
  profile: Profile;
  building: number;
}

export function findComplements(me: Profile, others: PairInput[]): PairCandidate[] {
  const mine = categoryStrengths(me);
  const myInterests = new Set(me.interests);

  const candidates: PairCandidate[] = [];

  for (const { profile: them, building } of others) {
    if (them.id === me.id) continue;

    const theirs = categoryStrengths(them);
    const categories = new Set<SkillCategory>([
      ...mine.keys(),
      ...theirs.keys(),
    ]);

    const theyCover: SkillCategory[] = [];
    const youCover: SkillCategory[] = [];

    for (const category of categories) {
      const myStrength = mine.get(category)?.strength ?? 0;
      const theirStrength = theirs.get(category)?.strength ?? 0;

      if (myStrength < WEAK && theirStrength >= STRONG) theyCover.push(category);
      if (theirStrength < WEAK && myStrength >= STRONG) youCover.push(category);
    }

    if (theyCover.length === 0 && youCover.length === 0) continue;

    candidates.push({
      handle: them.handle,
      displayName: them.displayName,
      theyCover,
      youCover,
      sharedInterests: them.interests.filter((i) => myInterests.has(i)),
      building,
      mutual: theyCover.length > 0 && youCover.length > 0,
    });
  }

  // Mutual pairs first - those are the ones where both people gain. Within
  // that, prefer shared interests, since caring about the same domain is what
  // makes a collaboration survive the boring middle.
  return candidates.sort((a, b) => {
    if (a.mutual !== b.mutual) return a.mutual ? -1 : 1;
    if (a.sharedInterests.length !== b.sharedInterests.length) {
      return b.sharedInterests.length - a.sharedInterests.length;
    }
    return b.theyCover.length + b.youCover.length - (a.theyCover.length + a.youCover.length);
  });
}

export interface RecurringGap {
  category: SkillCategory;
  count: number;
  total: number;
}

/**
 * The category that has been the gap most often across someone's problems.
 * A learning signal drawn from what they were actually handed, not a score -
 * returns null until a pattern has appeared more than once.
 */
export function recurringGap(problems: Problem[]): RecurringGap | null {
  if (problems.length < 2) return null;

  const counts = new Map<SkillCategory, number>();
  for (const p of problems) {
    // Count each category once per problem, gaps and stretches together:
    // both mean "you would be learning this here".
    for (const c of new Set([...p.fit.gaps, ...p.fit.stretch])) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }

  let best: RecurringGap | null = null;
  for (const [category, count] of counts) {
    if (count < 2) continue;
    if (!best || count > best.count) best = { category, count, total: problems.length };
  }
  return best;
}
