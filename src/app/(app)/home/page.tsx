"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProblemCard from "@/components/ProblemCard";
import DamaruSpinner from "@/components/DamaruSpinner";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/activity";
import type { Problem } from "@/lib/types";

type FeedItem = Problem & { handle: string };

export default function HomePage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [state, setState] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    api<{ problems: FeedItem[]; followingCount: number }>("/api/home")
      .then(({ problems, followingCount }) => {
        setItems(problems);
        setFollowingCount(followingCount);
      })
      .finally(() => setState("ready"));
  }, []);

  if (state === "loading") {
    return (
      <main className="shell">
        <div className="empty">
          <DamaruSpinner size={32} />
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">Home</div>
      <h1>What people you follow are building</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        {followingCount === 0
          ? "You aren't following anyone yet - follow people whose work you want to see here."
          : "Newest saved, building or shipped work from the people you follow. Cheer it on, ask a question, or send a request to join in."}
      </p>

      {followingCount === 0 ? (
        <div className="empty">
          <p>Your feed is empty because you aren&apos;t following anyone.</p>
          <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 12 }}>
            <Link href="/browse" className="btn btn-primary">
              Explore the club
            </Link>
            <Link href="/pair" className="btn">
              Browse by expertise
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <p>Nobody you follow has anything saved, building or shipped yet.</p>
        </div>
      ) : (
        <div className="stack section" style={{ gap: 28 }}>
          {items.map((p) => (
            <div key={p.id}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <Link href={`/u/${p.handle}`} className="mono" style={{ fontWeight: 700, color: "inherit", fontSize: 14 }}>
                  @{p.handle}
                </Link>
                <span className="faint mono" style={{ fontSize: 11.5 }}>
                  {timeAgo(p.createdAt)}
                </span>
              </div>
              <ProblemCard problem={p} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
