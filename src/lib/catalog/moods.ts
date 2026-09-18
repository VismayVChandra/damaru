import type { Artifact, FitBreakdown, Mechanic } from "@/lib/types";

/**
 * What someone is in the mood to build, as a filter over the combinations the
 * engine was going to consider anyway. Every predicate reads values the
 * catalogue and `scoreFit` already produce - nothing new is stored, and none
 * of this touches the draw's randomness.
 *
 * A mood is a hard filter, not a nudge: picking "something small" and being
 * handed a semester-long build would be a lie. When a mood can't be satisfied
 * the engine drops it and says so on the card, the same way it already does
 * when it has to reach outside the interests someone picked.
 */
export interface Mood {
  id: string;
  label: string;
  /** One line, shown on hover - what this actually selects for. */
  hint: string;
  matches(mechanic: Mechanic, artifact: Artifact, fit: FitBreakdown): boolean;
}

export const MOODS: Mood[] = [
  {
    id: "quick",
    label: "Something small",
    hint: "Light enough to finish in a weekend.",
    // weight 1: a CLI tool, a bot, an extension, a writeup.
    matches: (_mechanic, artifact) => artifact.weight === 1,
  },
  {
    id: "meaty",
    label: "Something hard",
    hint: "A genuinely difficult core, not just a big one.",
    matches: (mechanic, _artifact, fit) => mechanic.difficulty === 3 || fit.difficulty >= 4,
  },
  {
    id: "visual",
    label: "Something visual",
    hint: "You'll spend the build looking at what you made.",
    matches: (mechanic, artifact) =>
      [...mechanic.requires, ...artifact.requires, ...artifact.nice].some(
        (c) => c === "frontend" || c === "design",
      ),
  },
  {
    id: "physical",
    label: "Something physical",
    hint: "It exists off the screen.",
    // Named directly rather than inferred: there is no "shape" field on an
    // artifact, and `prototype.requires` is deliberately empty because its
    // mechanic supplies the discipline.
    matches: (_mechanic, artifact) => artifact.id === "device" || artifact.id === "prototype",
  },
  {
    id: "analytical",
    label: "Something to figure out",
    hint: "The answer is the deliverable, not the app around it.",
    matches: (mechanic, artifact) =>
      artifact.id === "study" || artifact.id === "analysis" || mechanic.requires.includes("data"),
  },
];

export const MOOD_BY_ID = new Map(MOODS.map((m) => [m.id, m]));
