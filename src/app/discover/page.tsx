import Link from "next/link";
import DiscoverExplorer from "@/components/DiscoverExplorer";
import WeeklyDigest from "@/components/WeeklyDigest";
import {
  attachEngagement,
  countFollowing,
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
  const viewer = await getCurrentUser();
  const feed: FeedItem[] = await attachEngagement(await listFeed(300), viewer?.id ?? null);

  const sinceISO = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recentCounts = await getRecentEngagementCounts(feed.map((p) => p.id), sinceISO);
  const radar = rankRadar(feed, recentCounts, sinceISO).slice(0, 6);

  let digest = null;
  if (viewer) {
    const followingCount = await countFollowing(viewer.id);
    const activity =
      followingCount > 0
        ? await listFollowingActivity(viewer.id, sinceISO)
        : { newProblems: [], progressEntries: [] };
    digest = { followingCount, ...activity };
  }

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

      <DiscoverExplorer feed={feed} canEngage={Boolean(viewer)} />
    </main>
  );
}
