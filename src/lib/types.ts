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
  | "inspiredByProblemId"
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
  | "team"
  | "roles"
  | "memberCount"
>;

export type BuildLogKind = "progress" | "blocked" | "looking_for_help" | "milestone" | "shipped";

/** One entry in a project's build log - a line of "what moved", typed. */
export interface ProgressEntry {
  id: string;
  problemId: string;
  body: string;
  kind: BuildLogKind;
  imageUrl: string | null;
  linkUrl: string | null;
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
  /** Set when this request is an application to a specific published role. */
  roleId: string | null;
  /** Present only when roleId is set. */
  roleName?: string;
}

/**
 * Which requirements and success criteria have been ticked off. Keyed
 * `req:<index>` / `success:<index>` against the arrays on the problem, which
 * never change once issued.
 */
export type Checklist = Record<string, boolean>;

/**
 * new -> idea -> prototype -> building -> beta -> shipped, or passed
 * (terminal, reachable from anywhere). "new" is the generator's raw output,
 * before anyone has committed to it as a project at all - everything from
 * "idea" on is a real project with a team, not just a saved brief.
 */
export type ProjectStatus = "new" | "idea" | "prototype" | "building" | "beta" | "shipped" | "passed";

export interface Problem {
  id: string;
  /** Global uniqueness key derived from the DNA. */
  fingerprint: string;
  profileId: string;
  /** The project this one was forked from, if any. Null for an original draw. */
  inspiredByProblemId: string | null;
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
  status: ProjectStatus;
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
  /** Team and open roles - loaded where the view needs them (the project
   * page), same convention as `progress`. Never part of the stored payload. */
  team?: TeamMember[];
  roles?: ProjectRole[];
  memberCount?: number;
}

/** One person on a project's team - the owner (synthesised, never a row of
 * its own) plus anyone whose collab request to join was accepted. */
export interface TeamMember {
  profileId: string;
  handle: string;
  displayName: string;
  /** Free text. Empty for the synthesised owner entry, rendered as "Creator". */
  roleName: string;
  /** The published role they were accepted into, if any. */
  roleId: string | null;
  isOwner: boolean;
  joinedAt: string;
}

/** A specific role a project owner is looking to fill. */
export interface ProjectRole {
  id: string;
  problemId: string;
  roleName: string;
  skills: string[];
  countNeeded: number;
  /** Derived from project_members, never stored. */
  filled: number;
  description: string;
  commitment: string;
  duration: string;
  /** The owner's "still accepting applications" switch. */
  open: boolean;
  createdAt: string;
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
