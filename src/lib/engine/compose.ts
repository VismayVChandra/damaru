import type {
  Artifact,
  Domain,
  FitBreakdown,
  Friction,
  Mechanic,
  Problem,
  ProblemDNA,
  Profile,
  SkillCategory,
  Twist,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";
import { MECHANICS } from "@/lib/catalog/blocks";
import { fingerprint, pick, pickMany, seededRandom } from "./novelty";

/** Short imperative used to head the brief. */
const MECHANIC_ACTION: Record<string, string> = {
  "fuzzy-match": "Find the right one",
  structuring: "Make the mess machine-readable",
  timeseries: "See what actually changed",
  scheduling: "Make the impossible schedule work",
  realtime: "Keep everyone on the same page",
  search: "Find it without knowing its name",
  classify: "Sort it before a human has to",
  recommend: "Suggest something worth the time",
  vision: "Read it from a photograph",
  "nlp-extract": "Pull the facts out of the prose",
  geo: "Put it on a map that tells the truth",
  "offline-sync": "Work where there is no signal",
  pipeline: "Run it without anyone watching",
  perf: "Make it feel instant",
  parser: "Read the format nobody documented",
  viz: "Show it in one screen",
  workflow: "Model the work as it really happens",
  capture: "Capture it in five seconds",
  sensor: "Measure it in the real world",
  simulate: "Show what would happen instead",
  privacy: "Handle it without ever seeing it",
  gameloop: "Make it worth doing twenty times",
};

const HOOK_OPENERS = [
  (actor: string, friction: string) =>
    `Here is a real, unglamorous problem: ${friction} — and ${actor} lives with it every single week.`,
  (actor: string, friction: string) => `${cap(actor)} works around this constantly: ${friction}.`,
  (actor: string, friction: string) =>
    `Nobody has built this because it is boring to describe and genuinely painful to live with: ${friction}. Ask ${actor}.`,
  (actor: string, friction: string) =>
    `Start with ${actor}. The thing that quietly ruins their week is that ${friction}.`,
  (actor: string, friction: string) => `This one looks small and is not. For ${actor}, ${friction}.`,
];

const HOOK_STAKES = [
  "The cost is never dramatic. It is a steady tax that everyone involved has stopped noticing, which is precisely why it survives.",
  "It never becomes urgent enough to fix, and that is exactly why it never gets fixed.",
  "Every workaround in the chain is individually reasonable and collectively absurd.",
  "The people affected have simply concluded that this is how things are. They are wrong, and that gap is your opening.",
  "There is no product here because the market is too small to interest anyone with a budget. That is what makes it yours.",
  "Solve it properly and you will not have built a demo — you will have built something a real person keeps using after you stop maintaining it.",
];

const SCOPE_LINES = [
  "Scope it so the first genuinely useful version exists early, and everything after that is an improvement rather than a prerequisite.",
  "Resist building a platform. Build the one screen that removes the pain, then earn the right to add more.",
  "Ship something a real user can hold within the first third of your time. The rest is refinement.",
  "The failure mode here is building infrastructure for features nobody asked for. Start at the painful end.",
];

const WHY_YOU_OPENERS = [
  "This landed on your skills deliberately.",
  "This is not a random draw.",
  "The match here is specific.",
  "You were picked for this combination.",
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function categoryPhrase(c: SkillCategory): string {
  return CATEGORY_LABELS[c].toLowerCase();
}

export interface ComposeInput {
  dna: ProblemDNA;
  domain: Domain;
  friction: Friction;
  mechanic: Mechanic;
  artifact: Artifact;
  twist: Twist;
  fit: FitBreakdown;
  profile: Profile;
  /** Honest note when a relaxed bar was needed to find this. */
  caveat?: string;
}

export function compose(
  input: ComposeInput,
): Omit<Problem, "id" | "status" | "notes" | "checklist" | "feedback" | "progress" | "createdAt"> {
  const { dna, domain, mechanic, artifact, twist, fit, profile, caveat } = input;
  const fp = fingerprint(dna);
  const rng = seededRandom(fp);

  const action = MECHANIC_ACTION[mechanic.id] ?? "Build the missing tool";
  const title = `${action}, for ${dna.actor}`;

  const hook = `${pick(rng, HOOK_OPENERS)(dna.actor, dna.friction)} ${pick(rng, HOOK_STAKES)}`;

  // The statement names the crux; the full requirement lives in "must do" so
  // the two do not repeat each other word for word.
  const statement = [
    `Build ${artifact.phrase} for ${dna.actor}, so that it is no longer true that ${dna.friction}.`,
    `The hard part is ${mechanic.label}.`,
    twist.text,
    pick(rng, SCOPE_LINES),
  ].join(" ");

  // --- Why you -------------------------------------------------------------
  const haveLabels = fit.covered.flatMap((c) => c.via).slice(0, 4);
  const stretchLabels = fit.stretch.map(categoryPhrase);
  const gapLabels = fit.gaps.map(categoryPhrase);

  const whyParts: string[] = [pick(rng, WHY_YOU_OPENERS)];

  if (gapLabels.length > 0) {
    whyParts.push(
      haveLabels.length > 0
        ? `${joinList(haveLabels)} gets you part of the way, and the honest gap is ${joinList(gapLabels)} — you would be starting that from scratch, which is the reason to pick this over something safer.`
        : `The honest position is that ${joinList(gapLabels)} is new ground for you. That is survivable here because the problem itself is small and well-defined; the difficulty is in the learning, not in the scope.`,
    );
    if (stretchLabels.length > 0) {
      whyParts.push(
        `You are also thin on ${joinList(stretchLabels)}, so budget time for it rather than assuming it will be quick.`,
      );
    }
  } else if (stretchLabels.length > 0) {
    whyParts.push(
      haveLabels.length > 0
        ? `${joinList(haveLabels)} covers most of what this needs, so you will spend your time on the actual problem instead of fighting your tools.`
        : "You have enough adjacent ground that setup will not eat your whole timeline.",
    );
    whyParts.push(
      `The part you grow into is ${joinList(stretchLabels)} — one honest step outside what you do today, which is where the learning is.`,
    );
  } else {
    whyParts.push(
      `${joinList(haveLabels)} covers the whole technical surface, so nothing here should block you.`,
    );
    whyParts.push(`The stretch is not in the stack, it is in the constraint: ${twist.teaches}.`);
  }

  whyParts.push(
    `Your interest in ${domain.label.toLowerCase()} matters here — you will need judgement about what actually helps, and that only comes from caring about the domain.`,
  );
  const whyYou = whyParts.join(" ");

  // --- Requirements --------------------------------------------------------
  const requirements: string[] = [
    `Ship ${artifact.deliverable}.`,
    mechanic.requirement,
    "Make the improvement measurable: pick one number that describes the pain as it stands today — minutes spent, items lost, mistakes made — and be able to show that number moving.",
    `Work from ${dna.signal} rather than data you invented, even if you start with a small hand-collected sample.`,
    `Honour the constraint: ${twist.text.charAt(0).toLowerCase()}${twist.text.slice(1).replace(/\.$/, "")}.`,
  ];

  if (profile.teamSize !== "solo") {
    requirements.push(
      "Split the work so two people are never blocked on the same file, and write down who owns what before you start.",
    );
  }

  requirements.push(
    `Put it in front of ${dna.actor} before you call it finished. Their confusion is data, not an inconvenience.`,
  );

  // --- Stretch goals -------------------------------------------------------
  const otherMechanics = MECHANICS.filter((m) => m.id !== mechanic.id);
  const stretchGoals = pickMany(rng, otherMechanics, 3).map(
    (m) => `Add ${m.label}: ${m.requirement}`,
  );
  stretchGoals.push(
    `Write up what you learned about ${domain.label.toLowerCase()} in public, including the part where your first design was wrong.`,
  );

  // --- Success criteria ----------------------------------------------------
  const successCriteria = [
    "A person who has never seen it can complete the core task without you in the room.",
    "It handles the ugliest real example you can find, and fails legibly on the ones it cannot.",
    `${cap(dna.actor)} chooses to use it a second time without being asked.`,
    "You can explain the central technical decision, and why you rejected the obvious alternative, in two minutes.",
  ];

  // --- Skill stretch -------------------------------------------------------
  const growing = [...stretchLabels, ...gapLabels];
  const skillStretch =
    growing.length > 0
      ? `Unfamiliar ground: ${joinList(growing)}. The crux itself teaches ${mechanic.teaches}; the constraint forces ${twist.teaches}.`
      : `Not new territory, but new depth. The crux teaches ${mechanic.teaches}; the constraint forces ${twist.teaches}.`;

  return {
    fingerprint: fp,
    profileId: profile.id,
    title,
    hook,
    statement,
    whyYou,
    requirements,
    stretchGoals,
    skillStretch,
    signals: [dna.signal, ...domain.signals.filter((s) => s !== dna.signal).slice(0, 2)],
    successCriteria,
    dna,
    fit,
    caveat,
    domainLabel: domain.label,
    domainIcon: domain.icon,
  };
}
