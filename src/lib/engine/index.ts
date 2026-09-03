import type { Artifact, Friction, Mechanic, Problem, ProblemDNA, Profile } from "@/lib/types";
import { DOMAINS, DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { ARTIFACT_BY_ID, MECHANICS, MECHANIC_BY_ID, TWISTS } from "@/lib/catalog/blocks";
import { appetiteTarget, categoryStrengths, isDoable, scoreFit } from "./fit";
import type { DoabilityBar } from "./fit";
import { compose } from "./compose";
import { fingerprint, pick, seededRandom } from "./novelty";

export type GeneratedProblem = Omit<
  Problem,
  "id" | "status" | "notes" | "checklist" | "progress" | "createdAt"
>;

/**
 * The friction catalogue, grouped by domain. Passed in rather than loaded
 * here: frictions now live in Postgres, and keeping the engine a pure
 * function of (profile, catalogue) leaves it synchronous and testable.
 */
export type FrictionIndex = Map<string, Friction[]>;

export function indexFrictions(frictions: { domainId: string }[]): FrictionIndex {
  const index: FrictionIndex = new Map();
  for (const f of frictions as (Friction & { domainId: string })[]) {
    const list = index.get(f.domainId);
    if (list) list.push(f);
    else index.set(f.domainId, [f]);
  }
  return index;
}

export interface GenerateOptions {
  /** The accepted friction catalogue, grouped by domain. */
  frictions: FrictionIndex;
  count?: number;
  /** Fingerprints already handed out to anyone, globally. */
  excludeFingerprints?: Set<string>;
  /** Varying this produces a different draw for the same profile. */
  seed?: string;
}

interface Combo {
  mechanic: Mechanic;
  artifact: Artifact;
  score: number;
}

const TIME_TARGET_WEIGHT: Record<Profile["timeBudget"], number> = {
  weekend: 1,
  twoweeks: 2,
  semester: 3,
};

/**
 * Rank the (mechanic x artifact) pairs this person could actually build,
 * grouped by mechanic so a friction can look up its own options. Only pairs the
 * mechanic declares as sensible shipping formats are considered.
 */
function rankCombosByMechanic(profile: Profile, bar: DoabilityBar): Map<string, Combo[]> {
  const strengths = categoryStrengths(profile);
  const target = appetiteTarget(profile.appetite);
  const prefs = new Set(profile.artifactPrefs);
  const timeTarget = TIME_TARGET_WEIGHT[profile.timeBudget];

  const byMechanic = new Map<string, Combo[]>();

  for (const mechanic of MECHANICS) {
    const combos: Combo[] = [];
    for (const artifactId of mechanic.artifacts) {
      const artifact = ARTIFACT_BY_ID.get(artifactId);
      if (!artifact) continue;

      const fit = scoreFit(profile, strengths, mechanic, artifact);
      if (!isDoable(fit, bar)) continue;

      // Closeness to the appetite they asked for dominates.
      let score = 1 - Math.abs(fit.score - target);
      // Respect a stated preference for what they want to build.
      if (prefs.size > 0 && prefs.has(artifact.id)) score += 0.35;
      // Nudge toward things that fit the time they actually have.
      score -= Math.abs(artifact.weight - timeTarget) * 0.06;

      combos.push({ mechanic, artifact, score });
    }
    if (combos.length > 0) {
      combos.sort((a, b) => b.score - a.score);
      byMechanic.set(mechanic.id, combos);
    }
  }

  return byMechanic;
}

/**
 * Interests the person chose, falling back to the whole catalogue - minus any
 * domain that currently has no accepted frictions, which would otherwise be a
 * dead end the sampler keeps rediscovering.
 */
function candidateDomains(profile: Profile, frictions: FrictionIndex) {
  const stocked = (d: { id: string }) => (frictions.get(d.id)?.length ?? 0) > 0;
  const chosen = profile.interests
    .map((id) => DOMAIN_BY_ID.get(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .filter(stocked);
  return chosen.length > 0 ? chosen : DOMAINS.filter(stocked);
}

/** Bias a pick toward the front of a sorted list without ever locking onto it. */
function biasedIndex(rng: () => number, length: number): number {
  return Math.floor(Math.pow(rng(), 1.6) * length) % length;
}

/**
 * The single seam an LLM would slot into. Everything downstream consumes
 * `GeneratedProblem[]`, so swapping this implementation is a one-file change.
 */
/**
 * Progressive relaxations. A narrow profile - say four hardware skills and two
 * software-shaped interests - can have an empty intersection between "mechanics
 * these frictions allow" and "mechanics this person can build". Rather than
 * return nothing, lower the bar a step at a time and say so on the card.
 */
interface Relaxation {
  bar: DoabilityBar;
  allDomains: boolean;
  caveat?: string;
}

const RELAXATIONS: Relaxation[] = [
  { bar: { minFit: 0.34, maxGaps: 1 }, allDomains: false },
  {
    bar: { minFit: 0.24, maxGaps: 2 },
    allDomains: false,
    caveat:
      "Bigger stretch than you asked for. Your skills and your interests do not overlap much yet, so this reaches further outside what you know than the usual bar allows.",
  },
  {
    bar: { minFit: 0.34, maxGaps: 1 },
    allDomains: true,
    caveat:
      "Outside the interests you picked. Nothing in your chosen domains was buildable with your current skills, so this comes from a domain that fits them better.",
  },
  {
    bar: { minFit: 0.12, maxGaps: 3 },
    allDomains: true,
    caveat:
      "Well outside both your interests and your current skills. This is the closest the catalogue can get - treat it as a direction, not an assignment.",
  },
];

export function generateProblems(profile: Profile, opts: GenerateOptions): GeneratedProblem[] {
  const frictions = opts.frictions;
  const count = opts.count ?? 3;
  const excluded = opts.excludeFingerprints ?? new Set<string>();
  const rng = seededRandom(opts.seed ?? `${profile.id}:${Date.now()}`);
  const strengths = categoryStrengths(profile);

  const results: GeneratedProblem[] = [];
  const usedDomains = new Set<string>();
  const usedMechanics = new Set<string>();
  const usedArtifacts = new Set<string>();
  const usedFrictions = new Set<string>();
  const usedFingerprints = new Set<string>();

  /** One pass at a given relaxation, appending whatever it can find. */
  function draw(relax: Relaxation): void {
    const byMechanic = rankCombosByMechanic(profile, relax.bar);
    if (byMechanic.size === 0) return;

    const stocked = (d: { id: string }) => (frictions.get(d.id)?.length ?? 0) > 0;
    const domains = relax.allDomains
      ? DOMAINS.filter(stocked)
      : candidateDomains(profile, frictions);
    if (domains.length === 0) return;

    const MAX_ATTEMPTS = 1200;
    let attempts = 0;

    while (results.length < count && attempts < MAX_ATTEMPTS) {
      attempts++;
      const strict = attempts < MAX_ATTEMPTS * 0.55;

      // Spread a batch across the person's interests where possible.
      const freshDomains = domains.filter((d) => !usedDomains.has(d.id));
      const domain = pick(rng, freshDomains.length > 0 ? freshDomains : domains);

      const pool = frictions.get(domain.id);
      if (!pool || pool.length === 0) continue;
      const friction: Friction = pick(rng, pool);
      const frictionKey = `${domain.id}:${friction.text}`;
      if (usedFrictions.has(frictionKey)) continue;

      // Only mechanics this friction could plausibly be answered by, and only
      // those the person can actually build at this bar.
      const options = friction.mechanics
        .map((id) => byMechanic.get(id))
        .filter((c): c is Combo[] => Boolean(c) && c!.length > 0)
        // Best-fitting mechanic first, so the biased pick below actually
        // favours a good match rather than whatever the friction listed first.
        .sort((a, b) => b[0].score - a[0].score);
      if (options.length === 0) continue;

      const mechanicCombos = options[biasedIndex(rng, options.length)];
      const combo = mechanicCombos[biasedIndex(rng, mechanicCombos.length)];

      if (strict && (usedMechanics.has(combo.mechanic.id) || usedArtifacts.has(combo.artifact.id))) {
        continue;
      }

      const dna: ProblemDNA = {
        domainId: domain.id,
        actor: friction.actor,
        friction: friction.text,
        mechanicId: combo.mechanic.id,
        artifactId: combo.artifact.id,
        twistId: pick(rng, TWISTS).id,
        signal: pick(rng, domain.signals),
      };

      const fp = fingerprint(dna);
      if (excluded.has(fp) || usedFingerprints.has(fp)) continue;

      const twist = TWISTS.find((t) => t.id === dna.twistId)!;
      const fit = scoreFit(profile, strengths, combo.mechanic, combo.artifact);

      results.push(
        compose({
          dna,
          domain,
          friction,
          mechanic: combo.mechanic,
          artifact: combo.artifact,
          twist,
          fit,
          profile,
          caveat: relax.caveat,
        }),
      );

      usedFingerprints.add(fp);
      usedDomains.add(domain.id);
      usedFrictions.add(frictionKey);
      usedMechanics.add(combo.mechanic.id);
      usedArtifacts.add(combo.artifact.id);
    }
  }

  // Take the strictest bar that produces enough, loosening only as needed.
  for (const relax of RELAXATIONS) {
    if (results.length >= count) break;
    draw(relax);
  }

  return results;
}

/**
 * Size of the *valid* space — only combinations the catalogue actually permits,
 * so the number on the landing page is honest rather than flattering.
 */
export function combinationSpace(frictions: FrictionIndex): number {
  let total = 0;
  for (const pool of frictions.values()) {
    for (const friction of pool) {
      for (const mechanicId of friction.mechanics) {
        const mechanic = MECHANIC_BY_ID.get(mechanicId);
        if (mechanic) total += mechanic.artifacts.length;
      }
    }
  }
  return total * TWISTS.length;
}
