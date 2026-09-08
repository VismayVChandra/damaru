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

/**
 * Short imperatives that head the brief. Several per mechanic, not one -
 * the title is `${action}, for ${actor}`, and both mechanic and actor get
 * reused across many frictions by design (that's what gives the sampler
 * combinatorial range). A single fixed action per mechanic meant the same
 * (mechanic, actor) pair produced byte-identical titles for two people who
 * were issued genuinely different problems underneath - confirmed against
 * real issued data: 9 of the titles in production were exact duplicates,
 * one of them three times over. Picking from a few variants with the same
 * fingerprint-seeded rng already used for the hook means a repeat only
 * collides when the pick happens to land the same way twice, not always.
 */
const MECHANIC_ACTIONS: Record<string, string[]> = {
  "fuzzy-match": ["Find the right one", "Match the one spelled three different ways", "Stop pretending exact match works", "Find the match hiding behind a typo", "Rank the near-misses honestly"],
  structuring: ["Make the mess machine-readable", "Turn the pile into something queryable", "Give the mess a shape it doesn't have yet", "Build the schema nobody wrote down", "Turn chaos into rows and columns"],
  timeseries: ["See what actually changed", "Catch the trend before it's obvious", "Prove it's a pattern, not a coincidence", "Find the signal in the noise over time", "Track it long enough to trust the trend"],
  scheduling: ["Make the impossible schedule work", "Solve the puzzle nobody wants to do by hand", "Find the assignment that actually fits", "Fit everyone in without anyone noticing the seams", "Make the constraints agree with each other"],
  realtime: ["Keep everyone on the same page", "Stop the versions from drifting apart", "Make it feel like everyone's in the room", "Sync the room without anyone refreshing", "Resolve the edit before it becomes a conflict"],
  search: ["Find it without knowing its name", "Get the right result from a half-remembered query", "Make search actually understand the ask", "Rank results a person would actually pick", "Turn a bad query into a good answer"],
  classify: ["Sort it before a human has to", "Put it in the right bucket automatically", "Label it, and know when to admit doubt", "Route it to the right place automatically", "Know the difference without being told"],
  recommend: ["Suggest something worth the time", "Recommend well with almost nothing to go on", "Point at the right one, not just a popular one", "Guess well on day one, not just day thirty", "Earn the recommendation, don't just rank it"],
  vision: ["Read it from a photograph", "Pull the answer out of a bad photo", "See what the camera actually captured", "Get the answer out of a blurry shot", "Trust the photo only when it's trustworthy"],
  "nlp-extract": ["Pull the facts out of the prose", "Extract the one fact buried in a wall of text", "Turn paragraphs into something you can query", "Get the fact, skip the paragraph", "Cite the sentence, not just the summary"],
  geo: ["Put it on a map that tells the truth", "Make the map answer the actual question", "Get the geography right when the data doesn't", "Route around the map's blind spots", "Make the coordinates mean something"],
  "offline-sync": ["Work where there is no signal", "Keep working when the connection doesn't", "Sync it up without losing anyone's edits", "Keep it usable with zero bars", "Merge the edits without losing either one"],
  pipeline: ["Run it without anyone watching", "Make it run itself, reliably, every time", "Build the job nobody has to babysit", "Keep the job honest while nobody's looking", "Fail loudly instead of silently"],
  perf: ["Make it feel instant", "Shave the wait down to nothing", "Make the slow thing fast enough to trust", "Cut the wait, not the correctness", "Prove the speed with a number, not a feeling"],
  parser: ["Read the format nobody documented", "Make sense of a format with no spec", "Parse the thing everyone else gave up on", "Handle the format's every undocumented exception", "Turn garbage input into a clean record"],
  viz: ["Show it in one screen", "Make the truth obvious at a glance", "Turn the numbers into something worth looking at", "Say it in one chart, not five", "Make the number impossible to misread"],
  workflow: ["Model the work as it really happens", "Build for how people actually work, not the diagram", "Capture the exceptions, not just the happy path", "Design around the exceptions, not the ideal case", "Match the tool to the job people actually do"],
  capture: ["Capture it in five seconds", "Make logging it faster than skipping it", "Catch the moment before it's forgotten", "Make the log faster than the memory fades", "Log it before the excuse to skip it wins"],
  sensor: ["Measure it in the real world", "Turn a noisy reading into a number you can trust", "Measure the thing nobody's bothered to measure", "Calibrate it until the number means something", "Get a reading you'd actually act on"],
  simulate: ["Show what would happen instead", "Let them test the idea before committing to it", "Make the consequence visible before it's real", "Play out the scenario before it's real", "Make the assumptions visible, not buried"],
  privacy: ["Handle it without ever seeing it", "Keep the secret a secret, even from yourself", "Process it without anyone having to trust you", "Prove you never had to see it", "Design for the breach you didn't plan for"],
  gameloop: ["Make it worth doing twenty times", "Build the loop that doesn't get old", "Make the tenth try as fun as the first", "Make attempt twenty feel like attempt one", "Build a loop people choose to repeat"],
  structural: ["Prove it won't break", "Size it so it survives the real load", "Stop guessing whether it's strong enough", "Give it a safety factor you can defend", "Find the load before it finds you"],
  "circuit-design": ["Make the circuit behave", "Get it working outside the datasheet's ideal world", "Build the circuit that doesn't hum or drift", "Make it work past the ideal conditions", "Build the circuit that survives contact with reality"],
  "site-systems": ["Design for the real site", "Design for the site you actually have", "Stop assuming the textbook site", "Design for the site's worst day", "Account for the ground you're actually building on"],
  "process-design": ["Make the process scale", "Make it work at more than lab scale", "Find the failure mode before the plant does", "Keep the process safe past lab scale", "Balance the inputs and outputs honestly"],
  "flight-dynamics": ["Keep it stable in the air", "Prove it's stable before it flies", "Find the margin before gravity does", "Prove the margin before it's tested for real", "Keep it stable when the air doesn't cooperate"],
  "biomech-design": ["Design for a real body", "Design for bodies, not one idealised one", "Build it for the person, not the average", "Fit the range of real bodies, not one", "Design around how people actually move"],
  "environmental-system": ["Prove it meets the limit", "Measure against a real limit, not a feeling", "Prove compliance, don't assume it", "Hold the line against a real limit", "Monitor it, don't just test it once"],
  manufacturability: ["Make it buildable twice", "Design for the tenth one, not just the first", "Make the process as solid as the part", "Make unit ten as good as unit one", "Design tolerances you can actually hold"],
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
): Omit<
  Problem,
  | "id"
  | "status"
  | "notes"
  | "checklist"
  | "feedback"
  | "lookingForCollaborators"
  | "progress"
  | "createdAt"
