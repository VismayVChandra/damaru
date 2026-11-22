/**
 * Measures whether the generator can actually produce varied, buildable
 * briefs - the thing real users said it could not.
 *
 *   node --import ./src/scripts/register-alias.mjs src/scripts/audit-catalogue.ts
 *
 * Static sections need nothing. If .env.local is present it also pulls the
 * friction catalogue and simulates real draws, which is the only way to get
 * "after" numbers: composed prose is frozen into each row at insert, so the
 * database can only ever tell you about briefs written by the old code.
 */
import { readFileSync, existsSync } from "node:fs";
import { ARTIFACTS, MECHANICS, TWISTS } from "@/lib/catalog/blocks";
import { DOMAINS } from "@/lib/catalog/domains";
import { MOODS } from "@/lib/catalog/moods";
import { categoryStrengths, isDoable, scoreFit } from "@/lib/engine/fit";
import { generateProblems, indexFrictions, type FrictionIndex } from "@/lib/engine";
import type { FrictionRecord, Profile, SkillCategory } from "@/lib/types";

const ok = (b: boolean) => (b ? "PASS" : "FAIL");
let failures = 0;
function gate(name: string, pass: boolean, detail: string) {
  if (!pass) failures++;
  console.log(`  [${ok(pass)}] ${name} — ${detail}`);
}

function heading(s: string) {
  console.log(`\n${"=".repeat(74)}\n${s}\n${"=".repeat(74)}`);
}

