import Link from "next/link";
import ActivityFeed from "@/components/ActivityFeed";
import ProjectCard from "@/components/ProjectCard";
import {
  attachEngagement,
  getProfileById,
  getProjectSignals,
  listClubActivitySources,
  listFeed,
  listFollowingIds,
  listProblemsWhereMember,
} from "@/lib/db";
import { buildActivityFeed, filterByFollowing } from "@/lib/activity-feed";
import { rankMatches } from "@/lib/match";
import { ACTIVE_STATUSES } from "@/lib/status";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Problem } from "@/lib/types";

export const dynamic = "force-dynamic";

type FeedItem = Problem & { handle: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function Section({
  title,
  blurb,
  count,
  children,
}: {
  title: string;
  blurb?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>{title}</h2>
        {count !== undefined && (
          <span className="faint mono" style={{ fontSize: 12 }}>
            {count}
          </span>
        )}
      </div>
      {blurb && (
        <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
          {blurb}
        </p>
      )}
      <div style={{ marginTop: 18 }}>{children}</div>
    </section>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  // The (app) layout already redirects anyone signed out, so a user is
  // guaranteed here - this is just to satisfy the types.
  if (!user) return null;

  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const [profile, feedRaw, sources, followingIds, memberOf] = await Promise.all([
    getProfileById(user.id),
    listFeed(300),
    listClubActivitySources(since),
    listFollowingIds(user.id),
    listProblemsWhereMember(user.id),
  ]);

  // A young club has weeks of nothing. Rather than show an empty hero, widen
  // the window to everything - it costs a second call only when it is needed.
  let items = buildActivityFeed(sources, { limit: 25 });
  if (items.length < 8) {
    items = buildActivityFeed(await listClubActivitySources(new Date(0).toISOString()), { limit: 25 });
  }

  const feed: FeedItem[] = await attachEngagement(feedRaw, user.id);
  const followingSet = new Set(followingIds);
  const memberIds = new Set(memberOf.map((p) => p.id));

  const building = feed.filter((p) => ACTIVE_STATUSES.includes(p.status));
  const shipped = feed.filter((p) => p.status === "shipped");
  const needHelp = feed.filter((p) => p.progress?.[0]?.kind === "looking_for_help");

  // Signals only for what actually renders - a few dozen, never all 300.
  const candidates = [...building, ...shipped, ...needHelp].slice(0, 60);
  const signals = await getProjectSignals(
    [...new Map(candidates.map((p) => [p.id, p])).values()].map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
    })),
  );

  const byActivity = (a: FeedItem, b: FeedItem) =>
    (signals.get(b.id)?.lastActivityAt ?? b.createdAt).localeCompare(
      signals.get(a.id)?.lastActivityAt ?? a.createdAt,
    );

  const buildingNow = [...building].sort(byActivity).slice(0, 6);
  const lookingForHelp = needHelp.sort(byActivity).slice(0, 3);
  const lookingForTeam = building
    .filter((p) => (signals.get(p.id)?.openRoles ?? 0) > 0)
    .sort(byActivity)
    .slice(0, 6);
  const justShipped = [...shipped]
    .sort((a, b) => (b.statusChangedAt ?? b.createdAt).localeCompare(a.statusChangedAt ?? a.createdAt))
    .slice(0, 3);
  const matches = profile ? rankMatches(profile, feed, signals, memberIds).slice(0, 3) : [];
  const following = filterByFollowing(items, followingSet).slice(0, 10);

  if (feed.length === 0) {
    return (
      <main className="shell">
        <div className="eyebrow">Home</div>
        <h1>What are you building?</h1>
        <div className="empty">
          <p>Nothing has been built here yet. Someone has to go first.</p>
          <Link href="/generate" className="btn btn-primary" style={{ marginTop: 12 }}>
            Get a problem
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">Home</div>
      <h1>What are you building?</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        See what people are building, find something worth joining, or start your own.
      </p>
      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <Link href="/generate" className="btn btn-primary">
          Generate a problem
        </Link>
        <Link href="/discover" className="btn">
          Discover projects
        </Link>
      </div>

      {items.length > 0 ? (
        <Section title="Right now" blurb="Everything that has actually moved, newest first.">
          <ActivityFeed items={items} />
        </Section>
      ) : (
        <Section title="Right now">
          <div className="empty">
            <p>Quiet so far — be the thing that happens.</p>
            <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 12 }}>
              Log some progress
            </Link>
          </div>
        </Section>
      )}

      {buildingNow.length > 0 && (
        <Section
          title="Building right now"
          blurb="Actively being worked on. The build log is the evidence."
          count={building.length}
        >
          <div className="grid-3">
            {buildingNow.map((p) => (
              <ProjectCard key={p.id} problem={p} signals={signals.get(p.id) ?? null} />
            ))}
          </div>
        </Section>
      )}

      {followingSet.size > 0 ? (
        following.length > 0 && (
          <Section title="From people you follow" blurb="Only the things that count as work.">
            <ActivityFeed items={following} />
          </Section>
        )
      ) : (
        <Section title="From people you follow">
          <div className="empty">
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
        </Section>
      )}

      <Section
        title="Looking for help"
        blurb="Someone is stuck on something you might already know."
      >
        {lookingForHelp.length === 0 ? (
          <p className="faint" style={{ fontSize: 13.5 }}>
            Nobody&apos;s stuck right now.
          </p>
        ) : (
          <div className="grid-2">
            {lookingForHelp.map((p) => (
              <ProjectCard
                key={p.id}
                problem={p}
                signals={signals.get(p.id) ?? null}
                highlightLog
                cta={{ href: `/p/${p.id}`, label: "Help out" }}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Looking for teammates" blurb="Published roles, waiting on someone.">
        {lookingForTeam.length === 0 ? (
          <p className="faint" style={{ fontSize: 13.5 }}>
            No open roles right now.
          </p>
        ) : (
          <div className="grid-3">
            {lookingForTeam.map((p) => (
              <ProjectCard
                key={p.id}
                problem={p}
                signals={signals.get(p.id) ?? null}
                cta={{ href: `/p/${p.id}`, label: "See the roles" }}
              />
            ))}
          </div>
        )}
      </Section>

      {matches.length > 0 && (
        <Section
          title="Projects matching you"
          blurb="Scored against your skills and interests — not someone else's."
        >
          <div className="grid-3">
            {matches.map((m) => (
              <ProjectCard
                key={m.problem.id}
                problem={m.problem}
                signals={signals.get(m.problem.id) ?? null}
                viewerFit={m.viewerFit}
                reasons={m.reasons}
              />
            ))}
          </div>
        </Section>
      )}

      {justShipped.length > 0 && (
        <Section title="🚀 Just shipped" blurb="Finished, in someone's hands, done." count={shipped.length}>
          <div className="grid-3">
            {justShipped.map((p) => (
              <ProjectCard key={p.id} problem={p} signals={signals.get(p.id) ?? null} showCover />
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
