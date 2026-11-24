"use client";

import Link from "next/link";
import { useState } from "react";
import DamaruSpinner from "@/components/DamaruSpinner";
import { api } from "@/lib/client";
import { NUDGE_SNOOZE_COOKIE, SNOOZE_DAYS, type Nudge } from "@/lib/nudge";
import { BUILD_LOG_META } from "@/lib/status";
import type { BuildLogKind } from "@/lib/types";

/**
 * One gentle question about one project: what moved?
 *
 * It writes through the same `POST /api/problems/[id]/progress` that the
 * build log on the project page does, so there is exactly one way an entry
 * comes into being. The only thing this adds is the asking.
 *
 * What decides whether and what to ask lives in `lib/nudge.ts`; this file is
 * the question and the way out of it.
 */

/** Answers to "how is it going" - milestone and shipped are things you announce, not things you are asked for. */
const ANSWER_KINDS: BuildLogKind[] = ["progress", "blocked", "looking_for_help"];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function words(nudge: Nudge): { lead: string; sub: string; placeholder: string } {
  switch (nudge.reason) {
    case "first":
      return {
        // Without a number when it is only an upper bound - see Nudge.approximate.
        lead: nudge.approximate
          ? "You kept this and haven't logged anything on it yet. What's the first thing you did?"
          : `You kept this ${plural(nudge.days, "day")} ago and haven't logged anything. What's the first thing you did?`,
        sub: "Anything counts, including “read it twice and got stuck”. One line.",
        placeholder: "e.g. sketched the layout",
      };
    case "quiet":
      return {
        lead: `Last logged ${plural(nudge.days, "day")} ago. What has moved since?`,
        sub: "One line. “Blocked” is a perfectly good update.",
        placeholder: "e.g. got readings, but they drift",
      };
    case "stalled":
      return {
        lead: nudge.approximate
          ? "This one looks like it has gone quiet. Still on it, or time to let it go?"
          : `Nothing on this for ${plural(nudge.days, "day")}. Still on it, or time to let it go?`,
        sub: "Either answer is useful. A silent stall is the only one that tells nobody anything.",
        placeholder: "e.g. picked it back up",
      };
  }
}

/** Read the snooze back on the client, for pages that render after a fetch. */
export function readSnoozeCookie(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${NUDGE_SNOOZE_COOKIE}=`));
  return hit ? hit.slice(NUDGE_SNOOZE_COOKIE.length + 1) : null;
}

type Outcome = { kind: "logged"; entryKind: BuildLogKind } | { kind: "released" };

export default function BuildLogNudge({
  nudge,
  onResolved,
}: {
  nudge: Nudge | null;
  /** Called once something was saved or released, so a page that is
   *  showing the same data can refresh it. */
  onResolved?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<BuildLogKind>("progress");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [hidden, setHidden] = useState(false);
  // A snapshot taken at mount, on purpose. After saving, the page may refetch
  // and hand down a *different* project, and the confirmation should not be
  // swapped for the next question the instant it arrives - nor should a
  // project that appears later pop a card into a page that had none.
  const [snapshot] = useState<Nudge | null>(nudge);

  if (hidden || !snapshot) return null;
  // Bound after the guard so the handlers below see a Nudge, not Nudge | null:
  // TypeScript does not carry an early-return narrowing into hoisted functions.
  const current: Nudge = snapshot;

  async function log() {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/problems/${current.problemId}/progress`, {
        method: "POST",
        body: JSON.stringify({ body, kind }),
      });
      setOutcome({ kind: "logged", entryKind: kind });
      onResolved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  async function letGo() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/problems/${current.problemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "passed" }),
      });
      setOutcome({ kind: "released" });
      onResolved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update that.");
    } finally {
      setBusy(false);
    }
  }

  function notNow() {
    // Quiets the whole nudge, not one project: handing someone the next
    // overdue thing the moment they decline the first is the inbox feeling
    // this is meant to avoid.
    document.cookie = `${NUDGE_SNOOZE_COOKIE}=${Date.now() + SNOOZE_DAYS * 86_400_000}; path=/; max-age=${
      SNOOZE_DAYS * 86_400
    }; samesite=lax`;
    setHidden(true);
  }

  // --- After answering --------------------------------------------------------
  if (outcome) {
    return (
      <section className="card nudge" role="status" aria-live="polite">
        {outcome.kind === "released" ? (
          <>
            <p className="nudge-lead">Let go.</p>
            <p className="nudge-sub">
              That&apos;s a real decision, and a better record than a project that quietly died.
            </p>
          </>
        ) : (
          <>
            <p className="nudge-lead">Logged. That&apos;s the whole job.</p>
            <p className="nudge-sub">
              {outcome.entryKind === "looking_for_help"
                ? "It now shows on Home under “Looking for help”."
                : "It's on the project now, and in the club's activity feed."}{" "}
              <Link href={`/p/${current.problemId}`} className="inline-link">
                Open the project
              </Link>
            </p>
          </>
        )}
      </section>
    );
  }

  const copy = words(current);

  return (
    <section className="card nudge" aria-label="A question about one of your projects">
      <div className="block-label">Worth a line</div>
      <Link href={`/p/${current.problemId}`} className="nudge-title handle-link">
        {current.title}
      </Link>
      <p className="nudge-lead">{copy.lead}</p>
      <p className="nudge-sub">{copy.sub}</p>

      {current.reason !== "quiet" && current.startingAngle && (
        <details className="nudge-angle">
          <summary>Not sure where to start?</summary>
          <p>{current.startingAngle}</p>
        </details>
      )}

      <div className="chip-wrap">
        {ANSWER_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="chip"
            data-on={kind === k ? "true" : "false"}
            onClick={() => setKind(k)}
            disabled={busy}
          >
            {BUILD_LOG_META[k].icon} {BUILD_LOG_META[k].label}
          </button>
        ))}
      </div>

      <div className="log-compose">
        <input
          className="input"
          value={draft}
          placeholder={copy.placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim() && !busy) log();
          }}
          disabled={busy}
          aria-label="What moved?"
        />
        <button className="btn btn-sm btn-primary" onClick={log} disabled={busy || !draft.trim()}>
          {busy ? (
            <>
              <DamaruSpinner size={16} /> Saving…
            </>
          ) : (
            "Log it"
          )}
        </button>
      </div>

      {error && <p className="nudge-error">{error}</p>}

      <div className="nudge-exits">
        <button type="button" className="nudge-exit" onClick={notNow} disabled={busy}>
          Not now
        </button>
        {/* Only offered once a project has plainly stopped. Offering it on one
            kept two days ago would be pushing someone to quit early. */}
        {current.reason === "stalled" && (
          <button type="button" className="nudge-exit" onClick={letGo} disabled={busy}>
            Let this one go
          </button>
        )}
      </div>
    </section>
  );
}
