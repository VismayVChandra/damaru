"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/activity";
import type { ProblemComment } from "@/lib/types";

/**
 * The like + comment bar for a problem, treated as a post. Self-contained so
 * it can drop into ProblemCard, the home feed, or a profile grid without
 * each of those having to know how comments load or how a like optimistically
 * updates.
 */
export default function Engagement({
  problemId,
  initialLikeCount,
  initialCommentCount,
  initialLiked,
  canInteract,
}: {
  problemId: string;
  initialLikeCount: number;
  initialCommentCount: number;
  initialLiked: boolean;
  /** False when signed out - counts still show, but the actions are inert. */
  canInteract: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ProblemComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  async function toggleLike() {
    if (!canInteract || likeBusy) return;
    setLikeBusy(true);
    const wasLiked = liked;
    const previousCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const res = await api<{ liked: boolean; likeCount: number }>(`/api/problems/${problemId}/like`, {
        method: "POST",
      });
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(wasLiked);
      setLikeCount(previousCount);
    } finally {
      setLikeBusy(false);
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) {
      setLoadingComments(true);
      try {
        const { comments: list } = await api<{ comments: ProblemComment[] }>(
          `/api/problems/${problemId}/comments`,
        );
        setComments(list);
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function postComment() {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const { comment } = await api<{ comment: ProblemComment }>(`/api/problems/${problemId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setComments((prev) => [...(prev ?? []), comment]);
      setCommentCount((c) => c + 1);
      setDraft("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="engagement">
      <div className="row" style={{ gap: 6 }}>
        <button
          type="button"
          className="engagement-btn"
          data-on={liked ? "true" : "false"}
          onClick={toggleLike}
          disabled={!canInteract}
          aria-pressed={liked}
          title={canInteract ? (liked ? "Unlike" : "Cheer this on") : "Sign in to cheer this on"}
        >
          <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
          {likeCount > 0 ? likeCount : ""}
        </button>
        <button type="button" className="engagement-btn" onClick={toggleComments} aria-expanded={showComments}>
          <span aria-hidden="true">💬</span>
          {commentCount > 0 ? commentCount : ""}
        </button>
      </div>

      {showComments && (
        <div className="engagement-comments">
          {loadingComments ? (
            <p className="faint" style={{ fontSize: 13 }}>
              Loading…
            </p>
          ) : comments && comments.length === 0 ? (
            <p className="faint" style={{ fontSize: 13 }}>
              No comments yet.
            </p>
          ) : (
            <ul className="comment-list">
              {(comments ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/u/${c.handle}`} className="comment-handle handle-link">
                    @{c.handle}
                  </Link>{" "}
                  <span>{c.body}</span>{" "}
                  <span className="faint mono" style={{ fontSize: 11 }}>
                    {timeAgo(c.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canInteract && (
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <input
                className="input"
                value={draft}
                placeholder="Add a comment…"
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) postComment();
                }}
                disabled={posting}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={postComment}
                disabled={posting || !draft.trim()}
              >
                Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
