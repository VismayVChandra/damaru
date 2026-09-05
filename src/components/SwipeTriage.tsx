"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import ProblemCard from "@/components/ProblemCard";
import { api } from "@/lib/client";
import type { Problem } from "@/lib/types";

type Decision = "saved" | "passed";

interface Decided {
  problem: Problem;
  decision: Decision;
}

/** Drag distance, in px, that commits a swipe rather than snapping back. */
const THRESHOLD = 100;

/**
 * A freshly generated batch is 3-5 problems, each several screens long once
 * expanded - reading all of them in full before deciding on any is the wrong
 * default. This triages the batch fast (title, hook, fit) and only expands
 * to the full brief on request, deciding via drag, tap, or arrow keys.
 *
 * Swiping and the buttons write the same statuses ("saved" / "passed") the
 * dashboard already understands - this is a faster gesture for existing
 * state, not a new concept. Reroll is the third option: not a decision, just
 * "this domain, a different execution" - it never touches `decided`.
 */
export default function SwipeTriage({ problems }: { problems: Problem[] }) {
  const [queue, setQueue] = useState<Problem[]>(problems);
  const [decided, setDecided] = useState<Decided[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [rerollError, setRerollError] = useState<string | null>(null);
  const startX = useRef(0);

  const top = queue[0];
  const peek = queue[1];
  const busy = pending || rerolling;

  async function decide(problem: Problem, decision: Decision) {
    if (busy) return;
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
    if (!dragging) return;
    setDragging(false);
    if (!top) return;
    if (dragX > THRESHOLD) decide(top, "saved");
    else if (dragX < -THRESHOLD) decide(top, "passed");
    else setDragX(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!top || expandedId || busy) return;
    if (e.key === "ArrowRight") decide(top, "saved");
    if (e.key === "ArrowLeft") decide(top, "passed");
  }

  if (!top) {
    const saved = decided.filter((d) => d.decision === "saved").length;
    const passed = decided.filter((d) => d.decision === "passed").length;
    return (
      <div className="card triage-done">
        <h2>Sorted.</h2>
        <p className="muted" style={{ marginTop: 10 }}>
          {saved} saved, {passed} passed. The saved ones are waiting in{" "}
          <Link href="/dashboard" style={{ color: "var(--ember)" }}>
            My problems
          </Link>{" "}
          whenever you're ready to start.
        </p>
      </div>
    );
  }

  const tilt = Math.max(-10, Math.min(10, dragX / 14));
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
                  transform: `translateX(${dragX}px) rotate(${tilt}deg)`,
                  transition: dragging ? "none" : "transform 220ms ease",
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
          onClick={() => decide(top, "passed")}
          disabled={busy}
        >
          ✕ Pass
        </button>
        <button
          className="btn btn-lg btn-primary triage-save"
          onClick={() => decide(top, "saved")}
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
