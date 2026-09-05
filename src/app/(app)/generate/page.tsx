"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SwipeTriage from "@/components/SwipeTriage";
import { api } from "@/lib/client";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import type { Problem, Profile } from "@/lib/types";

const WAITING_LINES = [
  "Reading your skills…",
  "Looking for a friction worth solving…",
  "Checking it against everything already issued…",
  "Scoring it for doability…",
];

export default function GeneratePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  // Forces SwipeTriage to remount on each new batch, rather than trying to
  // reconcile a fresh problem list into an in-progress triage session.
  const [batch, setBatch] = useState(0);
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // The (app) layout has already confirmed we're signed in - here we only
  // need to know whether a profile has been created yet.
  useEffect(() => {
    api<{ profile: Profile | null }>("/api/me")
      .then(({ profile }) => setProfile(profile))
      .finally(() => setReady(true));
  }, []);

  // Cycle the waiting copy so a fast local response still reads as work done.
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setLine((i) => (i + 1) % WAITING_LINES.length), 550);
    return () => clearInterval(t);
  }, [loading]);

  async function generate() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    setLine(0);
    try {
      const { problems } = await api<{ problems: Problem[] }>("/api/generate", {
        method: "POST",
        body: JSON.stringify({ count }),
      });
      setProblems(problems);
      setBatch((b) => b + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="shell">
        <div className="empty">
          <span className="spin" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="shell shell-narrow">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>No profile yet</h2>
          <p className="muted" style={{ maxWidth: "44ch", margin: "12px auto 22px" }}>
            The generator needs to know what you can do and what you care about before it can hand
            you anything worth building.
          </p>
          <Link href="/profile" className="btn btn-primary btn-lg">
            Build your profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">Step two</div>
      <h1>Your problems</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Assembled for <b>@{profile.handle}</b> from {profile.skills.length}{" "}
        {profile.skills.length === 1 ? "skill" : "skills"} and{" "}
        {profile.interests.length}{" "}
        {profile.interests.length === 1 ? "interest" : "interests"}. Every one of these is issued
        exactly once, to you.
      </p>

      <div className="card section">
        <div className="row" style={{ justifyContent: "space-between", gap: 16 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="label" style={{ margin: 0 }}>
              How many
            </span>
            {[1, 3, 5].map((n) => (
              <button
                key={n}
                className="chip"
                data-on={count === n ? "true" : "false"}
                onClick={() => setCount(n)}
                disabled={loading}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link href="/profile" className="btn btn-sm">
              Edit profile
            </Link>
            <button className="btn btn-primary" onClick={generate} disabled={loading}>
              {loading ? (
                <>
                  <span className="spin" /> {WAITING_LINES[line]}
                </>
              ) : problems.length > 0 ? (
                "Generate more"
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>

        <div className="chip-wrap" style={{ marginTop: 16 }}>
          {profile.interests.map((id) => {
            const d = DOMAIN_BY_ID.get(id);
            return d ? (
              <span key={id} className="chip chip-static">
                {d.icon} {d.label}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {error && (
        <div className="notice" style={{ marginTop: 20 }}>
          {error}
        </div>
      )}

      {problems.length === 0 && !loading && !error && (
        <div className="empty">
          Hit generate. Nothing is written to the club feed until a problem is issued.
        </div>
      )}

      {problems.length > 0 && (
        <div className="section">
          <SwipeTriage key={batch} problems={problems} onGenerateAgain={generate} />
        </div>
      )}

      {problems.length > 0 && (
        <div className="row section" style={{ gap: 12, justifyContent: "center" }}>
          <Link href="/dashboard" className="btn btn-sm">
            See everything you have been given
          </Link>
        </div>
      )}
    </main>
  );
}
