# Damaru

A website where people upload their skills and interests, and get back a project
problem statement that is **specific to them**, **doable with what they know**, and
**never issued to anyone else**.

Next.js + TypeScript, SQLite, zero paid services.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The database creates itself at `data/damaru.db` on
first run — there is nothing to provision, migrate or sign up for.

```bash
npm run build && npm start
```

Requires **Node 22.5+** (24 recommended). The database is Node's built-in
`node:sqlite`, so there is no native module to compile — which matters on Windows.

---

## What it costs to run

Nothing. There is no API key, no paid service, no always-on worker. The generator
is a local combinatorial engine, and the database is a file. Deploying it costs
whatever your host charges for a small Node process — free on most.

---

## How the generator works

Most "project idea generators" stop at a noun: *build an app for music*. That
produces ideas nobody finishes, because there is no user, no crux, and no
constraint. Damaru assembles every problem from six bound parts:

| Part | What it contributes | Lives in |
|---|---|---|
| **Domain** | The area the person cares about | `catalog/domains.ts` |
| **Actor** | A specific kind of person who feels the pain | bound to each friction |
| **Friction** | A concrete, unglamorous, recurring annoyance | bound to each domain |
| **Mechanic** | The technical crux — what's actually interesting to build | `catalog/blocks.ts` |
| **Artifact** | The shipping format: web app, CLI, bot, device, investigation | `catalog/blocks.ts` |
| **Twist** | A constraint that forces it somewhere non-obvious | `catalog/blocks.ts` |

**The parts are bound, not sampled independently.** Each friction names the actor
who feels it and the mechanics that could plausibly answer it; each mechanic names
the artifact shapes it can sensibly ship as. Sampling those freely is how a
generator ends up proposing a playable game to fix a timetable clash — coherent
grammar, nonsense content. The bindings are the difference.

The valid space is currently **40,592 distinct problems**. The landing page counts
it from the catalogue itself (`combinationSpace()`), so the number stays honest as
you add content.

### Doability

Skills collapse into per-category strengths (`engine/fit.ts`). Each candidate is
scored on how much of what it needs the person already has:

- **≥ 0.75** in a category → *covered*
- **> 0** but below that → *stretch*
- **0** → *gap*

A candidate is rejected below **0.34 fit** or with **more than one gap** — below
that line you spend the whole project fighting tools rather than the problem.
Everything surviving is ranked by distance from the person's stated appetite:

| Appetite | Target fit |
|---|---|
| Play to my strengths | 0.86 |
| Stretch me | 0.68 |
| Throw me in | 0.52 |

Difficulty and the effort estimate are computed **relative to this person**, not in
the abstract — the same problem is a weekend for one profile and a term for another.

### When nothing clears the bar

A narrow profile can have an *empty* intersection between "mechanics these
frictions allow" and "mechanics this person can build" — four hardware skills
against two software-shaped interests, for instance. Returning nothing there is
the wrong answer, so `RELAXATIONS` in `engine/index.ts` lowers the bar a step at a
time and says so on the card:

| Tier | Bar | Domains | Card shows |
|---|---|---|---|
| 1 | fit ≥ 0.34, ≤ 1 gap | chosen only | nothing — normal result |
| 2 | fit ≥ 0.24, ≤ 2 gaps | chosen only | "bigger stretch than you asked for" |
| 3 | fit ≥ 0.34, ≤ 1 gap | all | "outside the interests you picked" |
| 4 | fit ≥ 0.12, ≤ 3 gaps | all | "well outside both" |

It stops at the strictest tier that fills the request, so a well-matched profile
never sees a caveat. An empty page is now only possible when every combination
that fits has already been issued — which the error message says explicitly.

### Uniqueness

Every problem's DNA hashes to a 64-bit `fingerprint`, which is `UNIQUE` in the
database. Generation excludes every fingerprint ever issued to anyone, and the
unique index is the final arbiter if two requests race. No two people in the club
can ever be handed the same problem.

---

## Project structure

```
src/
  app/
    page.tsx              landing
    profile/              skills, interests, constraints
    generate/             draw new problems
    dashboard/            your problems + status + notes
    browse/               club feed
    api/
      profile/            GET ?handle= , POST upsert
      generate/           POST { handle, count }
      problems/           GET ?handle= (yours) or recent
      problems/[id]/      PATCH { status, notes }
      stats/              GET counts
  lib/
    types.ts              shared domain types
    db.ts                 node:sqlite schema + queries
    catalog/
      skills.ts           73 skills across 11 categories
      domains.ts          18 domains, 144 actor-bound frictions
      blocks.ts           22 mechanics, 12 artifacts, 16 twists
    engine/
      index.ts            candidate selection  <- the LLM seam
      fit.ts              doability scoring
      compose.ts          prose composition
      novelty.ts          fingerprinting + seeded RNG
  components/
    Nav.tsx  ProblemCard.tsx
```

---

## Extending it

Nearly all the quality lives in the catalogue, not the code.

**Add a domain** — append to `DOMAINS` in `catalog/domains.ts`. Each friction needs
an `actor`, a lowercase clause `text` that reads after "…so that it is no longer
true that", and `mechanics` listing the mechanic ids that could answer it.

**Add a mechanic** — append to `MECHANICS` in `catalog/blocks.ts`, list the
`artifacts` it can ship as, the skill categories it `requires`, and add a short
imperative to `MECHANIC_ACTION` in `engine/compose.ts` (it becomes the title).

**Add a twist** — append to `TWISTS`. This is the cheapest way to multiply the
space: each new twist multiplies every existing combination.

Writing frictions is the real work. The test is whether a specific person would
read it and wince. "Data is siloed" fails. "Their sample library is four thousand
unlabelled WAV files and finding the right kick means auditioning for an hour"
passes.

### Swapping in an LLM later

`generateProblems()` in `src/lib/engine/index.ts` is the only seam. Everything
downstream consumes `GeneratedProblem[]`, so a model-backed implementation is a
one-file change — keep `fit.ts` for scoring and `novelty.ts` for the uniqueness
guarantee, and let the model do composition. Not needed today; the offline engine
is the product.

---

## Known limitations

**There is no authentication.** Identity is a handle stored in `localStorage`, and
the API trusts whatever handle it is sent. Anyone who knows a handle can edit that
profile and its problems. That is a deliberate trade for a club-internal tool and
it is **not** safe on the open internet — put real auth in front of it before
exposing it publicly.

**SQLite is single-writer.** Fine for a club; it is not the shape for thousands of
concurrent users. WAL mode is on, which is enough headroom for the intended scale.

**`data/damaru.db` is gitignored.** It is real state — back it up if the club's
problem history matters to you.
