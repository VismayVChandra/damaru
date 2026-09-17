"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/activity";
import { BUILD_LOG_KINDS, BUILD_LOG_META } from "@/lib/status";
import DamaruSpinner from "@/components/DamaruSpinner";
import type { BuildLogKind, ProgressEntry } from "@/lib/types";

const COMPACT_LIMIT = 5;

/**
 * A project's build log - what used to be a plain-text "progress log" is now
 * typed (progress/blocked/looking for help/milestone/shipped) with an
 * optional link or image per entry. One implementation, two densities:
 * `compact` (inside ProblemCard, capped with a link to the full project
 * page) and `full` (the project page itself).
 */
export default function BuildLog({
  problemId,
  entries: initialEntries,
  canPost,
  density = "full",
}: {
  problemId: string;
  entries: ProgressEntry[];
  /** Owner or team member - the widened authz that makes this a team log, not just the owner's. */
  canPost: boolean;
  density?: "compact" | "full";
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<BuildLogKind>("progress");
  const [showExtra, setShowExtra] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  async function logEntry() {
    const body = draft.trim();
    if (!body) return;
    setLogging(true);
    setLogError(null);
    try {
      const { entry } = await api<{ entry: ProgressEntry }>(`/api/problems/${problemId}/progress`, {
        method: "POST",
        body: JSON.stringify({
          body,
          kind,
          linkUrl: linkUrl.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });
      setEntries((prev) => [entry, ...prev]);
      setDraft("");
      setLinkUrl("");
      setImageUrl("");
      setShowExtra(false);
      setKind("progress");
    } catch (e) {
      setLogError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setLogging(false);
    }
  }

  const shown = density === "compact" ? entries.slice(0, COMPACT_LIMIT) : entries;
  const hiddenCount = entries.length - shown.length;

  return (
    <div className="block log">
      <div className="block-label">
        Build log {entries.length > 0 && <span className="faint">— {entries.length}</span>}
      </div>

      {canPost && (
        <div className="log-compose-wrap">
          <div className="chip-wrap" style={{ marginBottom: 10 }}>
            {BUILD_LOG_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className="chip"
                data-on={kind === k ? "true" : "false"}
                onClick={() => setKind(k)}
              >
                {BUILD_LOG_META[k].icon} {BUILD_LOG_META[k].label}
              </button>
            ))}
          </div>
          <div className="log-compose">
            <input
              className="input"
              value={draft}
              placeholder="What moved? One line is enough."
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) logEntry();
              }}
              disabled={logging}
            />
            <button className="btn btn-sm btn-primary" onClick={logEntry} disabled={logging || !draft.trim()}>
              {logging ? (
                <>
                  <DamaruSpinner size={16} /> Saving…
                </>
              ) : (
                "Log it"
              )}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra ? "Hide link/image" : "Add a link or image"}
          </button>
          {showExtra && (
            <div className="stack" style={{ gap: 8, marginTop: 8 }}>
              <input
                className="input"
                value={linkUrl}
                placeholder="https:// link (optional)"
                onChange={(e) => setLinkUrl(e.target.value)}
                disabled={logging}
              />
              <input
                className="input"
                value={imageUrl}
                placeholder="https:// image URL (optional)"
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={logging}
              />
            </div>
          )}
        </div>
      )}

      {logError && <p style={{ color: "var(--ember)", fontSize: 13, marginTop: 8 }}>{logError}</p>}

      {entries.length === 0 ? (
        <p className="faint" style={{ fontSize: 13.5, marginTop: 10 }}>
          Nothing logged yet. The middle of a project is where things quietly die — one line a week
          is enough to notice.
        </p>
      ) : (
        <ol className="log-list">
          {shown.map((entry) => (
            <li key={entry.id} data-kind={entry.kind}>
              <span className="log-kind" aria-hidden="true">
                {BUILD_LOG_META[entry.kind].icon}
              </span>
              <span className="log-when mono">{timeAgo(entry.createdAt)}</span>
              <span>
                {entry.body}
                {entry.linkUrl && (
                  <>
                    {" "}
                    <a href={entry.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-link">
                      link ↗
                    </a>
                  </>
                )}
                {entry.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary pasted URLs, not a local asset next/image can optimise.
                  <img
                    src={entry.imageUrl}
                    alt=""
                    style={{ display: "block", marginTop: 6, maxWidth: 240, borderRadius: 8 }}
                  />
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      {density === "compact" && hiddenCount > 0 && (
        <Link
          href={`/p/${problemId}`}
          className="inline-link"
          style={{ display: "inline-block", marginTop: 10, fontSize: 13 }}
        >
          See all {entries.length} in the project →
        </Link>
      )}
    </div>
  );
}
