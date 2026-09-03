"use client";

import { useState } from "react";
import type { Problem } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";
import { api } from "@/lib/client";

const STATUS_FLOW: Problem["status"][] = ["new", "saved", "building", "shipped", "passed"];
const STATUS_LABEL: Record<Problem["status"], string> = {
  new: "New",
  saved: "Saved",
  building: "Building",
  shipped: "Shipped",
  passed: "Passed",
};

function FitMeter({ fit }: { fit: Problem["fit"] }) {
  const pct = Math.round(fit.score * 100);
  return (
    <div style={{ minWidth: 170 }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", gap: 8, marginBottom: 6 }}
      >
        <span className="block-label" style={{ margin: 0 }}>
          Fit for you
        </span>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
          {pct}%
        </span>
      </div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  );
}

function Difficulty({ level }: { level: number }) {
  return (
    <div>
      <div className="block-label" style={{ marginBottom: 6 }}>
        Difficulty
      </div>
      <div className="row" style={{ gap: 7 }}>
        <span className="pips">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="pip" data-on={i <= level ? "true" : "false"} />
          ))}
        </span>
        <span className="faint" style={{ fontSize: 12.5 }}>
          {["", "gentle", "steady", "real work", "hard", "ambitious"][level]}
        </span>
      </div>
    </div>
  );
}

export default function ProblemCard({
  problem,
  interactive = false,
}: {
  problem: Problem;
  interactive?: boolean;
}) {
  const [status, setStatus] = useState<Problem["status"]>(problem.status);
  const [notes, setNotes] = useState(problem.notes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  async function changeStatus(next: Problem["status"]) {
    const previous = status;
    setStatus(next);
    try {
      await api(`/api/problems/${problem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
    } catch {
      setStatus(previous);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await api(`/api/problems/${problem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
    } finally {
      setSavingNotes(false);
    }
  }

  const covered = problem.fit.covered.flatMap((c) => c.via);
  const growing = [...problem.fit.stretch, ...problem.fit.gaps].map(
    (c) => CATEGORY_LABELS[c],
  );

  return (
    <article className="problem">
      <header className="problem-head">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="chip chip-static">
            {problem.domainIcon} {problem.domainLabel}
          </span>
          <span className="status" data-s={status}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <h2 className="problem-title">{problem.title}</h2>
      </header>

      <div className="problem-body">
        {problem.caveat && (
          <div className="notice" style={{ marginBottom: 18 }}>
            <b>Heads up.</b> {problem.caveat}
          </div>
        )}

        <p className="problem-hook">{problem.hook}</p>

        <div className="block">
          <div className="block-label">The problem</div>
          <p>{problem.statement}</p>
        </div>

        <div
          className="card card-tight"
          style={{ background: "var(--panel-2)", marginBottom: 20 }}
        >
          <div className="row" style={{ gap: 28, alignItems: "flex-start" }}>
            <FitMeter fit={problem.fit} />
            <Difficulty level={problem.fit.difficulty} />
            <div>
              <div className="block-label" style={{ marginBottom: 6 }}>
                Realistic effort
              </div>
              <div style={{ fontSize: 14 }}>{problem.fit.estimate}</div>
            </div>
          </div>

          <hr className="divider" style={{ margin: "16px 0" }} />

          <div className="row" style={{ gap: 20, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="block-label" style={{ marginBottom: 7 }}>
                You already have
              </div>
              <div className="chip-wrap">
                {covered.length > 0 ? (
                  covered.map((label) => (
                    <span key={label} className="chip chip-static">
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="faint" style={{ fontSize: 13 }}>
                    Nothing fully covered — this is a stretch across the board.
                  </span>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="block-label" style={{ marginBottom: 7 }}>
                You will be growing into
              </div>
              <div className="chip-wrap">
                {growing.length > 0 ? (
                  growing.map((label) => (
                    <span
                      key={label}
                      className="chip chip-static"
                      style={{ color: "var(--cool)", borderColor: "var(--cool)" }}
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="faint" style={{ fontSize: 13 }}>
                    The stretch is in the constraint, not the stack.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="block">
          <div className="block-label">Why this landed on you</div>
          <p className="muted">{problem.whyYou}</p>
        </div>

        <div className="block">
          <div className="block-label">Must do</div>
          <ul className="checklist">
            {problem.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="block">
          <div className="block-label">Done means</div>
          <ul className="checklist checklist-cool">
            {problem.successCriteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="grid-2">
          <div className="block">
            <div className="block-label">Where the data comes from</div>
            <ul className="checklist">
              {problem.signals.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="block">
            <div className="block-label">What you will learn</div>
            <p className="muted" style={{ fontSize: 14.5 }}>
              {problem.skillStretch}
            </p>
          </div>
        </div>

        <details className="block">
          <summary
            style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 14 }}
          >
            If you finish early — {problem.stretchGoals.length} ways to go further
          </summary>
          <ul className="checklist" style={{ marginTop: 12 }}>
            {problem.stretchGoals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </details>
      </div>

      <footer className="problem-foot">
        <span className="fingerprint" title="Globally unique — no one else has this problem">
          #{problem.fingerprint}
        </span>
        <span className="nav-spacer" />
        {interactive && (
          <>
            {STATUS_FLOW.filter((s) => s !== status).map((s) => (
              <button key={s} className="btn btn-sm" onClick={() => changeStatus(s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
            <button className="btn btn-sm" onClick={() => setShowNotes((v) => !v)}>
              {showNotes ? "Hide notes" : notes ? "Notes ✓" : "Notes"}
            </button>
          </>
        )}
      </footer>

      {interactive && showNotes && (
        <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)" }}>
          <label className="label" htmlFor={`notes-${problem.id}`}>
            Your notes
          </label>
          <textarea
            id={`notes-${problem.id}`}
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Decisions, dead ends, what you'd do differently..."
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-sm btn-primary" onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? "Saving..." : "Save notes"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