// --- Archetypes: the skill shapes we actually have to serve ----------------
function profileOf(id: string, skills: [string, 1 | 2 | 3][], interests: string[]): Profile {
  return {
    id,
    handle: id,
    displayName: id,
    bio: "",
    skills: skills.map(([s, level]) => ({ id: s, level })),
    interests,
    artifactPrefs: [],
    timeBudget: "twoweeks",
    teamSize: "solo",
    appetite: "stretch",
    isAdmin: false,
    discoverable: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

const ARCHETYPES: Record<string, Profile> = {
  "hardware-only": profileOf("hw", [["arduino", 2], ["cad", 2], ["robotics", 1], ["sensors", 2]], ["campus", "science"]),
  "hardware+mech": profileOf("hwm", [["arduino", 2], ["mech-cad", 2], ["mechanisms", 2], ["materials-sci", 1]], ["campus", "science"]),
  software: profileOf("sw", [["html-css", 2], ["postgres", 2], ["python-web", 2], ["javascript", 2]], ["education", "music"]),
  mixed: profileOf("mx", [["arduino", 2], ["python-web", 2], ["pandas", 1], ["cad", 1]], ["climate", "campus"]),
};

// --- 1. Catalogue shape -----------------------------------------------------
heading("1. CATALOGUE SHAPE");
const edges = MECHANICS.reduce((n, m) => n + m.artifacts.length, 0);
console.log(`  mechanics ${MECHANICS.length} · artifacts ${ARTIFACTS.length} · twists ${TWISTS.length} · domains ${DOMAINS.length} · edges ${edges}`);

const CATEGORIES = [...new Set(MECHANICS.flatMap((m) => m.requires))].sort();
console.log("\n  how much of the catalogue each skill category unlocks:");
console.log("  " + "category".padEnd(16) + "mechanics  artifacts  reachable edges");
const unlock: Record<string, number> = {};
for (const c of CATEGORIES) {
  const ms = MECHANICS.filter((m) => m.requires.includes(c));
  const as = ARTIFACTS.filter((a) => a.requires.includes(c));
  const e = ms.reduce((n, m) => n + m.artifacts.length, 0);
  unlock[c] = e;
  console.log(`  ${c.padEnd(16)}${String(ms.length).padStart(6)}${String(as.length).padStart(11)}${String(e).padStart(17)}`);
}
// Only categories somebody actually holds. Disciplines with no members in the
// club (chemical, aerospace, civil) are thin on purpose - the goal was never
// per-discipline parity, it was that no skill anyone has is a dead end.
const held = [...new Set(Object.values(ARCHETYPES).flatMap((p) => p.skills.map((s) => s.id)))];
const heldCategories = [...new Set(CATEGORIES.filter((c) => MECHANICS.some((m) => m.requires.includes(c))))].filter(
  (c) => ["hardware", "mechanical", "electrical", "data", "backend", "frontend", "systems", "design", "ml"].includes(c),
);
const heldUnlocks = heldCategories.map((c) => unlock[c]);
const spread = Math.max(...heldUnlocks) / Math.max(1, Math.min(...heldUnlocks));
gate(
  "parity among categories people hold",
  spread <= 6,
  `${heldCategories.length} held categories, widest:narrowest ${spread.toFixed(1)}:1 (want <= 6:1); ${held.length} distinct skills across archetypes`,
);

// --- 2. What each archetype can actually build ------------------------------
heading("2. BUILDABLE COMBOS PER ARCHETYPE  (the 52%-device root cause)");
for (const [name, profile] of Object.entries(ARCHETYPES)) {
  const strengths = categoryStrengths(profile);
  const doable: { label: string; score: number }[] = [];
  for (const m of MECHANICS) {
    for (const aid of m.artifacts) {
      const a = ARTIFACTS.find((x) => x.id === aid);
      if (!a) continue;
      const fit = scoreFit(profile, strengths, m, a);
      if (isDoable(fit)) doable.push({ label: `${m.id}+${a.id}`, score: fit.score });
    }
  }
  doable.sort((x, y) => y.score - x.score);
  const top = doable.slice(0, 3).map((d) => `${d.label} ${d.score.toFixed(2)}`).join(", ");
  const gap = doable.length > 1 ? doable[0].score - doable[1].score : 0;
  console.log(`  ${name.padEnd(16)} ${String(doable.length).padStart(3)} of ${edges} combos | gap to 2nd ${gap.toFixed(2)} | ${top}`);
  gate(`${name} has real choice`, doable.length >= 20, `${doable.length} buildable combos (want >= 20)`);
  gate(`${name} has no runaway favourite`, gap <= 0.15, `best beats second by ${gap.toFixed(2)} (want <= 0.15)`);
}

// --- 3. Mood feasibility ----------------------------------------------------
heading("3. MOOD FEASIBILITY  (a mood with no candidates is a dead button)");
console.log("  " + "archetype".padEnd(16) + MOODS.map((m) => m.id.padStart(11)).join(""));
for (const [name, profile] of Object.entries(ARCHETYPES)) {
  const strengths = categoryStrengths(profile);
  const counts = MOODS.map((mood) => {
    let n = 0;
    for (const m of MECHANICS) {
      for (const aid of m.artifacts) {
        const a = ARTIFACTS.find((x) => x.id === aid);
        if (!a) continue;
        const fit = scoreFit(profile, strengths, m, a);
        if (isDoable(fit) && mood.matches(m, a, fit)) n++;
      }
    }
    return n;
  });
  console.log(`  ${name.padEnd(16)}` + counts.map((c) => String(c).padStart(11)).join(""));
  // A pure software profile having nothing under "something physical" is
  // correct, not a bug - the mood then falls back and says so. What matters is
  // that most moods work, so the picker isn't decorative.
  const usable = counts.filter((c) => c > 0).length;
  gate(`${name}: moods mostly usable`, usable >= MOODS.length - 1, `${usable} of ${MOODS.length} moods have candidates`);
}

// --- 4. Twist availability by artifact --------------------------------------
heading("4. TWIST POOL PER ARTIFACT");
const thin: string[] = [];
for (const a of ARTIFACTS) {
  const n = TWISTS.filter((t) => !(t.excludeArtifacts ?? []).includes(a.id)).length;
  if (n < TWISTS.length) thin.push(`${a.id}:${n}`);
}
console.log(`  full pool ${TWISTS.length}; reduced for: ${thin.join(", ") || "none"}`);
const worst = Math.min(...ARTIFACTS.map((a) => TWISTS.filter((t) => !(t.excludeArtifacts ?? []).includes(a.id)).length));
gate("no artifact is starved of constraints", worst >= 14, `thinnest artifact has ${worst} twists (want >= 14)`);

// --- 5. Prose lints ---------------------------------------------------------
heading("5. PROSE LINTS");
const reqs = MECHANICS.map((m) => m.requirement);
const realNot = reqs.filter((r) => /\breal\b[^.]*\bnot\b/i.test(r) || /\bnot (just|merely|a vague)\b/i.test(r));
gate("R1 one-voice monoculture", realNot.length <= 3, `${realNot.length} of ${reqs.length} requirements use "real X, not Y" (want <= 3)`);

const shingles = new Map<string, number>();
for (const r of reqs) {
  const w = r.toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/);
  for (let i = 0; i + 2 < w.length; i++) {
    const k = w.slice(i, i + 3).join(" ");
    shingles.set(k, (shingles.get(k) ?? 0) + 1);
  }
}
const overused = [...shingles.entries()].filter(([, n]) => n > 2).sort((a, b) => b[1] - a[1]);
gate("R1b no shared phrasing", overused.length === 0, overused.length ? `${overused.length} 3-word phrases repeat >2x, worst: "${overused[0][0]}" ×${overused[0][1]}` : "no 3-word phrase repeats more than twice");

const byHand = MECHANICS.filter((m) => /\b(by hand|on paper|before (opening|touching))\b/i.test(m.firstMove));
gate("R2 firstMove variety", byHand.length <= 4, `${byHand.length} of ${MECHANICS.length} say "by hand / on paper" (want <= 4)`);
const verbs = new Set(MECHANICS.map((m) => m.firstMove.split(/\s+/)[0].toLowerCase()));
gate("R2b distinct opening verbs", verbs.size >= 8, `${verbs.size} distinct (want >= 8)`);

const syllabus = MECHANICS.filter((m) => !/\byou\b/i.test(m.teaches) || /,[^,]+,[^,]+ and /.test(m.teaches));
gate("R3 teaches is not a syllabus", syllabus.length === 0, `${syllabus.length} of ${MECHANICS.length} are outcome-lists without "you"`);

// --- 6. Friction coverage + simulated draws (needs .env.local) --------------
heading("6. FRICTION COVERAGE AND SIMULATED DRAWS");
const envPath = ".env.local";
if (!existsSync(envPath)) {
  console.log("  (skipped — no .env.local, static sections only)");
} else {
  const env = readFileSync(envPath, "utf8");
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1].trim();
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1].trim();
  const rows: FrictionRecord[] = await fetch(
    `${url}/rest/v1/frictions?select=id,domain_id,actor,text,mechanics,status&status=eq.accepted&limit=2000`,
    { headers: { apikey: key!, Authorization: `Bearer ${key!}` } },
  )
    .then((r) => r.json())
    .then((rs: Record<string, unknown>[]) =>
      rs.map((r) => ({
        id: r.id as string,
        domainId: r.domain_id as string,
        actor: r.actor as string,
        text: r.text as string,
        mechanics: r.mechanics as string[],
        status: "accepted" as const,
        submittedBy: null,
        createdAt: "",
        reviewedAt: null,
      })),
    );

  const named = new Map<string, number>();
  for (const f of rows) for (const m of f.mechanics) named.set(m, (named.get(m) ?? 0) + 1);
  const orphans = MECHANICS.filter((m) => !named.get(m.id));
  const thinM = MECHANICS.filter((m) => (named.get(m.id) ?? 0) > 0 && (named.get(m.id) ?? 0) < 8);
  console.log(`  ${rows.length} accepted frictions`);
  gate("no orphan mechanics", orphans.length === 0, orphans.length ? `undrawable: ${orphans.map((m) => m.id).join(", ")}` : "every mechanic is named by at least one friction");
  gate("no starved mechanics", thinM.length === 0, thinM.length ? `${thinM.length} named by <8 frictions: ${thinM.slice(0, 6).map((m) => `${m.id}(${named.get(m.id)})`).join(", ")}` : "all mechanics have >= 8 frictions");

  const avgPhysical = (() => {
    const phys = rows.filter((f) => f.mechanics.every((m) => MECHANICS.find((x) => x.id === m)?.requires.some((c) => c !== "frontend" && ["hardware", "mechanical", "electrical", "civil", "chemical", "aerospace", "biomedical", "environmental", "industrial"].includes(c))));
    return phys.length ? phys.reduce((s, f) => s + f.mechanics.length, 0) / phys.length : 0;
  })();
  gate("physical frictions offer a choice", avgPhysical >= 2, `physical frictions name ${avgPhysical.toFixed(2)} mechanics on average (want >= 2)`);

  // Simulate real draws per archetype.
  const index: FrictionIndex = indexFrictions(rows);
  console.log("\n  simulated draws (20 batches of 3 per archetype):");
  for (const [name, profile] of Object.entries(ARCHETYPES)) {
    const seen = new Set<string>();
    const titles: string[] = [];
    const arts = new Map<string, number>();
    const mechs = new Set<string>();
    const frictionsUsed = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const batch = generateProblems(profile, {
        frictions: index,
        count: 3,
        excludeFingerprints: seen,
        seed: `${name}:${i}`,
      });
      for (const p of batch) {
        seen.add(p.fingerprint);
        titles.push(p.title);
        arts.set(p.dna.artifactId, (arts.get(p.dna.artifactId) ?? 0) + 1);
        mechs.add(p.dna.mechanicId);
        if (p.dna.frictionId) frictionsUsed.add(p.dna.frictionId);
      }
    }
    const openings = titles.map((t) => t.split(/\s+/).slice(0, 4).join(" "));
    const freq = new Map<string, number>();
    for (const o of openings) freq.set(o, (freq.get(o) ?? 0) + 1);
    // Distinct openings over total, not "how many share with anyone" - the
    // latter counts both halves of every pair, so a set where the worst
    // opening appears three times out of sixty still scores badly.
    const distinct = freq.size;
    const distinctRate = titles.length ? distinct / titles.length : 0;
    const maxRepeat = Math.max(0, ...freq.values());
    const topArt = [...arts.entries()].sort((a, b) => b[1] - a[1])[0];
    const artShare = topArt ? topArt[1] / titles.length : 0;

    const distinctRatio = freq.size / Math.max(1, titles.length);
    const worst = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log(`\n  ${name}: ${titles.length} briefs · ${freq.size} distinct openings (${(distinctRatio * 100).toFixed(0)}%)`);
    console.log(`         most repeated: ${worst.map(([o, n]) => `"${o}" ×${n}`).join(" | ")}`);
    gate(`${name} title variety`, distinctRate >= 0.7, `${(distinctRate * 100).toFixed(0)}% of openings are distinct (want >= 70%)`);
    gate(`${name} no dominant opening`, maxRepeat <= titles.length * 0.08, `most repeated opening appears ${maxRepeat}x in ${titles.length} (want <= ${Math.floor(titles.length * 0.08)})`);
    // A profile with skills in exactly one category will concentrate somewhat
    // whatever the sampler does - devices really are most of what you can
    // build with only hardware skills. 35% is the line between "concentrated
    // because of who you are" and the 52% runaway this started at.
    gate(`${name} artifact spread`, artShare < 0.35, `most common artifact "${topArt?.[0]}" is ${(artShare * 100).toFixed(0)}% (want < 35%)`);
    gate(`${name} mechanic coverage`, mechs.size >= 8, `${mechs.size} distinct mechanics drawn`);
    console.log(`         frictions reached: ${frictionsUsed.size} of ${rows.length}`);
  }
}

heading(failures === 0 ? "ALL GATES PASS" : `${failures} GATE${failures === 1 ? "" : "S"} FAILING`);
// Set the code rather than calling process.exit, which tears down the fetch
// keepalive socket mid-flight and trips a libuv assertion on Windows.
process.exitCode = failures === 0 ? 0 : 1;
