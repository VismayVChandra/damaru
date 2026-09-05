import Link from "next/link";
import { listFeed } from "@/lib/db";
import { checklistProgress, idleDays, timeAgo } from "@/lib/activity";
import type { Problem } from "@/lib/types";

export const dynamic = "force-dynamic";

type FeedItem = Problem & { handle: string };

const STATUS_LABEL: Record<Problem["status"], string> = {
  new: "New",
  saved: "Saved",
  building: "Building",
  shipped: "Shipped",
  passed: "Passed",
};

function Row({ item }: { item: FeedItem }) {
  const done = checklistProgress(item);
  const idle = idleDays(item);
  const latest = item.progress?.[0];

  return (
    <details className="card feed-row">
      <summary style={{ cursor: "pointer", listStyle: "none" }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
          <span className="chip chip-static">
            {item.domainIcon} {item.domainLabel}
          </span>
          <span className="row" style={{ gap: 10 }}>
            {idle !== null && (
              <span className="chip chip-static is-idle">{idle}d idle</span>
            )}
            <span className="status" data-s={item.status}>
              {STATUS_LABEL[item.status]}
            </span>
            <span className="faint mono" style={{ fontSize: 11.5 }}>
              @{item.handle} · {timeAgo(item.createdAt)}
            </span>
          </span>
        </div>

        <h3 style={{ marginTop: 10, fontSize: 18 }}>{item.title}</h3>

        <div className="row" style={{ marginTop: 10, gap: 14 }}>
          <span className="faint mono" style={{ fontSize: 11.5 }}>
            fit {Math.round(item.fit.score * 100)}%
          </span>
          {done.total > 0 && (
            <span className="row" style={{ gap: 7 }}>
              <span className="meter" style={{ width: 62 }}>
                <span
                  className="meter-fill is-done"
                  style={{ display: "block", width: `${Math.round(done.ratio * 100)}%` }}
                />
              </span>
              <span className="faint mono" style={{ fontSize: 11.5 }}>
                {done.done}/{done.total} done
              </span>
            </span>
          )}
          <span className="faint mono" style={{ fontSize: 11.5 }}>
            {item.fit.estimate}
          </span>
        </div>

        {latest && (
          <p className="feed-latest">
            <span className="mono">latest</span> {latest.body}
          </p>
        )}
      </summary>

      <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
        <p className="problem-hook" style={{ marginBottom: 18 }}>
          {item.hook}
        </p>
        <div className="block">
          <div className="block-label">The problem</div>
          <p>{item.statement}</p>
        </div>
        <div className="block">
          <div className="block-label">Must do</div>
          <ul className="checklist is-plain">
            {item.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
        {item.progress && item.progress.length > 0 && (
          <div className="block">
            <div className="block-label">Progress log</div>
            <ol className="log-list">
              {item.progress.map((entry) => (
                <li key={entry.id}>
                  <span className="log-when mono">{timeAgo(entry.createdAt)}</span>
                  <span>{entry.body}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <span className="fingerprint">#{item.fingerprint}</span>
      </div>
    </details>
  );
}

function Section({
  title,
  blurb,
  items,
  rail = false,
}: {
  title: string;
  blurb: string;
  items: FeedItem[];
  /** The one section that's actually "the feed" per the handoff spec - a
   * timeline rail down the left edge. The other two sections here are this
   * app's own addition (shipped-only would hide too much real state), so
   * they stay plain lists rather than borrowing a rail that implies
   * chronology they don't really have. */
  rail?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="section">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>{title}</h2>
        <span className="faint mono" style={{ fontSize: 12 }}>
          {items.length}
        </span>
      </div>
      <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
        {blurb}
      </p>
      <div
        className={rail ? "feed-rail" : "stack"}
        style={{ gap: 14, marginTop: 18 }}
      >
        {items.map((p) => (
          <Row key={p.id} item={p} />
        ))}
      </div>
    </section>
  );
}

export default async function BrowsePage() {
  const feed = await listFeed(60);

  // Shipped work leads. A feed ordered by issue date rewards collecting
  // problems; this one rewards finishing them.
  const shipped = feed.filter((p) => p.status === "shipped");
  const moving = feed.filter((p) => p.status === "building");
  const rest = feed.filter((p) => !["shipped", "building"].includes(p.status));

  const logged = feed.reduce((n, p) => n + (p.progress?.length ?? 0), 0);

  return (
    <main className="shell">
      <div className="eyebrow">Club feed</div>
      <h1>What the club is building</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Every problem here was issued to exactly one person and will never be issued again. Shipped
        work leads — a list ordered by whoever generated most recently would just reward collecting
        briefs.
      </p>

      {feed.length > 0 && (
        <div className="row section" style={{ gap: 28 }}>
          <div>
            <div className="stat">{shipped.length}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              shipped
            </div>
          </div>
          <div>
            <div className="stat">{moving.length}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              in progress
            </div>
          </div>
          <div>
            <div className="stat">{logged}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              {logged === 1 ? "progress note" : "progress notes"}
            </div>
          </div>
          <div>
            <div className="stat">{feed.length}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              issued
            </div>
          </div>
        </div>
      )}

      {feed.length === 0 ? (
        <div className="empty">
          <p>Nothing has been issued yet.</p>
          <Link href="/signup" className="btn btn-primary" style={{ marginTop: 12 }}>
            Be the first
          </Link>
        </div>
      ) : (
        <>
          <Section
            title="Shipped"
            blurb="Finished, in someone's hands, done. This is the part worth copying."
            items={shipped}
            rail
          />
          <Section
            title="In progress"
            blurb="Actively being built. The progress log is the evidence."
            items={moving}
          />
          <Section
            title="Issued"
            blurb="Handed out, not started yet. Idle time is shown so it stays honest."
            items={rest}
          />
        </>
      )}
    </main>
  );
}
