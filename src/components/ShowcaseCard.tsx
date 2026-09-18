import Link from "next/link";
import type { ReactNode } from "react";
import { coverImage } from "@/lib/activity";
import { STATUS_LABEL } from "@/lib/status";
import type { Problem } from "@/lib/types";

/**
 * A gallery tile for someone's work. Deliberately not ProblemCard - that one is
 * a stateful brief-reader with its own controls; this is a static link to the
 * project page, closer in shape to the shipped cards on a profile.
 */
export default function ShowcaseCard({
  problem,
  subtitle = null,
  showStatus = false,
}: {
  problem: Problem;
  /** Whose it is, where that isn't already obvious from the page around it. */
  subtitle?: ReactNode;
  /** Needed the moment a grid shows anything other than finished work. */
  showStatus?: boolean;
}) {
  const cover = coverImage(problem);

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
        <span className="row" style={{ gap: 8 }}>
          <span className="chip chip-static">
            {problem.domainIcon} {problem.domainLabel}
          </span>
          {showStatus && (
            <span className="status" data-s={problem.status}>
              {STATUS_LABEL[problem.status]}
            </span>
          )}
          {problem.inspiredByProblemId && (
            <span className="chip chip-static" title="Built on someone else's project">
              ↗ fork
            </span>
          )}
        </span>

        <p className="showcase-card-title">{problem.title}</p>

        {subtitle && (
          <p className="faint" style={{ fontSize: 12.5 }}>
            {subtitle}
          </p>
        )}

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
