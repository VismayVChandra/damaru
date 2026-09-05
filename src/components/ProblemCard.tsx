"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Checklist, Problem, ProgressEntry } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";
import { checklistProgress, idleDays, timeAgo } from "@/lib/activity";
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
    <div style={{ minWidth: 150 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
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

function DoneMeter({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ minWidth: 150 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span className="block-label" style={{ margin: 0 }}>
          Done
        </span>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
          {done}/{total}
        </span>
      </div>
      <div className="meter">
        <div className="meter-fill is-done" style={{ width: `${Math.max(pct === 0 ? 0 : 4, pct)}%` }} />
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
  const [feedback, setFeedbackState] = useState<Problem["feedback"]>(problem.feedback ?? null);
  const [checklist, setChecklist] = useState<Checklist>(problem.checklist ?? {});
  // Ticking two boxes quickly would otherwise build both updates from the same
  // render's `checklist`, and the second write would drop the first.
  const latestChecklist = useRef<Checklist>(problem.checklist ?? {});
  const [progress, setProgress] = useState<ProgressEntry[]>(problem.progress ?? []);
  const [notes, setNotes] = useState(problem.notes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [draft, setDraft] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const done = checklistProgress(problem, checklist);
  const idle = idleDays({ ...problem, status, progress });

  async function setFeedback(next: Problem["feedback"]) {
    // Clicking the already-active thumb clears it - there is no third state
    // to cycle through, just on/off for each direction.
    const value = feedback === next ? null : next;
    const previous = feedback;
    setFeedbackState(value);
    try {
      await api(`/api/problems/${problem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ feedback: value }),
      });
    } catch {
      setFeedbackState(previous);
    }
  }

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

  async function toggle(key: string) {
    const previous = latestChecklist.current;
    const next = { ...previous };
    if (next[key]) delete next[key];
    else next[key] = true;

    latestChecklist.current = next;
    setChecklist(next);
    try {
      await api(`/api/problems/${problem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ checklist: next }),
      });
    } catch {
      latestChecklist.current = previous;
      setChecklist(previous);
    }
  }

  async function logProgress() {
    const body = draft.trim();
    if (!body) return;
    setLogging(true);
    setLogError(null);
    try {
      const { entry } = await api<{ entry: ProgressEntry }>(
        `/api/problems/${problem.id}/progress`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setProgress((prev) => [entry, ...prev]);
      setDraft("");
    } catch (e) {
      setLogError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setLogging(false);
    }
  }

  const covered = problem.fit.covered.flatMap((c) => c.via);
  const growing = [...problem.fit.stretch, ...problem.fit.gaps].map((c) => CATEGORY_LABELS[c]);

  function CheckList({ items, prefix }: { items: string[]; prefix: "req" | "success" }) {
    return (
      <ul className="checklist" data-tone={prefix === "success" ? "cool" : "ember"}>
        {items.map((text, i) => {
          const key = `${prefix}:${i}`;
          const isDone = Boolean(checklist[key]);
          if (!interactive) {
            return (
              <li key={key} data-done={isDone ? "true" : "false"}>
                <span className="check-box" data-done={isDone ? "true" : "false"} aria-hidden="true" />
                <span>{text}</span>
              </li>
            );
          }
          return (
            <li key={key} data-done={isDone ? "true" : "false"}>
              <button
                type="button"
                className="check-btn"
                onClick={() => toggle(key)}
                aria-pressed={isDone}
              >
                <span className="check-box" data-done={isDone ? "true" : "false"} aria-hidden="true" />
                <span>{text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <article className="problem">
      <header className="problem-head">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="chip chip-static">
            {problem.domainIcon} {problem.domainLabel}
          </span>
          <span className="row" style={{ gap: 8 }}>
            {idle !== null && (
              <span className="chip chip-static is-idle" title="No progress logged recently">
                {idle}d without movement
              </span>
            )}
            <span className="status" data-s={status}>
              {STATUS_LABEL[status]}
            </span>
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

        <div className="card card-tight" style={{ background: "var(--panel-2)", marginBottom: 20 }}>
          <div className="meter-grid">
            <FitMeter fit={problem.fit} />
            <DoneMeter done={done.done} total={done.total} />
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
              {interactive && growing.length > 0 && (
                <Link href="/pair" className="pair-hint">
                  Find someone who covers {growing[0].toLowerCase()} &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="block">
          <div className="block-label">Why this landed on you</div>
          <p className="muted">{problem.whyYou}</p>
        </div>

        <div className="block">
          <div className="block-label">
            Must do {interactive && <span className="faint">— tick these off as you go</span>}
          </div>
          <CheckList items={problem.requirements} prefix="req" />
        </div>

        <div className="block">
          <div className="block-label">Done means</div>
          <CheckList items={problem.successCriteria} prefix="success" />
        </div>

        <div className="grid-2">
          <div className="block">
            <div className="block-label">Where the data comes from</div>
            <ul className="checklist is-plain">
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
          <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 14 }}>
            If you finish early — {problem.stretchGoals.length} ways to go further
          </summary>
          <ul className="checklist is-plain" style={{ marginTop: 12 }}>
            {problem.stretchGoals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </details>

        {(interactive || progress.length > 0) && (
          <div className="block log">
            <div className="block-label">
              Progress log {progress.length > 0 && <span className="faint">— {progress.length}</span>}
            </div>

            {interactive && (
              <div className="log-compose">
                <input
                  className="input"
                  value={draft}
                  placeholder="What moved? One line is enough."
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && draft.trim()) logProgress();
                  }}
                  disabled={logging}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={logProgress}
                  disabled={logging || !draft.trim()}
                >
                  {logging ? "Saving…" : "Log it"}
                </button>
              </div>
            )}

            {logError && (
              <p style={{ color: "var(--ember)", fontSize: 13, marginTop: 8 }}>{logError}</p>
            )}

            {progress.length === 0 ? (
              <p className="faint" style={{ fontSize: 13.5, marginTop: 10 }}>
                Nothing logged yet. The middle of a project is where things quietly die — one line a
                week is enough to notice.
              </p>
            ) : (
              <ol className="log-list">
                {progress.map((entry) => (
                  <li key={entry.id}>
                    <span className="log-when mono">{timeAgo(entry.createdAt)}</span>
                    <span>{entry.body}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      <footer className="problem-foot">
        <span className="fingerprint" title="Globally unique — no one else has this problem">
          #{problem.fingerprint}
        </span>
        {interactive && (
          <span className="feedback-row" title="Was this a good problem? Feeds back into the catalogue.">
            <button
              type="button"
              className="feedback-btn"
              data-on={feedback === "up" ? "true" : "false"}
              onClick={() => setFeedback("up")}
              aria-label="Good problem"
              aria-pressed={feedback === "up"}
            >
              👍
            </button>
            <button
              type="button"
              className="feedback-btn"
              data-on={feedback === "down" ? "true" : "false"}
              onClick={() => setFeedback("down")}
              aria-label="Not for me"
              aria-pressed={feedback === "down"}
            >
              👎
            </button>
          </span>
        )}
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
            <button
              className="btn btn-sm btn-primary"
              onClick={async () => {
                setSavingNotes(true);
                try {
                  await api(`/api/problems/${problem.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ notes }),
                  });
                } finally {
                  setSavingNotes(false);
                }
              }}
              disabled={savingNotes}
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
