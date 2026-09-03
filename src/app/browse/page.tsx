import Link from "next/link";
import { listFeed } from "@/lib/db";
import type { Problem } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<Problem["status"], string> = {
  new: "New",
  saved: "Saved",
  building: "Building",
  shipped: "Shipped",
  passed: "Passed",
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function BrowsePage() {
  const feed = listFeed(50);
  const shipped = feed.filter((p) => p.status === "shipped").length;
  const building = feed.filter((p) => p.status === "building").length;

  return (
    <main className="shell">
      <div className="eyebrow">Club feed</div>
      <h1>What the club is building</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Every problem here was issued to exactly one person and will never be issued again. Take
        one you like as a starting point for a conversation — not as something to duplicate.
      </p>

      {feed.length > 0 && (
        <div className="row section" style={{ gap: 24 }}>
          <div>
            <div className="stat">{feed.length}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              recent
            </div>
          </div>
          <div>
            <div className="stat">{building}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              in progress
            </div>
          </div>
          <div>
            <div className="stat">{shipped}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              shipped
            </div>
          </div>
        </div>
      )}

      {feed.length === 0 ? (
        <div className="empty">
          <p>Nothing has been issued yet.</p>
          <Link href="/profile" className="btn btn-primary" style={{ marginTop: 12 }}>
            Be the first
          </Link>
        </div>
      ) : (
        <div className="stack section" style={{ gap: 14 }}>
          {feed.map((p) => (
            <details key={p.id} className="card">
              <summary style={{ cursor: "pointer", listStyle: "none" }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                  <span className="chip chip-static">
                    {p.domainIcon} {p.domainLabel}
                  </span>
                  <span className="row" style={{ gap: 10 }}>
                    <span className="status" data-s={p.status}>
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="faint mono" style={{ fontSize: 11.5 }}>
                      @{p.handle} · {timeAgo(p.createdAt)}
                    </span>
                  </span>
                </div>
                <h3 style={{ marginTop: 10, fontSize: 18 }}>{p.title}</h3>
                <div className="row" style={{ marginTop: 10, gap: 14 }}>
                  <span className="faint mono" style={{ fontSize: 11.5 }}>
                    fit {Math.round(p.fit.score * 100)}%
                  </span>
                  <span className="pips">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className="pip"
                        data-on={i <= p.fit.difficulty ? "true" : "false"}
                      />
                    ))}
                  </span>
                  <span className="faint mono" style={{ fontSize: 11.5 }}>
                    {p.fit.estimate}
                  </span>
                </div>
              </summary>

              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                <p className="problem-hook" style={{ marginBottom: 18 }}>
                  {p.hook}
                </p>
                <div className="block">
                  <div className="block-label">The problem</div>
                  <p>{p.statement}</p>
                </div>
                <div className="block">
                  <div className="block-label">Must do</div>
                  <ul className="checklist">
                    {p.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <span className="fingerprint">#{p.fingerprint}</span>
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
