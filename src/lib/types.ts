/** Shared domain types for Damaru. */

export type SkillCategory =
  | "frontend"
  | "backend"
  | "data"
  | "ml"
  | "mobile"
  | "systems"
  | "design"
  | "hardware"
  | "ops"
  | "gamedev"
  | "security"
  // Non-software engineering disciplines. Skills here feed the same fit
  // scoring as everything above; the mechanics/artifacts in blocks.ts that
  // require them are what make a generated problem an actual engineering
  // build (a prototype, an analysis) instead of a web app.
  | "mechanical"
  | "electrical"
  | "civil"
  | "chemical"
  | "aerospace"
  | "biomedical"
  | "environmental"
  | "industrial";

/** 1 = still learning, 2 = comfortable, 3 = strong. */
export type Proficiency = 1 | 2 | 3;

export interface Skill {
  id: string;
  label: string;
  category: SkillCategory;
  /** Alternate spellings people type when searching. */
  aliases?: string[];
}

export interface UserSkill {
  id: string;
  level: Proficiency;
}

export type TimeBudget = "weekend" | "twoweeks" | "semester";
export type TeamSize = "solo" | "pair" | "team";
/** How far outside their current skills the person wants to be pushed. */
export type Appetite = "comfort" | "stretch" | "deepend";

