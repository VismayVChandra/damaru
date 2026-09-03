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
  | "security";

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
  skills: UserSkill[];
  /** Domain ids from the catalog. */
  interests: string[];
  /** Artifact ids the person would enjoy building; empty means "anything". */
  artifactPrefs: string[];
  timeBudget: TimeBudget;
  teamSize: TeamSize;
  appetite: Appetite;
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
  frictions: Friction[];
  /** Realistic places data could come from. */
  signals: string[];
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
}

/** A constraint that forces the problem somewhere non-obvious. */
export interface Twist {
  id: string;
  text: string;
  teaches: string;
}

export interface ProblemDNA {
  domainId: string;
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
  createdAt: string;
}
