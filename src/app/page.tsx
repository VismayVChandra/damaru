import Link from "next/link";
import { countProblems, countProfiles, listAcceptedFrictions } from "@/lib/db";
import { combinationSpace, indexFrictions } from "@/lib/engine";
import { DOMAINS } from "@/lib/catalog/domains";
import { SKILLS } from "@/lib/catalog/skills";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "Say what you can actually do",
    body: "Pick your skills and mark each one honestly — still learning, comfortable, or strong. Honesty here is the whole point; overstating it gets you a problem you will abandon in week two.",
  },
  {
    n: "02",
    title: "Say what you actually care about",
    body: "Choose the domains you would happily read about on a Sunday. Interest is what carries a project through the boring middle, so it is weighted as heavily as skill.",
  },
  {
    n: "03",
    title: "Get a problem nobody else has",
    body: "Every problem is assembled from a real friction, a technical crux, a shipping format and a constraint that forces it somewhere non-obvious — then checked against your skills for doability and against everything ever issued for uniqueness.",
  },
];

export default async function Home() {
  const [profiles, problems, catalogue, user] = await Promise.all([
    countProfiles(),
    countProblems(),
    listAcceptedFrictions(),
    getCurrentUser(),
  ]);
  const space = combinationSpace(indexFrictions(catalogue));

  return (
    <main className="shell">
      <section style={{ paddingTop: 24, paddingBottom: 8 }}>
        <div className="eyebrow">Problems worth building</div>
        <h1 style={{ maxWidth: "16ch" }}>
          You don&apos;t need
          <br />
          another tutorial.
        </h1>
        <p className="lede" style={{ marginTop: 20 }}>
          You need a problem that is genuinely yours — hard enough to teach you something, close
          enough to your skills that you will actually finish it, and specific enough that nobody
          else in the club is building the same thing.
        </p>
        <div className="row" style={{ marginTop: 28, gap: 12 }}>
          <Link href={user ? "/generate" : "/signup"} className="btn btn-primary btn-lg">
            {user ? "Get a problem" : "Create an account"}
          </Link>
          <Link href="/browse" className="btn btn-lg">
            See what the club is building
          </Link>
        </div>
      </section>

      <hr className="divider" />

      <section className="grid-3">
        <div>
          <div className="stat">{space.toLocaleString()}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            distinct problems in the space
          </div>
        </div>
        <div>
          <div className="stat">{problems.toLocaleString()}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            issued so far, none of them twice
          </div>
        </div>
        <div>
          <div className="stat">{profiles.toLocaleString()}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            {profiles === 1 ? "person has a profile" : "people have profiles"}
          </div>
        </div>
        <div>
          <div className="stat">
            {catalogue.length}
            <span className="faint" style={{ fontSize: 15 }}>
              {" "}
              / {DOMAINS.length} / {SKILLS.length}
            </span>
          </div>
          <div className="faint" style={{ fontSize: 13 }}>
            frictions / domains / skills
          </div>
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <div className="grid-3" style={{ marginTop: 20 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="card">
              <div className="mono faint" style={{ fontSize: 12, marginBottom: 10 }}>
                {s.n}
              </div>
              <h3 style={{ marginBottom: 10 }}>{s.title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>What a problem is made of</h2>
        <p className="lede" style={{ marginTop: 12, fontSize: 16 }}>
          Generic project ideas fail because they stop at the noun. These do not.
        </p>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="stack">
            {[
              ["A real friction", "Not “build an app for music” but “four thousand unlabelled WAV files and an hour of auditioning to find one kick drum.”"],
              ["Someone specific", "A named kind of person who feels it weekly, so you have somebody to test with and argue with."],
              ["A technical crux", "The part that is actually interesting to build — matched to the categories of skill you have."],
              ["A shipping format", "Web app, CLI, bot, device, investigation. Chosen to fit your time and your team size."],
              ["A constraint", "Must work offline. Must cost nothing to run. Must be finishable one-handed in ten seconds. This is what stops it becoming another CRUD app."],
            ].map(([label, body]) => (
              <div key={label} className="row" style={{ alignItems: "flex-start", gap: 16 }}>
                <span
                  className="mono"
                  style={{
                    minWidth: 150,
                    fontSize: 12,
                    color: "var(--ember)",
                    paddingTop: 3,
                  }}
                >
                  {label}
                </span>
                <span className="muted" style={{ flex: 1, minWidth: 220, fontSize: 14.5 }}>
                  {body}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ textAlign: "center", padding: 36 }}>
          <h2>Ready?</h2>
          <p className="muted" style={{ maxWidth: "50ch", margin: "12px auto 22px" }}>
            Two minutes of honest self-assessment, and you walk away with something to build.
          </p>
          <Link href={user ? "/profile" : "/signup"} className="btn btn-primary btn-lg">
            Start
          </Link>
        </div>
      </section>
    </main>
  );
}
