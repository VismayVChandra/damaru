"use client";

import { useCallback, useEffect, useState } from "react";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { MECHANIC_BY_ID } from "@/lib/catalog/blocks";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/activity";
import type { FrictionRecord } from "@/lib/types";

const TABS: FrictionRecord["status"][] = ["pending", "accepted", "rejected"];

interface FeedbackCounts {
  up: number;
  down: number;
}

export default function ReviewPage() {
  const [status, setStatus] = useState<FrictionRecord["status"]>("pending");
  const [frictions, setFrictions] = useState<FrictionRecord[]>([]);
  const [feedback, setFeedback] = useState<Record<string, FeedbackCounts>>({});
  const [issued, setIssued] = useState<Record<string, number>>({});
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback((next: FrictionRecord["status"]) => {
    setState("loading");
    api<{
      frictions: FrictionRecord[];
      feedback: Record<string, FeedbackCounts>;
      issued: Record<string, number>;
    }>(`/api/admin/frictions?status=${next}`)
      .then(({ frictions, feedback, issued }) => {
        setFrictions(frictions);
        setFeedback(feedback);
        setIssued(issued);
        setState("ready");
      })
      .catch(() => setState("denied"));
  }, []);

  useEffect(() => load(status), [status, load]);

  async function review(id: string, next: "accepted" | "rejected") {
    setBusy(id);
    try {
      await api(`/api/admin/frictions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setFrictions((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (state === "denied") {
    return (
      <main className="shell shell-narrow">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>Not an admin</h2>
          <p className="muted" style={{ maxWidth: "46ch", margin: "12px auto 0" }}>
            Reviewing submissions needs <code>is_admin</code> on your profile, which is set by hand
            in the database — deliberately, so it can never be granted through the app.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">Review</div>
      <h1>Friction submissions</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Accepting one puts it in the generator immediately — no deploy. Rejecting is not a
        judgement on the person, and the catalogue is better small and sharp than large and vague.
      </p>

      <div className="row section" style={{ gap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className="chip"
            data-on={status === t ? "true" : "false"}
            onClick={() => setStatus(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {state === "loading" ? (
        <div className="empty">
          <span className="spin" />
        </div>
      ) : frictions.length === 0 ? (
        <div className="empty">Nothing {status}.</div>
      ) : (
        <div className="stack section" style={{ gap: 14 }}>
          {frictions.map((f) => {
            const domain = DOMAIN_BY_ID.get(f.domainId);
            const tally = feedback[f.id];
            const timesIssued = issued[f.id] ?? 0;
            return (
              <div key={f.id} className="card">
                <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                  <span className="chip chip-static">
                    {domain ? `${domain.icon} ${domain.label}` : f.domainId}
                  </span>
                  <span className="row" style={{ gap: 10 }}>
                    {status === "accepted" && (
                      <span className="feedback-tally" title="How this friction has done since acceptance">
                        {tally && tally.up > 0 && <span className="tally-up">👍 {tally.up}</span>}
                        {tally && tally.down > 0 && <span className="tally-down">👎 {tally.down}</span>}
                        <span className="faint">{timesIssued} issued</span>
                      </span>
                    )}
                    <span className="faint mono" style={{ fontSize: 11.5 }}>
                      {f.submittedByHandle ? `@${f.submittedByHandle}` : "seeded"} ·{" "}
                      {timeAgo(f.createdAt)}
                    </span>
                  </span>
                </div>

                <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.6 }}>
                  <b>{f.actor}</b>
                  <span className="muted"> — {f.text}</span>
                </p>

                <div className="chip-wrap" style={{ marginTop: 14 }}>
                  {f.mechanics.map((m) => (
                    <span key={m} className="chip chip-static">
                      {MECHANIC_BY_ID.get(m)?.label ?? m}
                    </span>
                  ))}
                </div>

                {status === "pending" && (
                  <div className="row" style={{ marginTop: 16, gap: 10 }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => review(f.id, "accepted")}
                      disabled={busy === f.id}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => review(f.id, "rejected")}
                      disabled={busy === f.id}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
