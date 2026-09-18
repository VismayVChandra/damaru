import Link from "next/link";
import { timeAgo } from "@/lib/activity";
import type { Problem, ProgressEntry } from "@/lib/types";

type FeedItem = Problem & { handle: string };
type DigestEntry = ProgressEntry & {
  problemId: string;
  problemTitle: string;
  handle: string;
  domainIcon: string;
  domainLabel: string;
};

export interface DigestData {
  followingCount: number;
  newProblems: FeedItem[];
  progressEntries: DigestEntry[];
}

export default function WeeklyDigest({ digest }: { digest: DigestData }) {
  const { followingCount, newProblems, progressEntries } = digest;

  if (followingCount === 0) {
    return (
      <section className="section">
        <h2>This week in your network</h2>
        <div className="empty" style={{ marginTop: 14 }}>
          <p>You aren&apos;t following anyone yet.</p>
          <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 12 }}>
            <Link href="/browse" className="btn btn-primary">
              Explore the club
            </Link>
            <Link href="/pair" className="btn">
              Browse by expertise
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const milestones = progressEntries.filter((e) => e.kind === "shipped" || e.kind === "milestone");
  const rollupEntries = progressEntries.filter((e) => e.kind !== "shipped" && e.kind !== "milestone");
  const rollupProjectCount = new Set(rollupEntries.map((e) => e.problemId)).size;

  const nothing = newProblems.length === 0 && progressEntries.length === 0;

  return (
    <section className="section">
      <h2>This week in your network</h2>

      {nothing ? (
        <p className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>
          Nothing new from your network this week.
        </p>
      ) : (
        <div className="stack" style={{ gap: 20, marginTop: 14 }}>
          {newProblems.length > 0 && (
            <div>
              <div className="block-label">New projects</div>
              <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                {newProblems.map((p) => (
                  <Link key={p.id} href={`/p/${p.id}`} className="row card card-tight card-hover" style={{ justifyContent: "space-between", gap: 10 }}>
                    <span>
                      <span className="chip chip-static" style={{ marginRight: 8 }}>
                        {p.domainIcon} {p.domainLabel}
                      </span>
                      {p.title} <span className="faint">— @{p.handle}</span>
                    </span>
                    <span className="faint mono" style={{ fontSize: 11 }}>
                      {timeAgo(p.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <div className="block-label">Shipped or hit a milestone</div>
              <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                {milestones.map((e) => (
                  <Link key={e.id} href={`/p/${e.problemId}`} className="row card card-tight card-hover" style={{ justifyContent: "space-between", gap: 10 }}>
                    <span>
                      <span aria-hidden="true" style={{ marginRight: 8 }}>
                        {e.kind === "shipped" ? "🚀" : "🎉"}
                      </span>
                      {e.problemTitle} <span className="faint">— @{e.handle}</span>
                    </span>
                    <span className="faint mono" style={{ fontSize: 11 }}>
                      {timeAgo(e.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {rollupEntries.length > 0 && (
            <p className="faint" style={{ fontSize: 13.5 }}>
              {rollupEntries.length} build-log {rollupEntries.length === 1 ? "update" : "updates"} across{" "}
              {rollupProjectCount} {rollupProjectCount === 1 ? "project" : "projects"}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