> {
  const { dna, domain, mechanic, artifact, twist, fit, profile, caveat } = input;
  const fp = fingerprint(dna);
  const rng = seededRandom(fp);

  const action = pick(rng, MECHANIC_ACTIONS[mechanic.id] ?? ["Build the missing tool"]);
  const title = `${action}, for ${dna.actor}`;

  const hook = `${pick(rng, HOOK_OPENERS)(dna.actor, dna.friction)} ${pick(rng, HOOK_STAKES)}`;

  // The statement names the crux; the full requirement lives in "must do" so
  // the two do not repeat each other word for word.
  //
  // Was "...so that it is no longer true that {friction}." - grammatically
  // fine but a real double negative to parse, and actively ambiguous once a
  // friction has its own "and" in it (does the negation cover both halves,
  // or just the first?). Stating the friction plainly and the ask
  // separately reads in one direction only.
  const statement = [
    `The problem: ${dna.friction}, for ${dna.actor}.`,
    `Build ${artifact.phrase} that fixes it.`,
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

  // --- Starting angle --------------------------------------------------------
  // Hidden behind a reveal in the UI, never shown alongside the brief by
  // default - this is "where to begin," not the solution. Combines the
  // shipping format's first move with the crux's, so it stays specific to
  // both what's being built and what's actually hard about it.
  const startingAngle = `${artifact.firstStep} ${mechanic.firstMove}`;

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
    startingAngle,
    signals: [dna.signal, ...domain.signals.filter((s) => s !== dna.signal).slice(0, 2)],
    successCriteria,
    dna,
    fit,
    caveat,
    domainLabel: domain.label,
    domainIcon: domain.icon,
  };
}
