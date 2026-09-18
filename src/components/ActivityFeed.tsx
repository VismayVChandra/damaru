import Link from "next/link";
import { timeAgo } from "@/lib/activity";
import { ACTIVITY_TONE, type ActivityItem } from "@/lib/activity-feed";
import { BUILD_LOG_META, STATUS_LABEL } from "@/lib/status";

/** The icon and dot tone for one item. Build logs defer to BUILD_LOG_META
 * rather than restating its five icons - one vocabulary, two entry points. */
function look(item: ActivityItem): { icon: string; tone: string } {
  if (item.kind === "build_log") {
    const meta = BUILD_LOG_META[item.logKind];
    return { icon: meta.icon, tone: meta.tone };
  }
  const icons: Record<Exclude<ActivityItem["kind"], "build_log">, string> = {
    started: "✦",
    forked: "↗",
    status_moved: "→",
    shipped: "🚀",
    role_opened: "＋",
    joined: "🤝",
  };
  return { icon: icons[item.kind], tone: ACTIVITY_TONE[item.kind] };
}

/** WHO did WHAT to WHICH PROJECT. The project link is shared by every variant,
 * so it is passed in rather than repeated seven times. */
function sentence(item: ActivityItem, project: React.ReactNode): React.ReactNode {
  const who = (
    <Link href={`/u/${item.actor.handle}`} className="handle-link" style={{ fontWeight: 600 }}>
      @{item.actor.handle}
    </Link>
  );

  switch (item.kind) {
    case "started":
      return <>{who} started {project}</>;
    case "forked":
      return (
        <>
          {who} forked {project}
          {item.sourceTitle && item.sourceId && (
            <>
              {" "}
              from{" "}
              <Link href={`/p/${item.sourceId}`} className="inline-link">
                {item.sourceTitle}
              </Link>
            </>
          )}
        </>
      );
    case "status_moved":
      return <>{who} moved {project} to {STATUS_LABEL[item.status]}</>;
    case "shipped":
      return <>{who} shipped {project}</>;
    case "role_opened":
      return <>{who} is looking for {item.roleName ? <b>{item.roleName}</b> : "someone"} on {project}</>;
    case "joined":
      return (
        <>
          {who} joined {project}
          {item.roleName && <> as {item.roleName}</>}
        </>
      );
    case "build_log": {
      // Authorship was only recorded from migration 011 on. Where it is
      // missing the actor is the owner by convention rather than by record, so
      // phrase it around the project instead of asserting who wrote it.
      const label = BUILD_LOG_META[item.logKind].label.toLowerCase();
      if (!item.actorIsExact) {
        return (
          <>
            {project} — {item.logKind === "progress" ? "an update" : label}
          </>
        );
      }
      if (item.logKind === "blocked") return <>{who} is blocked on {project}</>;
      if (item.logKind === "looking_for_help") return <>{who} needs a hand with {project}</>;
      if (item.logKind === "milestone") return <>{who} hit a milestone on {project}</>;
      if (item.logKind === "shipped") return <>{who} shipped {project}</>;
      return <>{who} posted an update on {project}</>;
    }
  }
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="feed-rail" style={{ gap: 0 }}>
      {items.map((item) => {
        const { icon, tone } = look(item);
        const project = (
          <Link href={`/p/${item.project.id}`} className="handle-link" style={{ fontWeight: 600 }}>
            {item.project.title}
          </Link>
        );

        return (
          <div key={item.id} className="feed-row activity-row" data-tone={tone}>
            <span aria-hidden="true">{icon}</span>
            <span>
              {sentence(item, project)}
              {item.kind === "build_log" && (
                <span className="activity-said">
                  &ldquo;{item.body}&rdquo;
                  {item.linkUrl && (
                    <>
                      {" "}
                      <a href={item.linkUrl} className="inline-link" target="_blank" rel="noreferrer noopener">
                        link ↗
                      </a>
                    </>
                  )}
                </span>
              )}
            </span>
            <time className="activity-when" dateTime={item.at} title={new Date(item.at).toLocaleString()}>
              {timeAgo(item.at)}
            </time>
          </div>
        );
      })}
    </div>
  );
}
