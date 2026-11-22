import Link from "next/link";
import { Suspense } from "react";
import DiscoverExplorer from "@/components/DiscoverExplorer";
import WeeklyDigest from "@/components/WeeklyDigest";
import {
  attachEngagement,
  countFollowing,
  getProjectSignals,
  getRecentEngagementCounts,
  listFeed,
  listFollowingActivity,
} from "@/lib/db";
import { rankRadar, type RadarItem } from "@/lib/discover";
import { STATUS_LABEL } from "@/lib/status";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Problem } from "@/lib/types";

export const dynamic = "force-dynamic";

type FeedItem = Problem & { handle: string };

function RadarRow({ item }: { item: RadarItem }) {
  return (
    <div className="card feed-row">
      <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
        <span className="chip chip-static">
          {item.domainIcon} {item.domainLabel}
        </span>
        <span className="row" style={{ gap: 10 }}>
          <span className="status" data-s={item.status}>
            {STATUS_LABEL[item.status]}
          </span>
          <Link href={`/u/${item.handle}`} className="faint mono handle-link" style={{ fontSize: 11.5 }}>
            @{item.handle}
          </Link>
        </span>
      </div>

      <Link href={`/p/${item.id}`} className="handle-link">
        <h3 style={{ marginTop: 10, fontSize: 17 }}>{item.title}</h3>
      </Link>

      <span className="chip chip-static" style={{ marginTop: 10 }}>
        {item.tier === "moving" ? "🟢" : "👀"}
        {item.buildLog7 > 0 && ` ${item.buildLog7} log${item.buildLog7 === 1 ? "" : "s"}`}
        {item.likes7 > 0 && ` · ♥ ${item.likes7}`}
        {item.comments7 > 0 && ` · 💬 ${item.comments7}`}
        {" this week"}
      </span>
    </div>
  );
}

export default async function DiscoverPage() {
  const sinceISO = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // Two waves, not seven. Functions run a long way from the database, so a
  // round trip costs far more than the 3ms the query itself takes - which
  // made this page's chain of `await`s the whole of its load time. Nothing
  // here needed to be sequential except where one call's *input* is another's
  // output, and only two such dependencies exist: everything needs the feed's
  // ids, and the digest needs to know whether the viewer follows anyone.
  const [viewer, rawFeed] = await Promise.all([getCurrentUser(), listFeed(300)]);
  const ids = rawFeed.map((p) => p.id);

  const [feed, recentCounts, signals, followingCount, activity] = await Promise.all([
    attachEngagement(rawFeed, viewer?.id ?? null) as Promise<FeedItem[]>,
    getRecentEngagementCounts(ids, sinceISO),
    getProjectSignals(rawFeed.map((p) => ({ id: p.id, createdAt: p.createdAt }))),
    viewer ? countFollowing(viewer.id) : Promise.resolve(0),
    // Fetched alongside the count rather than after it, and discarded if the
    // viewer turns out to follow nobody. One wasted read for those people is
    // cheaper than an extra sequential round trip for everyone else.
    viewer
      ? listFollowingActivity(viewer.id, sinceISO)
      : Promise.resolve({ newProblems: [], progressEntries: [] }),
  ]);

  const radar = rankRadar(feed, recentCounts, sinceISO).slice(0, 6);
  // A plain record rather than a Map: it crosses into a client component, and
  // every other prop in this codebase that does is plain data.
  const signalsRecord = Object.fromEntries(signals);

  const digest = viewer
    ? {
        followingCount,
        ...(followingCount > 0 ? activity : { newProblems: [], progressEntries: [] }),
      }
    : null;

  return (
    <main className="shell">
      <div className="eyebrow">Discover</div>
      <h1>See what the club is building</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Filter by domain or skill, see what&apos;s moving right now, and catch up on your network.
      </p>

      {digest && <WeeklyDigest digest={digest} />}

      <section className="section">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h2>Project Radar</h2>
          <span className="faint mono" style={{ fontSize: 12 }}>
            {radar.length}
          </span>
        </div>
        <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
          What&apos;s trending this week — a build log entry always beats a like or a comment.
        </p>
        {radar.length === 0 ? (
          <div className="empty" style={{ marginTop: 18 }}>
            <p>Nothing trending this week yet — log some progress or leave a comment to get it started.</p>
          </div>
        ) : (
          <div className="feed-rail" style={{ gap: 14, marginTop: 18 }}>
            {radar.map((item) => (
              <RadarRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* DiscoverExplorer reads the filters out of the URL, which needs a
          boundary. force-dynamic already sidesteps the prerender error, but
          relying on that is how it breaks later. */}
      <Suspense fallback={null}>
        <DiscoverExplorer feed={feed} signals={signalsRecord} />
      </Suspense>
    </main>
  );
}
