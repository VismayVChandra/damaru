import Link from "next/link";
import type { Problem } from "@/lib/types";

/**
 * A gallery tile for finished work. Deliberately not ProblemCard - that one is
 * a stateful brief-reader with its own controls; this is a static link to the
 * project page, closer in shape to the shipped cards on a profile.
 */
export default function ShowcaseCard({ problem, handle }: { problem: Problem; handle: string }) {
  // Best-effort cover: the newest build-log entry that has an image. There is
  // no dedicated cover column, and `progress` already arrives newest-first.
  const cover = (problem.progress ?? []).find((e) => e.imageUrl)?.imageUrl ?? null;

  return (
    <Link
      href={`/p/${problem.id}`}
      className="card card-hover showcase-card"
      style={{ color: "inherit", textDecoration: "none" }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary pasted URLs, not a local asset next/image can optimise.
        <img src={cover} alt="" className="showcase-cover" />
      ) : (
        <div className="showcase-cover showcase-cover-fallback" aria-hidden="true">
          <span style={{ fontSize: 34 }}>{problem.domainIcon}</span>
        </div>
      )}

      <div className="showcase-card-body">
        <span className="chip chip-static">
          {problem.domainIcon} {problem.domainLabel}
        </span>
        <p className="showcase-card-title">{problem.title}</p>
        <p className="faint" style={{ fontSize: 12.5 }}>
          by @{handle}
        </p>
        {((problem.likeCount ?? 0) > 0 || (problem.commentCount ?? 0) > 0) && (
          <div className="row" style={{ gap: 12 }}>
            {(problem.likeCount ?? 0) > 0 && (
              <span className="faint mono" style={{ fontSize: 11.5 }}>
                ♥ {problem.likeCount}
              </span>
            )}
            {(problem.commentCount ?? 0) > 0 && (
              <span className="faint mono" style={{ fontSize: 11.5 }}>
                💬 {problem.commentCount}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
