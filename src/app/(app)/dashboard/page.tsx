"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProblemCard from "@/components/ProblemCard";
import { api } from "@/lib/client";
import { checklistProgress, idleDays } from "@/lib/activity";
import { recurringGap } from "@/lib/pairing";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";
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
  const [state, setState] = useState<"loading" | "ready" | "no-profile">("loading");

  // Auth is already guaranteed by the (app) layout - the only thing left to
  // find out is whether this account has a profile yet.
  useEffect(() => {
    api<{ problems: Problem[]; profile: Profile | null }>("/api/problems")
      .then(({ problems, profile }) => {
        setProblems(problems);
        setProfile(profile);
        setState(profile ? "ready" : "no-profile");
      })
      .catch(() => setState("no-profile"));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: problems.length };
    for (const p of problems) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [problems]);

  // Momentum, not inventory: what's moving, what's finished, what has gone
  // quiet. A raw count of issued problems rewards collecting them.
  const momentum = useMemo(() => {
    const shipped = problems.filter((p) => p.status === "shipped").length;
    const building = problems.filter((p) => p.status === "building").length;
    const idle = problems.filter((p) => idleDays(p) !== null).length;
    const ticks = problems.reduce((n, p) => n + checklistProgress(p).done, 0);
    const logged = problems.reduce((n, p) => n + (p.progress?.length ?? 0), 0);
    return { shipped, building, idle, ticks, logged };
  }, [problems]);

  const gap = useMemo(() => recurringGap(problems), [problems]);

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

  if (state === "no-profile") {
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
          : "Tick off requirements as you clear them and log what moved. The club feed leads with shipped work, so this is what puts you on it."}
      </p>

      {problems.length > 0 && (
        <div className="row section" style={{ gap: 28 }}>
          <div>
            <div className="stat">{momentum.shipped}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              shipped
            </div>
          </div>
          <div>
            <div className="stat">{momentum.building}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              in progress
            </div>
          </div>
          <div>
            <div className="stat">{momentum.ticks}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              {momentum.ticks === 1 ? "box ticked" : "boxes ticked"}
            </div>
          </div>
          <div>
            <div className="stat">{momentum.logged}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              {momentum.logged === 1 ? "progress note" : "progress notes"}
            </div>
          </div>
          {momentum.idle > 0 && (
            <div>
              <div className="stat" style={{ color: "var(--warn)" }}>
                {momentum.idle}
              </div>
              <div className="faint" style={{ fontSize: 13 }}>
                gone quiet
              </div>
            </div>
          )}
        </div>
      )}

      {gap && (
        <section className="card section insight">
          <div className="block-label">A pattern worth noticing</div>
          <p style={{ marginTop: 8, fontSize: 15.5 }}>
            <b>{CATEGORY_LABELS[gap.category]}</b> has been the stretch in {gap.count} of your{" "}
            {gap.total} problems.{" "}
            <Link href="/pair" style={{ color: "var(--ember)" }}>
              See who covers it
            </Link>
            .
          </p>
        </section>
      )}

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
