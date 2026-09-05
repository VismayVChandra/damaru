"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DOMAINS } from "@/lib/catalog/domains";
import { MECHANICS } from "@/lib/catalog/blocks";
import { api } from "@/lib/client";
import type { FrictionRecord } from "@/lib/types";

const STATUS_LABEL: Record<FrictionRecord["status"], string> = {
  pending: "Waiting on review",
  accepted: "In the catalogue",
  rejected: "Not used",
};

export default function SubmitPage() {
  const [domainId, setDomainId] = useState("");
  const [actor, setActor] = useState("");
  const [text, setText] = useState("");
  const [mechanics, setMechanics] = useState<string[]>([]);

  const [mine, setMine] = useState<FrictionRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api<{ frictions: FrictionRecord[] }>("/api/frictions")
      .then(({ frictions }) => setMine(frictions))
      .catch(() => setMine([]));
  }, []);

  function toggleMechanic(id: string) {
    setMechanics((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const { friction } = await api<{ friction: FrictionRecord }>("/api/frictions", {
        method: "POST",
        body: JSON.stringify({ domainId, actor, text, mechanics }),
      });
      setMine((prev) => [friction, ...prev]);
      setDomainId("");
      setActor("");
      setText("");
      setMechanics([]);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit that.");
    } finally {
      setSaving(false);
    }
  }

  const missing: string[] = [];
  if (!domainId) missing.push("a domain");
  if (actor.trim().length < 3) missing.push("who feels it");
  if (text.trim().length < 20) missing.push("the friction itself (20+ characters)");
  if (mechanics.length === 0) missing.push("at least one way to answer it");
  const ready = missing.length === 0;

  return (
    <main className="shell shell-narrow">
      <div className="eyebrow">Contribute</div>
      <h1>Something that&apos;s actually broken.</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Every friction the generator draws from was written by one person guessing at what annoys
        people. The ones worth building against are the ones you have personally lived with.
      </p>

      <section className="card section">
        <h3>What makes a good one</h3>
        <p className="faint" style={{ fontSize: 13.5, marginTop: 6 }}>
          The test is whether someone would read it and wince.
        </p>
        <div className="stack" style={{ marginTop: 14, gap: 12 }}>
          <div className="example is-bad">
            <span className="mono">weak</span>
            <span>&ldquo;Data is siloed and hard to access.&rdquo;</span>
          </div>
          <div className="example is-good">
            <span className="mono">strong</span>
            <span>
              &ldquo;Their sample library is four thousand unlabelled WAV files, and finding the
              right kick means auditioning for an hour.&rdquo;
            </span>
          </div>
        </div>
        <p className="faint" style={{ fontSize: 13, marginTop: 14 }}>
          A strong friction names a person, a frequency, and a cost.
        </p>
      </section>

      <section className="card section stack" style={{ gap: 22 }}>
        <div>
          <label className="label" htmlFor="domain">
            Which domain does it belong to?
          </label>
          <div className="chip-wrap">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                type="button"
                className="chip"
                data-on={domainId === d.id ? "true" : "false"}
                onClick={() => setDomainId(d.id)}
              >
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="actor">
            Who feels it?
          </label>
          <input
            id="actor"
            className="input"
            value={actor}
            placeholder="a hostel mess committee"
            maxLength={120}
            onChange={(e) => setActor(e.target.value)}
          />
          <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
            A specific kind of person, lowercase, starting with “a” or “the”.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="text">
            What&apos;s broken?
          </label>
          <textarea
            id="text"
            className="textarea"
            value={text}
            maxLength={400}
            placeholder="attendance is guessed from a group chat and catering is over-ordered every single time"
            onChange={(e) => setText(e.target.value)}
          />
          <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
            Lowercase, no full stop. It has to read after “The problem: …”.{" "}
            <span className="mono">{text.trim().length}/400</span>
          </p>
        </div>

        <div>
          <label className="label">How could it be answered?</label>
          <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
            Pick every technical approach that would genuinely help. This is what stops the
            generator pairing your friction with something absurd.
          </p>
          <div className="chip-wrap">
            {MECHANICS.map((m) => (
              <button
                key={m.id}
                type="button"
                className="chip"
                data-on={mechanics.includes(m.id) ? "true" : "false"}
                onClick={() => toggleMechanic(m.id)}
                title={m.teaches}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="notice" style={{ marginTop: 20 }}>
          {error}
        </div>
      )}
      {sent && !error && (
        <div className="notice" style={{ marginTop: 20, borderColor: "var(--cool)", color: "var(--cool)" }}>
          Submitted. It goes live the moment it&apos;s accepted — no deploy needed.
        </div>
      )}

      <div className="row section" style={{ gap: 12 }}>
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={!ready || saving}>
          {saving ? "Submitting…" : "Submit friction"}
        </button>
        {!ready && (
          <span style={{ fontSize: 13, color: "var(--ember)" }}>
            Still needed: {missing.join(", ")}.
          </span>
        )}
      </div>

      {mine.length > 0 && (
        <section className="section">
          <h2>What you&apos;ve submitted</h2>
          <div className="stack" style={{ gap: 12, marginTop: 16 }}>
            {mine.map((f) => (
              <div key={f.id} className="card card-tight">
                <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                  <span className="chip chip-static">{f.domainId}</span>
                  <span className="status" data-s={f.status === "accepted" ? "shipped" : f.status === "rejected" ? "passed" : "new"}>
                    {STATUS_LABEL[f.status]}
                  </span>
                </div>
                <p style={{ marginTop: 10, fontSize: 14.5 }}>
                  <b>{f.actor}</b> — {f.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="muted section" style={{ fontSize: 14 }}>
        <Link href="/generate" style={{ color: "var(--ember)" }}>
          Back to generating
        </Link>
      </p>
    </main>
  );
}
