/**
 * The admin funnel page, in the terminal.
 *
 *   node --import ./src/scripts/register-alias.mjs src/scripts/funnel-report.ts
 *
 * Same `buildFunnel()` the page calls, so the two can never disagree — this
 * only replaces the three reads that `db.ts` does, because that module is
 * `server-only` and cannot be imported outside Next. Needs `.env.local`.
 *
 * Exists for the same reason `audit-catalogue.ts` does: the numbers that
 * decide what to build next should be one command away, not behind a login.
 */
import { readFileSync, existsSync } from "node:fs";
import { buildFunnel, type FunnelSources } from "@/lib/funnel";
import { ARTIFACT_BY_ID, MECHANIC_BY_ID } from "@/lib/catalog/blocks";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import type { BuildLogKind, Problem, ProblemPayload } from "@/lib/types";

const envPath = ".env.local";
if (!existsSync(envPath)) {
  console.error("No .env.local — this one needs the database.");
  process.exitCode = 1;
}

const env = readFileSync(envPath, "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1].trim();

async function table<T>(path: string): Promise<T[]> {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key!, Authorization: `Bearer ${key!}` },
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json() as Promise<T[]>;
}

const [problemRows, logRows, profileRows] = await Promise.all([
  table<{
    id: string;
    profile_id: string;
    status: Problem["status"];
    created_at: string;
    status_changed_at: string | null;
    inspired_by_problem_id: string | null;
    payload: ProblemPayload;
  }>(
    "problems?select=id,profile_id,status,created_at,status_changed_at,inspired_by_problem_id,payload&limit=5000",
  ),
  table<{ problem_id: string; created_at: string; kind: BuildLogKind | null }>(
    "progress_entries?select=problem_id,created_at,kind&limit=5000",
  ),
  table<{ id: string; handle: string; created_at: string }>(
    "profiles?select=id,handle,created_at&limit=2000",
  ),
]);

const sources: FunnelSources = {
  problems: problemRows.map((r) => ({
    id: r.id,
    profileId: r.profile_id,
    status: r.status,
    createdAt: r.created_at,
    statusChangedAt: r.status_changed_at ?? null,
    isFork: Boolean(r.inspired_by_problem_id),
    domainId: r.payload?.dna?.domainId ?? "unknown",
    mechanicId: r.payload?.dna?.mechanicId ?? "unknown",
    artifactId: r.payload?.dna?.artifactId ?? "unknown",
    fitScore: r.payload?.fit?.score ?? 0,
    difficulty: r.payload?.fit?.difficulty ?? 0,
    estimate: r.payload?.fit?.estimate ?? "unrecorded",
  })),
  logs: logRows.map((r) => ({
    problemId: r.problem_id,
    createdAt: r.created_at,
    kind: r.kind ?? "progress",
  })),
  members: profileRows.map((r) => ({ id: r.id, handle: r.handle, createdAt: r.created_at })),
};

const report = buildFunnel(sources);

// `--json` prints the exact object the admin page receives, which is how the
// page gets checked against real numbers without an admin session.
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const bar = (share: number, width = 40) =>
  "█".repeat(Math.max(share > 0 ? 1 : 0, Math.round(share * width))).padEnd(width, "·");

function heading(s: string) {
  console.log(`\n${"=".repeat(74)}\n${s}\n${"=".repeat(74)}`);
}

heading("THE FUNNEL");
const top = report.stages[0]?.count ?? 0;
for (const s of report.stages) {
  const drop = s.ofPrevious === null ? "" : `  ${pct(s.ofPrevious)} of previous`;
  console.log(
    `  ${s.label.padEnd(10)} ${String(s.count).padStart(4)}  ${bar(top ? s.count / top : 0)}${drop}`,
  );
}

heading("EVIDENCE OF WORK");
const e = report.evidence;
console.log(`  committed projects          : ${e.committed}`);
console.log(
  `  ...with at least one log    : ${e.withLog}` +
    (e.committed ? `  (${pct(e.withLog / e.committed)})` : ""),
);
console.log(`  build-log entries, all time : ${e.logs}`);
console.log(`  median entries where any    : ${e.medianLogsPerLogged ?? "—"}`);
console.log(`  shipped with no log at all  : ${e.shippedWithoutLog}`);
if (e.logs === 0) {
  console.log(
    "\n  >> No build logs exist. The home feed, Project Radar, the weekly digest\n" +
      "     and the follow feed all read from this table. They are unsupplied,\n" +
      "     not underperforming.",
  );
}

heading("SHIPPED vs STALLED");
for (const c of [report.shipped, report.stalled]) {
  console.log(`  ${c.label}  (n=${c.n})`);
  console.log(`    median difficulty : ${c.medianDifficulty?.toFixed(1) ?? "—"} / 5`);
  console.log(`    median fit        : ${c.medianFit === null ? "—" : pct(c.medianFit)}`);
  for (const [est, n] of c.estimates) console.log(`      ${String(n).padStart(3)}× ${est}`);
}
if (report.shipped.n < 5 || report.stalled.n < 5) {
  console.log("\n  (small samples — a direction to check, not a result)");
}

heading("HOW BIG IS A TYPICAL BRIEF?");
for (const [est, n] of report.estimateMix) {
  const share = report.generatedTotal ? n / report.generatedTotal : 0;
  console.log(`  ${bar(share, 28)} ${String(n).padStart(4)} ${pct(share).padStart(4)}  ${est}`);
}

heading("DOES ANYONE COME BACK?");
console.log(`  members who generated at all     : ${report.returnRate.generatedAtAll}`);
console.log(`  came back on a different day     : ${report.returnRate.onMoreThanOneDay}`);
console.log(`  days since last generation       : ${report.daysSinceLastGeneration ?? "—"}`);
console.log(`  days since last build log        : ${report.daysSinceLastLog ?? "never"}`);
console.log(`  forks                            : ${report.forks}`);

heading("PER MEMBER");
console.log("  handle             gen  tri  kept  log  ship  days");
for (const m of report.members) {
  console.log(
    `  @${m.handle.padEnd(16)} ${String(m.generated).padStart(3)} ${String(m.triaged).padStart(4)} ` +
      `${String(m.committed).padStart(5)} ${String(m.logged).padStart(4)} ${String(m.shipped).padStart(5)} ` +
      `${String(m.activeDays).padStart(5)}`,
  );
}

heading("WHAT THE CATALOGUE ACTUALLY HANDED OUT");
const naming: [string, (id: string) => string, (typeof report.concentration)["artifacts"]][] = [
  ["Shipping format", (id) => ARTIFACT_BY_ID.get(id)?.label ?? id, report.concentration.artifacts],
  ["Technical crux", (id) => MECHANIC_BY_ID.get(id)?.label ?? id, report.concentration.mechanics],
  ["Domain", (id) => DOMAIN_BY_ID.get(id)?.label ?? id, report.concentration.domains],
];
for (const [title, name, c] of naming) {
  console.log(`\n  ${title} — leader ${pct(c.leaderShare)}, ${c.distinct} distinct`);
  for (const [id, n, share] of c.top) {
    console.log(`    ${bar(share, 20)} ${String(n).padStart(3)} ${pct(share).padStart(4)}  ${name(id)}`);
  }
}

console.log();
