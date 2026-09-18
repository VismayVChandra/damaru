import Link from "next/link";
import { coverImage, idleDays, timeAgo } from "@/lib/activity";
import { BUILD_LOG_META, STATUS_LABEL } from "@/lib/status";
import type { ProjectSignals } from "@/lib/db";
import type { FitBreakdown, Problem } from "@/lib/types";

/**
 * One project, small enough to scan in a feed. Answers the five questions a
 * card has to answer - what is this, who is building it, is it active, what
 * happened recently, can I do something about it - and leaves everything else
 * to /p/[id].
 *
 * Not wrapped in a single <Link> the way ShowcaseCard is: this one carries a
 * @handle link and sometimes a call to action, and an anchor inside an anchor
 * is invalid. The title gets a stretched-link overlay instead, so the whole
 * card is still clickable.
 */
export default function ProjectCard({
  problem,
  signals = null,
  viewerFit = null,
  reasons = null,
  cta = null,
  highlightLog = false,
  showCover = false,
}: {
  problem: Problem & { handle: string };
  signals?: ProjectSignals | null;
  /** Scored against whoever is looking. Never problem.fit, which was scored
   * against the owner at generation time and means nothing to anyone else. */
  viewerFit?: FitBreakdown | null;
  reasons?: string[] | null;
  cta?: { href: string; label: string } | null;
  /** Show the latest build-log line in full - for "looking for help", where
   * the blocker is the whole point of the card. */
  highlightLog?: boolean;
  showCover?: boolean;
}) {
  const cover = showCover ? coverImage(problem) : null;
  const idle = idleDays(problem);
  const latest = signals?.latestLog ?? problem.progress?.[0] ?? null;
  const lastAt = signals?.lastActivityAt ?? problem.createdAt;
  const isLive = Date.now() - new Date(lastAt).getTime() < 24 * 60 * 60 * 1000;

  return (
    <article className="card card-hover project-card">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary pasted URLs, not a local asset next/image can optimise.
        <img src={cover} alt="" className="showcase-cover" style={{ marginBottom: 12 }} />
      )}

      <div className="row" style={{ gap: 8 }}>
        <span className="chip chip-static">
          {problem.domainIcon} {problem.domainLabel}
        </span>
        <span className="status" data-s={problem.status}>
          {STATUS_LABEL[problem.status]}
        </span>
        {problem.inspiredByProblemId && (
          <span className="chip chip-static" title="Built on someone else's project">
            ↗ fork
          </span>
        )}
        {idle !== null && (
          <span className="chip chip-static is-idle" title="No progress logged recently">
            {idle}d quiet
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 16, margin: 0, lineHeight: 1.35 }}>
        <Link href={`/p/${problem.id}`} className="project-card-link handle-link">
          {problem.title}
        </Link>
      </h3>

      <p className="muted clamp-2" style={{ fontSize: 13.5, margin: 0 }}>
        {problem.hook}
      </p>

      <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>
        <Link href={`/u/${problem.handle}`} className="handle-link">
          @{problem.handle}
        </Link>
        {signals && signals.teamSize > 1 && ` +${signals.teamSize - 1}`}
      </p>

      {latest && (
        <p className="feed-latest" style={{ margin: 0 }}>
          <span aria-hidden="true">{BUILD_LOG_META[latest.kind].icon}</span>{" "}
          <span className={highlightLog ? undefined : "clamp-2"}>{latest.body}</span>
        </p>
      )}

      {reasons && reasons.length > 0 && (
        <div className="chip-wrap">
          {reasons.map((r) => (
            <span key={r} className="chip chip-static match-reason">
              {r}
            </span>
          ))}
        </div>
      )}

      {viewerFit && (
        <p className="faint mono" style={{ fontSize: 11.5, margin: 0 }}>
          {Math.round(viewerFit.score * 100)}% fit for you · {viewerFit.estimate}
        </p>
      )}

      {/* Progress first and in body colour; popularity last, faint, and pushed
          to the far edge - a project that is moving should look more alive
          than one that is merely liked. */}
      <div className="project-signals">
        <span className={isLive ? "is-live" : undefined}>
          <time dateTime={lastAt} title={new Date(lastAt).toLocaleString()}>
            Updated {timeAgo(lastAt)}
          </time>
        </span>
        {signals && signals.teamSize > 1 && (
          <>
            <span className="sep">·</span>
            <span>{signals.teamSize} members</span>
          </>
        )}
        {signals && signals.openRoles > 0 && (
          <>
            <span className="sep">·</span>
            <span>
              {signals.openRoles} open {signals.openRoles === 1 ? "role" : "roles"}
            </span>
          </>
        )}
        {signals && signals.buildLogCount > 0 && (
          <>
            <span className="sep">·</span>
            <span>
              {signals.buildLogCount} build {signals.buildLogCount === 1 ? "log" : "logs"}
            </span>
          </>
        )}
        {((problem.likeCount ?? 0) > 0 || (problem.commentCount ?? 0) > 0) && (
          <span className="is-social">
            {(problem.likeCount ?? 0) > 0 && <>♥ {problem.likeCount}</>}
            {(problem.likeCount ?? 0) > 0 && (problem.commentCount ?? 0) > 0 && " · "}
            {(problem.commentCount ?? 0) > 0 && <>💬 {problem.commentCount}</>}
          </span>
        )}
      </div>

      {cta && (
        <Link href={cta.href} className="btn btn-sm btn-primary" style={{ alignSelf: "flex-start" }}>
          {cta.label}
        </Link>
      )}
    </article>
  );
}
