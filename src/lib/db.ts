import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Problem, Profile } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "data", "damaru.db");

// Next.js hot-reloads modules in dev; without a global the process would open
// a new handle on every edit.
const globalForDb = globalThis as unknown as { __damaruDb?: DatabaseSync };

function init(): DatabaseSync {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id             TEXT PRIMARY KEY,
      handle         TEXT NOT NULL UNIQUE,
      display_name   TEXT NOT NULL,
      skills         TEXT NOT NULL,
      interests      TEXT NOT NULL,
      artifact_prefs TEXT NOT NULL,
      time_budget    TEXT NOT NULL,
      team_size      TEXT NOT NULL,
      appetite       TEXT NOT NULL,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id          TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL UNIQUE,
      profile_id  TEXT NOT NULL,
      payload     TEXT NOT NULL,
      status      TEXT NOT NULL,
      notes       TEXT NOT NULL DEFAULT '',
      domain_id   TEXT NOT NULL,
      fit         REAL NOT NULL,
      difficulty  INTEGER NOT NULL,
      created_at  TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_problems_profile ON problems(profile_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_problems_created ON problems(created_at DESC)");

  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__damaruDb) globalForDb.__damaruDb = init();
  return globalForDb.__damaruDb;
}

// --- Profiles --------------------------------------------------------------

interface ProfileRow {
  id: string;
  handle: string;
  display_name: string;
  skills: string;
  interests: string;
  artifact_prefs: string;
  time_budget: string;
  team_size: string;
  appetite: string;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    skills: JSON.parse(row.skills),
    interests: JSON.parse(row.interests),
    artifactPrefs: JSON.parse(row.artifact_prefs),
    timeBudget: row.time_budget as Profile["timeBudget"],
    teamSize: row.team_size as Profile["teamSize"],
    appetite: row.appetite as Profile["appetite"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function upsertProfile(profile: Profile): Profile {
  const db = getDb();
  db.prepare(
    `INSERT INTO profiles
       (id, handle, display_name, skills, interests, artifact_prefs,
        time_budget, team_size, appetite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(handle) DO UPDATE SET
       display_name   = excluded.display_name,
       skills         = excluded.skills,
       interests      = excluded.interests,
       artifact_prefs = excluded.artifact_prefs,
       time_budget    = excluded.time_budget,
       team_size      = excluded.team_size,
       appetite       = excluded.appetite,
       updated_at     = excluded.updated_at`,
  ).run(
    profile.id,
    profile.handle,
    profile.displayName,
    JSON.stringify(profile.skills),
    JSON.stringify(profile.interests),
    JSON.stringify(profile.artifactPrefs),
    profile.timeBudget,
    profile.teamSize,
    profile.appetite,
    profile.createdAt,
    profile.updatedAt,
  );
  return getProfileByHandle(profile.handle)!;
}

export function getProfileByHandle(handle: string): Profile | null {
  const row = getDb()
    .prepare("SELECT * FROM profiles WHERE handle = ?")
    .get(handle) as unknown as ProfileRow | undefined;
  return row ? rowToProfile(row) : null;
}

export function getProfileById(id: string): Profile | null {
  const row = getDb().prepare("SELECT * FROM profiles WHERE id = ?").get(id) as unknown as
    | ProfileRow
    | undefined;
  return row ? rowToProfile(row) : null;
}

export function countProfiles(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM profiles").get() as unknown as { n: number };
  return Number(row.n);
}

// --- Problems --------------------------------------------------------------

interface ProblemRow {
  id: string;
  fingerprint: string;
  profile_id: string;
  payload: string;
  status: string;
  notes: string;
  created_at: string;
}

function rowToProblem(row: ProblemRow): Problem {
  const payload = JSON.parse(row.payload) as Problem;
  return {
    ...payload,
    id: row.id,
    fingerprint: row.fingerprint,
    profileId: row.profile_id,
    status: row.status as Problem["status"],
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/** Every fingerprint ever issued, so the same problem is never handed out twice. */
export function allFingerprints(): Set<string> {
  const rows = getDb().prepare("SELECT fingerprint FROM problems").all() as unknown as {
    fingerprint: string;
  }[];
  return new Set(rows.map((r) => r.fingerprint));
}

/**
 * Insert if the fingerprint is free. Returns null when another request claimed
 * it first, which the caller treats as "draw again".
 */
export function insertProblem(problem: Problem): Problem | null {
  try {
    getDb()
      .prepare(
        `INSERT INTO problems
           (id, fingerprint, profile_id, payload, status, notes, domain_id, fit, difficulty, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        problem.id,
        problem.fingerprint,
        problem.profileId,
        JSON.stringify(problem),
        problem.status,
        problem.notes,
        problem.dna.domainId,
        problem.fit.score,
        problem.fit.difficulty,
        problem.createdAt,
      );
    return problem;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE")) return null;
    throw err;
  }
}

export function getProblem(id: string): Problem | null {
  const row = getDb().prepare("SELECT * FROM problems WHERE id = ?").get(id) as unknown as
    | ProblemRow
    | undefined;
  return row ? rowToProblem(row) : null;
}

export function listProblemsForProfile(profileId: string): Problem[] {
  const rows = getDb()
    .prepare("SELECT * FROM problems WHERE profile_id = ? ORDER BY created_at DESC")
    .all(profileId) as unknown as ProblemRow[];
  return rows.map(rowToProblem);
}

export function listRecentProblems(limit = 40): Problem[] {
  const rows = getDb()
    .prepare("SELECT * FROM problems ORDER BY created_at DESC LIMIT ?")
    .all(limit) as unknown as ProblemRow[];
  return rows.map(rowToProblem);
}

export function updateProblem(
  id: string,
  patch: { status?: Problem["status"]; notes?: string },
): Problem | null {
  const existing = getProblem(id);
  if (!existing) return null;
  getDb()
    .prepare("UPDATE problems SET status = ?, notes = ? WHERE id = ?")
    .run(patch.status ?? existing.status, patch.notes ?? existing.notes, id);
  return getProblem(id);
}

export function countProblems(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM problems").get() as unknown as { n: number };
  return Number(row.n);
}

/** Club feed: recent problems joined to the handle they were issued to. */
export function listFeed(limit = 40): (Problem & { handle: string })[] {
  const rows = getDb()
    .prepare(
      `SELECT p.*, pr.handle AS handle
         FROM problems p
         JOIN profiles pr ON pr.id = p.profile_id
        ORDER BY p.created_at DESC
        LIMIT ?`,
    )
    .all(limit) as unknown as (ProblemRow & { handle: string })[];
  return rows.map((r) => ({ ...rowToProblem(r), handle: r.handle }));
}
