"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProblemCard from "@/components/ProblemCard";
import { api, getHandle } from "@/lib/client";
import type { Problem, Profile } from "@/lib/types";

const FILTERS: { id: "all" | Problem["status"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "saved", label: "Saved" },
  { id: "building", label: "Building" },
  { id: "shipped", label: "Shipped" },
  { id: "passed", label: "Passed" },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filter, setFilter] = useState<"all" | Problem["status"]>("all");
  const [state, setState] = useState<"loading" | "ready" | "anon">("loading");

  useEffect(() => {
    const handle = getHandle();
    if (!handle) {
      setState("anon");
      return;
    }
    api<{ problems: Problem[]; profile: Profile }>(
      `/api/problems?handle=${encodeURIComponent(handle)}`,
    )
      .then(({ problems, profile }) => {
        setProblems(problems);
        setProfile(profile);
        setState("ready");
      })
      .catch(() => setState("anon"));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: problems.length };
    for (const p of problems) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [problems]);

  const shown = filter === "all" ? problems : problems.filter((p) => p.status === filter);

  if (state === "loading") {
    return (
      <main className="shell">
        <div className="empty">
          <span className="spin" />
        </div>
      </main>
    );
  }

  if (state === "anon") {
    return (
      <main className="shell shell-narrow">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>Nothing here yet</h2>
          <p className="muted" style={{ maxWidth: "44ch", margin: "12px auto 22px" }}>
            Build a profile and generate your first problem — this page is where it will live.
          </p>
          <Link href="/profile" className="btn btn-primary btn-lg">
            Build your profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">@{profile?.handle}</div>
      <h1>My problems</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        {problems.length === 0
          ? "You have not been issued anything yet."
          : `${problems.length} issued to you. Mark what you are actually building — the club feed shows the difference between collecting problems and finishing them.`}
      </p>

      <div className="row section" style={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className="chip"
            data-on={filter === f.id ? "true" : "false"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="faint mono" style={{ fontSize: 11 }}>
              {counts[f.id] ?? 0}
            </span>
          </button>
        ))}
        <span className="nav-spacer" />
        <Link href="/generate" className="btn btn-sm btn-primary">
          Generate more
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="empty">Nothing in this state.</div>
      ) : (
        <div className="stack section" style={{ gap: 24 }}>
          {shown.map((p) => (
            <ProblemCard key={p.id} problem={p} interactive />
          ))}
        </div>
      )}
    </main>
  );
}
