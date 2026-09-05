"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProblemCard from "@/components/ProblemCard";
import { api } from "@/lib/client";
import type { Problem } from "@/lib/types";

type Decision = "saved" | "passed";

interface Decided {
  problem: Problem;
  decision: Decision;
}

interface Toast {
  problem: Problem;
  decision: Decision;
}

/** Drag distance, in px, that commits a swipe rather than snapping back. */
const THRESHOLD = 110;
/** Where a committed card flings to before the queue actually advances. */
const FLING_DISTANCE = 520;
const FLING_MS = 280;
const TOAST_MS = 4000;

/**
 * A freshly generated batch is 3-5 problems, each several screens long once
 * expanded - reading all of them in full before deciding on any is the wrong
 * default. This triages the batch fast (title, hook, fit) and only expands
 * to the full brief on request, deciding via drag, tap, or arrow keys.
 *
 * Swiping and the buttons write the same statuses ("saved" / "passed") the
 * dashboard already understands - this is a faster gesture for existing
 * state, not a new concept. Reroll is a separate, non-committal action: not
 * a decision, just "this domain, a different execution" - it never touches
 * `decided` and never flings.
 */
export default function SwipeTriage({
  problems,
  onGenerateAgain,
}: {
  problems: Problem[];
  onGenerateAgain?: () => void;
}) {
  const [queue, setQueue] = useState<Problem[]>(problems);
  const [decided, setDecided] = useState<Decided[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flinging, setFlinging] = useState(false);
  const [pending, setPending] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [rerollError, setRerollError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const startX = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const top = queue[0];
  const peek = queue[1];
  const busy = pending || rerolling || flinging;

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function showToast(problem: Problem, decision: Decision) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ problem, decision });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  async function decide(problem: Problem, decision: Decision) {
    setPending(true);
    try {
      await api(`/api/problems/${problem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: decision }),
      });
    } catch {
      // The write failing shouldn't strand the card - it stays "new"
      // server-side and is fixable from the dashboard either way.
    } finally {
      setPending(false);
    }
    setDecided((prev) => [...prev, { problem, decision }]);
    setQueue((prev) => prev.filter((p) => p.id !== problem.id));
    setExpandedId(null);
    setDragX(0);
    setRerollError(null);
    showToast(problem, decision);
  }

  /** Flings the active card off-screen, then commits the decision underneath. */
  function commit(problem: Problem, decision: Decision) {
    if (busy) return;
    setDragging(false);
    setFlinging(true);
    setDragX(decision === "saved" ? FLING_DISTANCE : -FLING_DISTANCE);
    setTimeout(() => {
      setFlinging(false);
      decide(problem, decision);
    }, FLING_MS);
  }

  async function undo() {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const { problem } = toast;
    setToast(null);
    setDecided((prev) => {
      const i = prev.findIndex((d) => d.problem.id === problem.id);
      return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)];
    });
    setQueue((prev) => [problem, ...prev]);
    try {
      await api(`/api/problems/${problem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "new" }),
      });
    } catch {
      // Same tolerance as decide(): worst case the status lags one step
      // behind what the card shows, fixable from the dashboard.
    }
  }

  // Not a decision - swaps the same slot for a fresh draw in the same
  // domain, so it does not touch `decided` or the "X of Y" count.
  async function reroll(problem: Problem) {
    if (busy) return;
    setRerolling(true);
    setRerollError(null);
    try {
      const { problem: fresh } = await api<{ problem: Problem }>(
        `/api/problems/${problem.id}/reroll`,
        { method: "POST" },
      );
      setQueue((prev) => [fresh, ...prev.slice(1)]);
      setExpandedId(null);
      setDragX(0);
    } catch (e) {
      setRerollError(e instanceof Error ? e.message : "Could not reroll that one.");
    } finally {
      setRerolling(false);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (expandedId || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (!dragging || flinging) return;
    if (!top) {
      setDragging(false);
      return;
    }
    if (dragX > THRESHOLD) commit(top, "saved");
    else if (dragX < -THRESHOLD) commit(top, "passed");
    else {
      setDragging(false);
      setDragX(0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!top || expandedId || busy) return;
    if (e.key === "ArrowRight") commit(top, "saved");
    if (e.key === "ArrowLeft") commit(top, "passed");
  }

  const toastNode = toast && (
    <div className="triage-toast" role="status">
      <span>{toast.decision === "saved" ? "Saved." : "Passed."}</span>
      <button type="button" className="triage-toast-undo" onClick={undo}>
        Undo
      </button>
    </div>
  );

  if (!top) {
    const saved = decided.filter((d) => d.decision === "saved").length;
    const passed = decided.filter((d) => d.decision === "passed").length;
    return (
      <>
        <div className="card triage-done">
          <h2>Sorted.</h2>
          <p className="muted" style={{ marginTop: 10 }}>
            {saved} saved, {passed} passed. The saved ones are waiting in{" "}
            <Link href="/dashboard" style={{ color: "var(--ember)" }}>
              My problems
            </Link>{" "}
            whenever you're ready to start.
          </p>
          <div className="row" style={{ marginTop: 20, justifyContent: "center", gap: 12 }}>
            <Link href="/dashboard" className="btn btn-lg btn-primary">
              Open my problems
            </Link>
            {onGenerateAgain && (
              <button type="button" className="btn btn-lg" onClick={onGenerateAgain}>
                Generate again
              </button>
            )}
          </div>
        </div>
        {toastNode}
      </>
    );
  }

  const stampOpacity = Math.min(1, Math.abs(dragX) / THRESHOLD);

  return (
    <div className="triage">
      <div className="row triage-progress">
        <span className="mono faint" style={{ fontSize: 12 }}>
          {decided.length + 1} of {problems.length}
        </span>
      </div>

      <div className="triage-stack" onKeyDown={onKeyDown} tabIndex={0}>
        {peek && !expandedId && (
          <div className="triage-card triage-card-peek" aria-hidden="true">
            <TriageSummary problem={peek} />
          </div>
        )}

        <div
          className="triage-card"
          style={
            expandedId === top.id
              ? undefined
              : {
                  transform: `translateX(${dragX}px) rotate(${dragX * 0.035}deg)`,
                  transition: dragging
                    ? "none"
                    : flinging
                      ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)"
                      : "transform 220ms ease",
                }
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {!expandedId && dragX > 24 && (
            <span className="triage-stamp triage-stamp-save" style={{ opacity: stampOpacity }}>
              Save
            </span>
          )}
          {!expandedId && dragX < -24 && (
            <span className="triage-stamp triage-stamp-pass" style={{ opacity: stampOpacity }}>
              Pass
            </span>
          )}

          {expandedId === top.id ? (
            <>
              <ProblemCard problem={top} interactive={false} />
              <div style={{ padding: "16px 22px" }}>
                <button className="btn btn-sm" onClick={() => setExpandedId(null)}>
                  &larr; Back to triage
                </button>
              </div>
            </>
          ) : (
            <>
              <TriageSummary problem={top} />
              <button
                type="button"
                className="triage-expand"
                onClick={() => setExpandedId(top.id)}
                disabled={busy}
              >
                Read the full brief
              </button>
            </>
          )}
        </div>
      </div>

      <div className="row triage-actions">
        <button
          className="btn btn-lg triage-pass"
          onClick={() => commit(top, "passed")}
          disabled={busy}
        >
          ✕ Pass
        </button>
        <button
          className="btn btn-lg btn-primary triage-save"
          onClick={() => commit(top, "saved")}
          disabled={busy}
        >
          ✓ Save
        </button>
      </div>
      <button type="button" className="triage-reroll" onClick={() => reroll(top)} disabled={busy}>
        {rerolling ? "Finding something else…" : "↻ Not this one - try another in this domain"}
      </button>
      {rerollError && <p className="triage-reroll-error">{rerollError}</p>}
      <p className="faint" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
        Swipe, tap, or use the arrow keys.
      </p>
      {toastNode}
    </div>
  );
}

function TriageSummary({ problem }: { problem: Problem }) {
  return (
    <div className="triage-summary">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="chip chip-static">
          {problem.domainIcon} {problem.domainLabel}
        </span>
        <span className="mono faint" style={{ fontSize: 12 }}>
          fit {Math.round(problem.fit.score * 100)}%
        </span>
      </div>
      <h2 className="triage-title">{problem.title}</h2>
      <p className="triage-hook">{problem.hook}</p>
      <div className="row" style={{ gap: 12 }}>
        <span className="pips">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="pip" data-on={i <= problem.fit.difficulty ? "true" : "false"} />
          ))}
        </span>
        <span className="faint mono" style={{ fontSize: 12 }}>
          {problem.fit.estimate}
        </span>
      </div>
    </div>
  );
}