export interface Profile {
  id: string;
  handle: string;
  displayName: string;
  /** Shown on the public profile page only - a line of "who I am", never a generator input. */
  bio: string;
  skills: UserSkill[];
  /** Domain ids from the catalog. */
  interests: string[];
  /** Artifact ids the person would enjoy building; empty means "anything". */
  artifactPrefs: string[];
  timeBudget: TimeBudget;
  teamSize: TeamSize;
  appetite: Appetite;
  /** Read-only here - set by hand in the database, never through the API. */
  isAdmin: boolean;
  /** Whether this person is offered to others as a possible collaborator. */
  discoverable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * A specific pain, bound to the person who feels it and to the mechanics that
 * could plausibly address it. Binding these together is what stops the
 * generator producing coherent-looking nonsense.
 */
export interface Friction {
  /** Who feels this one. */
  actor: string;
  /** Lowercase clause, dropped into a sentence after the actor phrase. */
  text: string;
  /** Mechanic ids that make sense as an answer to this friction. */
  mechanics: string[];
}

export interface Domain {
  id: string;
  label: string;
  icon: string;
  /** Realistic places data could come from. */
  signals: string[];
}

export type FrictionStatus = "pending" | "accepted" | "rejected";

/**
 * A friction as it exists in the database - the catalogue the generator draws
 * from, plus the review metadata that lets club members contribute to it.
 */
export interface FrictionRecord extends Friction {
  id: string;
  domainId: string;
  status: FrictionStatus;
  /** Null for the frictions seeded from the original hand-written catalogue. */
  submittedBy: string | null;
  submittedByHandle?: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** The technical crux of a problem - what makes it interesting to build. */
export interface Mechanic {
  id: string;
  label: string;
  /** Artifact ids this crux can sensibly ship as. */
  artifacts: string[];
  requires: SkillCategory[];
  /** 1 = routine, 2 = meaty, 3 = genuinely hard. */
  difficulty: 1 | 2 | 3;
  requirement: string;
  teaches: string;
  /** The smallest concrete slice of the crux to attempt first - feeds the
   * optional, hidden-by-default "starting angle" hint, never the brief itself. */
  firstMove: string;
}

/** The shape of the thing they ship. */
export interface Artifact {
  id: string;
  label: string;
  /** Article-prefixed noun phrase, e.g. "a web app". */
  phrase: string;
  requires: SkillCategory[];
  nice: SkillCategory[];
  /** Rough build weight, 1 = light, 3 = heavy. */
  weight: 1 | 2 | 3;
  deliverable: string;
  /** The first concrete thing to get working in this shipping format - same
   * "starting angle" hint as Mechanic.firstMove, from the format's side. */
  firstStep: string;
}

/** A constraint that forces the problem somewhere non-obvious. */
export interface Twist {
  id: string;
  text: string;
  teaches: string;
  /**
   * Artifact ids this twist doesn't make sense for - e.g. "must fit in a
   * single file" is a real constraint for a CLI tool and nonsense for a
   * physical prototype. Absent means it applies everywhere.
   */
  excludeArtifacts?: string[];
}

export interface ProblemDNA {
  domainId: string;
  /** The specific catalogue row this came from - null only for problems generated before this existed. */
  frictionId: string | null;
  actor: string;
  friction: string;
  mechanicId: string;
  artifactId: string;
  twistId: string;
  signal: string;
}

export interface FitBreakdown {
  /** 0..1 - how much of what this needs the person already has. */
  score: number;
  covered: { category: SkillCategory; via: string[] }[];
  stretch: SkillCategory[];
  gaps: SkillCategory[];
  /** 1..5 estimated difficulty for THIS person. */
  difficulty: number;
  estimate: string;
}

/**
 * The immutable half of a problem - everything decided at issue time, stored
 * as a single jsonb column. Status, notes, checklist, feedback and progress
 * are mutable and live in their own columns/table.
 */
export type ProblemPayload = Omit<
  Problem,
  | "id"
  | "fingerprint"
  | "profileId"
  | "status"
  | "notes"
  | "checklist"
  | "feedback"
  | "lookingForCollaborators"
  | "progress"
  | "createdAt"
  | "likeCount"
  | "commentCount"
  | "likedByMe"
>;

/** One line of "what moved", appended to a problem over time. */
export interface ProgressEntry {
  id: string;
  problemId: string;
  body: string;
  createdAt: string;
}

export type CollabRequestStatus = "pending" | "accepted" | "declined";

/**
 * A request to work together - either on a specific problem (`problemId`
 * set, found by browsing what's flagged open) or a general one found by
 * browsing the club for a skill category (`problemId` null). Only the two
 * people involved ever see one.
 */
export interface CollabRequest {
  id: string;
  problemId: string | null;
  fromProfileId: string;
  fromHandle: string;
  toProfileId: string;
  toHandle: string;
  message: string;
  status: CollabRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  /** Present only when problemId is set. */
  problemTitle?: string;
  problemDomainIcon?: string;
  problemDomainLabel?: string;
}

/**
 * Which requirements and success criteria have been ticked off. Keyed
 * `req:<index>` / `success:<index>` against the arrays on the problem, which
 * never change once issued.
 */
export type Checklist = Record<string, boolean>;

export interface Problem {
  id: string;
  /** Global uniqueness key derived from the DNA. */
  fingerprint: string;
  profileId: string;
  title: string;
  hook: string;
  statement: string;
  whyYou: string;
  requirements: string[];
  stretchGoals: string[];
  skillStretch: string;
  /** Optional, hidden-by-default hint for someone stuck on where to begin -
   * a starting angle, never the solution itself. */
  startingAngle: string;
  signals: string[];
  successCriteria: string[];
  dna: ProblemDNA;
  fit: FitBreakdown;
  /** Set when the generator had to lower its bar to find this at all. */
  caveat?: string;
  domainLabel: string;
  domainIcon: string;
  status: "new" | "saved" | "building" | "shipped" | "passed";
  notes: string;
  /** Was this friction, for this person, actually a good problem? Their call alone. */
  feedback: "up" | "down" | null;
  /** Flagged by the owner as open for someone else to join. */
  lookingForCollaborators: boolean;
  checklist: Checklist;
  /** Loaded alongside the problem where the view needs it; newest first. */
  progress?: ProgressEntry[];
  createdAt: string;
  /** Social engagement - only populated where a listing joins it in (the
   * home feed, explore, a profile grid). Never part of the stored payload. */
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
}

export interface ProblemComment {
  id: string;
  problemId: string;
  profileId: string;
  handle: string;
  body: string;
  createdAt: string;
}

export type NotificationType = "follow" | "like" | "comment" | "collab_request" | "collab_accepted";

/**
 * One piece of activity aimed at the signed-in person - the thing that
 * actually pulls someone back into the app instead of relying on them to
 * stumble across new activity on their own.
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Who did it - absent only for a hypothetical system notification. */
  actorHandle: string | null;
  problemId: string | null;
  problemTitle?: string;
  read: boolean;
  createdAt: string;
}
