"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";

const CATEGORY_COUNT = Object.keys(CATEGORY_LABELS).length;
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { api } from "@/lib/client";
import type { PairCandidate, RecurringGap } from "@/lib/pairing";

interface PairData {
  candidates: PairCandidate[];
  gap: RecurringGap | null;
  discoverable: boolean;
  pool: number;
}

export default function PairPage() {
  const [data, setData] = useState<PairData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "no-profile">("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<PairData>("/api/pair")
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch(() => setState("no-profile"));
  }, []);

  async function setDiscoverable(next: boolean) {
    if (!data) return;
    setSaving(true);
    const previous = data.discoverable;
    setData({ ...data, discoverable: next });
    try {
      // The profile endpoint needs the whole profile, so fetch and resend it
      // with just this field changed.
      const { profile } = await api<{ profile: Record<string, unknown> }>("/api/profile");
      await api("/api/profile", {
        method: "POST",
        body: JSON.stringify({ ...profile, discoverable: next }),
      });
    } catch {
      setData({ ...data, discoverable: previous });
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return (
      <main className="shell">
        <div className="empty">
          <span className="spin" />
        </div>
      </main>
    );
  }

  if (state === "no-profile" || !data) {
    return (
      <main className="shell shell-narrow">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>Build a profile first</h2>
          <p className="muted" style={{ maxWidth: "44ch", margin: "12px auto 22px" }}>
            Pairing works off what you can do and what you are missing, so it needs your skills
            before it can suggest anyone.
          </p>
          <Link href="/profile" className="btn btn-primary btn-lg">
            Build your profile
          </Link>
        </div>
      </main>
    );
  }

  const { candidates, gap, pool, discoverable } = data;
  const mutual = candidates.filter((c) => c.mutual);
  const oneWay = candidates.filter((c) => !c.mutual);

  return (
    <main className="shell">
      <div className="eyebrow">Pairing</div>
      <h1>Who covers what you don&apos;t</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Every problem you are issued already knows which skills it would stretch you on. This is
        that data pointed outward — not a ranking of anyone, just who complements whom.
      </p>

      {gap && (
        <section className="card section insight">
          <div className="block-label">A pattern in your problems</div>
          <p style={{ marginTop: 8, fontSize: 16.5, lineHeight: 1.55 }}>
            <b>{CATEGORY_LABELS[gap.category]}</b> has been the stretch in {gap.count} of your last{" "}
            {gap.total} problems.
          </p>
          <p className="muted" style={{ marginTop: 8, fontSize: 14.5 }}>
            That is not a verdict — it is the generator repeatedly noticing the same edge of what
            you do. Worth learning deliberately, or worth pairing with someone who already has it.
          </p>
        </section>
      )}

      {candidates.length === 0 ? (
        <div className="empty">
          {pool === 0 ? (
            <>
              <p>Nobody else has a profile yet.</p>
              <p className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>
                Pairing needs other people in it. Get a few club members signed up and this fills
                in on its own.
              </p>
            </>
          ) : (
            <>
              <p>No complements among the {pool} other {pool === 1 ? "person" : "people"} yet.</p>
              <p className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>
                That usually means everyone here has similar skills — which is worth knowing on its
                own.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {mutual.length > 0 && (
            <section className="section">
              <h2>You cover each other</h2>
              <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
                Both of you gain here. These are the pairings worth actually making.
              </p>
              <div className="grid-2" style={{ marginTop: 18 }}>
                {mutual.map((c) => (
                  <PairCard key={c.handle} candidate={c} />
                ))}
              </div>
            </section>
          )}

          {oneWay.length > 0 && (
            <section className="section">
              <h2>One-way cover</h2>
              <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
                Help runs in a single direction here. Still useful — just be honest that it is a
                favour rather than a trade.
              </p>
              <div className="grid-2" style={{ marginTop: 18 }}>
                {oneWay.map((c) => (
                  <PairCard key={c.handle} candidate={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="card section">
        <div className="row" style={{ justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3>Appear in other people&apos;s pairing</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
              {discoverable
                ? "You are listed as a possible collaborator. Only your handle and what you said you can do are shown — never your email."
                : "You are hidden. You can still see who complements you; they just will not see you."}
            </p>
          </div>
          <button
            className="btn"
            onClick={() => setDiscoverable(!discoverable)}
            disabled={saving}
          >
            {saving ? "Saving…" : discoverable ? "Hide me" : "List me"}
          </button>
        </div>
      </section>
    </main>
  );
}

function PairCard({ candidate }: { candidate: PairCandidate }) {
  // How much of the whole skill-category space this pairing covers between
  // the two of you - not a ranking of the person, just a width for the bar.
  const matchPct = Math.min(
    100,
    Math.round(((candidate.theyCover.length + candidate.youCover.length) / CATEGORY_COUNT) * 100),
  );

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
        <Link
          href={`/u/${candidate.handle}`}
          className="mono"
          style={{ fontSize: 14, fontWeight: 600, color: "inherit" }}
        >
          @{candidate.handle}
        </Link>
        {candidate.building > 0 && (
          <span className="chip chip-static" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>
            building {candidate.building}
          </span>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <span className="block-label" style={{ margin: 0 }}>
            Match
          </span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--good)" }}>
            {matchPct}%
          </span>
        </div>
        <div className="meter">
          <div className="meter-fill is-done" style={{ width: `${Math.max(4, matchPct)}%` }} />
        </div>
      </div>

      <div className="stack" style={{ gap: 14, marginTop: 16 }}>
        {candidate.theyCover.length > 0 && (
          <div>
            <div className="block-label">They cover for you</div>
            <div className="chip-wrap" style={{ marginTop: 7 }}>
              {candidate.theyCover.map((c) => (
                <span
                  key={c}
                  className="chip chip-static"
                  style={{ color: "var(--cool)", borderColor: "var(--cool)" }}
                >
                  {CATEGORY_LABELS[c]}
                </span>
              ))}
            </div>
          </div>
        )}

        {candidate.youCover.length > 0 && (
          <div>
            <div className="block-label">You cover for them</div>
            <div className="chip-wrap" style={{ marginTop: 7 }}>
              {candidate.youCover.map((c) => (
                <span key={c} className="chip chip-static">
                  {CATEGORY_LABELS[c]}
                </span>
              ))}
            </div>
          </div>
        )}

        {candidate.sharedInterests.length > 0 && (
          <div>
            <div className="block-label">Both care about</div>
            <div className="chip-wrap" style={{ marginTop: 7 }}>
              {candidate.sharedInterests.map((id) => {
                const d = DOMAIN_BY_ID.get(id);
                return d ? (
                  <span key={id} className="chip chip-static">
                    {d.icon} {d.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
