import type {
  Artifact,
  Domain,
  FitBreakdown,
  FrictionRecord,
  Mechanic,
  Problem,
  ProblemDNA,
  Profile,
} from "@/lib/types";
import { DOMAINS, DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { ARTIFACTS, ARTIFACT_BY_ID, MECHANICS, MECHANIC_BY_ID, TWISTS } from "@/lib/catalog/blocks";
import {
  appetiteTargetFrom,
  categoryStrengths,
  hasPhysicalSkills,
  isDoable,
  isPhysicalWork,
  scoreFit,
} from "./fit";
import type { DoabilityBar } from "./fit";
import { compose } from "./compose";
import { fingerprint, pick, pickWeighted, seededRandom } from "./novelty";
import { MOOD_BY_ID, type Mood } from "@/lib/catalog/moods";

export type GeneratedProblem = Omit<
  Problem,
  | "id"
  | "inspiredByProblemId"
  | "status"
  | "notes"
  | "checklist"
  | "feedback"
  | "lookingForCollaborators"
  | "statusChangedAt"
  | "progress"
  | "createdAt"
>;

/**
 * The friction catalogue, grouped by domain. Passed in rather than loaded
 * here: frictions now live in Postgres, and keeping the engine a pure
 * function of (profile, catalogue) leaves it synchronous and testable.
 *
 * Carries the full `FrictionRecord` (not just the bare actor/text/mechanics)
 * so `friction.id` can flow into `dna.frictionId` - the link that lets
 * feedback roll up per catalogue entry rather than floating per problem.
 */
export type FrictionIndex = Map<string, FrictionRecord[]>;

export function indexFrictions(frictions: FrictionRecord[]): FrictionIndex {
  const index: FrictionIndex = new Map();
  for (const f of frictions) {
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
  /** Friction ids already issued to this person, on any mechanic - a
   * fingerprint alone only blocks the exact combination from repeating, not
   * the same friction resurfacing with a different mechanic, which is what
   * actually reads as "I've seen this before". */
  excludeFrictionIds?: Set<string>;
  /** Varying this produces a different draw for the same profile. */
  seed?: string;
  /** What this person is in the mood to build. A hard filter while it can be
   * satisfied; dropped with a caveat rather than returning nothing. */
  moodId?: string;
  /** Pin the draw to these domains. Reroll uses it to stay inside the domain
   * being rerolled, which interests no longer do now they are a weighting. */
  restrictDomains?: string[];
  /** What the club as a whole has already been handed. Without it, ten
   * similar profiles get byte-identical rankings and therefore the same
   * briefs as each other. */
  clubUsage?: DnaUsage;
  /** What this person has already been handed. Weighted harder than the
   * club's: "repetitive" is a judgement about your own feed, not everyone's. */
  personalUsage?: DnaUsage;
  /** Mechanics and artifacts already used by earlier passes of the same
   * request, so the four passes of one generate don't undo each other. */
  excludeMechanics?: Set<string>;
  excludeArtifacts?: Set<string>;
}

/** Draw counts, for pushing the sampler toward things it has not used. */
export interface DnaUsage {
  mechanics: Map<string, number>;
  artifacts: Map<string, number>;
  total: number;
}

/** 0 when never drawn, 1 at exactly its fair share, 2 at double. Capped so a
 * single hogged mechanic cannot dominate the term. */
function relativeUse(count: number, total: number, slots: number): number {
  if (total <= 0 || slots <= 0) return 0;
  return Math.min(2, count / (total / slots));
}

/** +1 for never used, -1 for twice its share. */
function novelty(usage: DnaUsage | undefined, key: string, kind: "mechanics" | "artifacts", slots: number): number {
  if (!usage) return 0;
  return 1 - relativeUse(usage[kind].get(key) ?? 0, usage.total, slots);
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
function rankCombosByMechanic(
  profile: Profile,
  bar: DoabilityBar,
  mood: Mood | null,
  clubUsage?: DnaUsage,
  personalUsage?: DnaUsage,
): Map<string, Combo[]> {
  const strengths = categoryStrengths(profile);
  const prefs = new Set(profile.artifactPrefs);
  const timeTarget = TIME_TARGET_WEIGHT[profile.timeBudget];
  // Someone with no physical skills at all is never offered physical work, at
  // any relaxation tier - see isPhysicalWork for why this is a gate.
  const allowPhysical = hasPhysicalSkills(strengths);

  // Pass one: what can this person build at all, and at what fits. The
  // appetite target is a percentile of *these* scores rather than an absolute,
  // because the old absolutes (0.86 / 0.68 / 0.52) were calibrated against a
  // fit range most real profiles never reach - which quietly aimed everyone
  // at whichever single combo sat nearest the number.
  const viable: { mechanic: Mechanic; artifact: Artifact; fit: FitBreakdown }[] = [];
  for (const mechanic of MECHANICS) {
    for (const artifactId of mechanic.artifacts) {
      const artifact = ARTIFACT_BY_ID.get(artifactId);
      if (!artifact) continue;
      if (!allowPhysical && isPhysicalWork(mechanic, artifact)) continue;
      const fit = scoreFit(profile, strengths, mechanic, artifact);
      if (!isDoable(fit, bar)) continue;
      if (mood && !mood.matches(mechanic, artifact, fit)) continue;
      viable.push({ mechanic, artifact, fit });
    }
  }
  if (viable.length === 0) return new Map();

  const target = appetiteTargetFrom(
    [...new Set(viable.map((v) => v.fit.score))].sort((a, b) => a - b),
    profile.appetite,
    bar.minFit,
  );

  const mechanicSlots = MECHANICS.length;
  const artifactSlots = ARTIFACTS.length;
  const byMechanic = new Map<string, Combo[]>();

  for (const { mechanic, artifact, fit } of viable) {
    // Closeness to the appetite they asked for dominates.
    let score = 1 - Math.abs(fit.score - target);
    // Respect a stated preference, but only as a thumb on the scale. At the
    // old 0.35 it outweighed every other term combined, so ticking one box
    // decided the brief outright.
    if (prefs.has(artifact.id)) score += 0.1;
    // Nudge toward things that fit the time they actually have.
    score -= Math.abs(artifact.weight - timeTarget) * 0.06;
    // Push toward what this person, then the club, has seen least of. Kept
    // deliberately smaller than the spread in fit: novelty should break ties
    // and reorder near-equals, never hand someone work they cannot do.
    score += 0.2 * novelty(personalUsage, mechanic.id, "mechanics", mechanicSlots);
    score += 0.1 * novelty(personalUsage, artifact.id, "artifacts", artifactSlots);
    score += 0.12 * novelty(clubUsage, mechanic.id, "mechanics", mechanicSlots);
    score += 0.06 * novelty(clubUsage, artifact.id, "artifacts", artifactSlots);

    const list = byMechanic.get(mechanic.id);
    if (list) list.push({ mechanic, artifact, score });
    else byMechanic.set(mechanic.id, [{ mechanic, artifact, score }]);
  }

  for (const combos of byMechanic.values()) combos.sort((a, b) => b.score - a.score);
  return byMechanic;
}

/**
 * Interests the person chose, falling back to the whole catalogue - minus any
 * domain that currently has no accepted frictions, which would otherwise be a
 * dead end the sampler keeps rediscovering.
 */
/** How much of the draw the person's stated interests should account for.
 * The rest goes to everything else, so picking three interests tilts the
 * odds instead of walling off the other fifteen domains - which is what kept
 * 131 of 160 frictions permanently out of reach. */
const INTEREST_SHARE = 0.6;

/**
 * Domains to draw from, weighted. Expressed as a share rather than a ratio on
 * purpose: a fixed 3:1 would mean someone who picked three interests gets a
 * very different mix from someone who picked six, for no reason they chose.
 */
function candidateDomains(
  profile: Profile,
  frictions: FrictionIndex,
  restrictDomains?: string[],
): { item: Domain; weight: number }[] {
  const stocked = (d: { id: string }) => (frictions.get(d.id)?.length ?? 0) > 0;

  // Reroll pins the draw to one domain; it is not a preference.
  if (restrictDomains?.length) {
    const pinned = restrictDomains
      .map((id) => DOMAIN_BY_ID.get(id))
      .filter((d): d is Domain => Boolean(d))
      .filter(stocked);
    if (pinned.length > 0) return pinned.map((item) => ({ item, weight: 1 }));
  }

  const all = DOMAINS.filter(stocked);
  const wanted = new Set(profile.interests);
  const inInterest = all.filter((d) => wanted.has(d.id));
  const rest = all.filter((d) => !wanted.has(d.id));

  // Nothing to tilt toward, or nothing to tilt away from.
  if (inInterest.length === 0 || rest.length === 0) {
    return all.map((item) => ({ item, weight: 1 }));
  }

  return [
    ...inInterest.map((item) => ({ item, weight: INTEREST_SHARE / inInterest.length })),
    ...rest.map((item) => ({ item, weight: (1 - INTEREST_SHARE) / rest.length })),
  ];
}

/**
 * Bias a pick toward the front of a sorted list without ever locking onto it.
 *
 * The default suits picking the best shipping format for a mechanic. It is
 * too sharp for picking the mechanic itself: candidate lists there are short
 * (two to four), where an exponent of 1.6 takes the front item 42-65% of the
 * time - and since the ranking is identical for everyone with similar skills,
 * that is the same front item for all of them. Hence the gentler exponent at
 * that call site.
 */
function biasedIndex(rng: () => number, length: number, exponent = 1.6): number {
  return Math.floor(Math.pow(rng(), exponent) * length) % length;
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
  caveat?: string;
}

// Three tiers, varying only the doability bar. There used to be a fourth that
// differed only by opening up domains outside the person's interests - now
// that interests are a weighting rather than a gate, it was identical to the
// first tier and could never fire. Its caveat went with it: drawing from
// outside your stated interests is ordinary now, not a failure to apologise
// for.
const RELAXATIONS: Relaxation[] = [
  { bar: { minFit: 0.34, maxGaps: 1 } },
  {
    bar: { minFit: 0.24, maxGaps: 2 },
    caveat:
      "Bigger stretch than you asked for. Your skills and your interests do not overlap much yet, so this reaches further outside what you know than the usual bar allows.",
  },
  {
    bar: { minFit: 0.12, maxGaps: 3 },
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
  // Seeded by the caller so the several passes of one request keep spreading
  // out instead of each starting over.
  const usedMechanics = new Set<string>(opts.excludeMechanics ?? []);
  const usedArtifacts = new Set<string>(opts.excludeArtifacts ?? []);
  // Seeded from what this person has already been issued, so a batch (and
  // every generate/reroll after it) draws frictions they haven't seen yet
  // before it repeats one with a different mechanic attached.
  const usedFrictions = new Set<string>(opts.excludeFrictionIds ?? []);
  const usedFingerprints = new Set<string>();

  /** One pass at a given relaxation, appending whatever it can find. */
  function draw(relax: Relaxation, mood: Mood | null, caveatOverride?: string): void {
    const byMechanic = rankCombosByMechanic(
      profile,
      relax.bar,
      mood,
      opts.clubUsage,
      opts.personalUsage,
    );
    if (byMechanic.size === 0) return;

    const domains = candidateDomains(profile, frictions, opts.restrictDomains);
    if (domains.length === 0) return;

    const MAX_ATTEMPTS = 1200;
    let attempts = 0;

    while (results.length < count && attempts < MAX_ATTEMPTS) {
      attempts++;
      const strict = attempts < MAX_ATTEMPTS * 0.55;

      // Spread a batch across domains where possible, then fall back to the
      // weighted pool so one batch doesn't keep landing in the same place.
      const freshDomains = domains.filter((d) => !usedDomains.has(d.item.id));
      const domain = pickWeighted(rng, freshDomains.length > 0 ? freshDomains : domains);

      const pool = frictions.get(domain.id);
      if (!pool || pool.length === 0) continue;
      const friction: FrictionRecord = pick(rng, pool);
      if (usedFrictions.has(friction.id)) continue;

      // Only mechanics this friction could plausibly be answered by, and only
      // those the person can actually build at this bar.
      const options = friction.mechanics
        .map((id) => byMechanic.get(id))
        .filter((c): c is Combo[] => Boolean(c) && c!.length > 0)
        // Best-fitting mechanic first, so the biased pick below actually
        // favours a good match rather than whatever the friction listed first.
        .sort((a, b) => b[0].score - a[0].score);
      if (options.length === 0) continue;

      const mechanicCombos = options[biasedIndex(rng, options.length, 1.15)];
      const combo = mechanicCombos[biasedIndex(rng, mechanicCombos.length)];

      if (strict && (usedMechanics.has(combo.mechanic.id) || usedArtifacts.has(combo.artifact.id))) {
        continue;
      }

      // A twist like "must fit in a single file" is nonsense for a physical
      // prototype - exclude whatever doesn't apply to this artifact rather
      // than picking from the full list unconditionally.
      // A constraint has to make sense for the thing being shipped: "hand
      // tools only" is nonsense on a written investigation, and "keyboard and
      // screen reader" is nonsense on a jig. Artifacts of kind "either" take
      // constraints from both families.
      const eligibleTwists = TWISTS.filter(
        (t) =>
          !(t.excludeArtifacts ?? []).includes(combo.artifact.id) &&
          (!t.appliesTo || combo.artifact.kind === "either" || t.appliesTo === combo.artifact.kind),
      );

      const dna: ProblemDNA = {
        domainId: domain.id,
        frictionId: friction.id,
        actor: friction.actor,
        friction: friction.text,
        mechanicId: combo.mechanic.id,
        artifactId: combo.artifact.id,
        twistId: pick(rng, eligibleTwists.length > 0 ? eligibleTwists : TWISTS).id,
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
          caveat: caveatOverride ?? relax.caveat,
        }),
      );

      usedFingerprints.add(fp);
      usedDomains.add(domain.id);
      usedFrictions.add(friction.id);
      usedMechanics.add(combo.mechanic.id);
      usedArtifacts.add(combo.artifact.id);
    }
  }

  const mood = opts.moodId ? MOOD_BY_ID.get(opts.moodId) ?? null : null;

  // Take the strictest bar that produces enough, loosening only as needed.
  for (const relax of RELAXATIONS) {
    if (results.length >= count) break;
    draw(relax, mood);
  }

  // Nothing in that mood was left that this person could build. Drop it and
  // say so on the card rather than coming back empty - same contract as the
  // relaxation ladder's own caveats, and it keeps a narrow mood from looking
  // like "you have exhausted the catalogue".
  if (mood) {
    const dropped = `Not ${mood.label.toLowerCase()}. Nothing matching that was left that you could build, so this is the closest the catalogue could get.`;
    for (const relax of RELAXATIONS) {
      if (results.length >= count) break;
      draw(relax, null, dropped);
    }
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
