"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ProjectCard from "@/components/ProjectCard";
import { DOMAINS } from "@/lib/catalog/domains";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";
import { problemSkillCategories } from "@/lib/discover";
import type { ProjectSignals } from "@/lib/db";
import type { Problem, SkillCategory } from "@/lib/types";

type FeedItem = Problem & { handle: string };

const DOMAIN_IDS = new Set(DOMAINS.map((d) => d.id));
const CATEGORY_IDS = new Set(Object.keys(CATEGORY_LABELS) as SkillCategory[]);

/** Anything unrecognised is dropped rather than matched, so a stale or
 * hand-edited ?domain=banana behaves exactly like no filter at all. */
function readSet<T extends string>(sp: URLSearchParams, key: string, allowed: Set<T>): Set<T> {
  const out = new Set<T>();
  for (const raw of sp.getAll(key)) {
    const value = raw.toLowerCase() as T;
    if (allowed.has(value)) out.add(value);
  }
  return out;
}

export default function DiscoverExplorer({
  feed,
  signals,
}: {
  feed: FeedItem[];
  signals: Record<string, ProjectSignals>;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // The URL is the only state. Nothing to keep in sync, so refresh, a pasted
  // link and back/forward all land on the same view for free.
  const domains = useMemo(
    () => readSet(new URLSearchParams(searchParams.toString()), "domain", DOMAIN_IDS),
    [searchParams],
  );
  const categories = useMemo(
    () => readSet(new URLSearchParams(searchParams.toString()), "skill", CATEGORY_IDS),
    [searchParams],
  );

  /**
   * Native history rather than router.replace: /discover is force-dynamic, so
   * a router navigation would re-run the whole Server Component - and refetch
   * 300 projects - on every chip click, for data the browser already holds.
   *
   * pushState rather than replaceState, so Back undoes the last filter instead
   * of leaving the page. It costs an entry per chip, which is the usual bargain
   * for faceted search.
   */
  function apply(nextDomains: Set<string>, nextCategories: Set<SkillCategory>) {
    const qs = new URLSearchParams();
    for (const d of nextDomains) qs.append("domain", d);
    for (const c of nextCategories) qs.append("skill", c);
    const query = qs.toString();
    window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  function toggleDomain(id: string) {
    const next = new Set(domains);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next, categories);
  }

  function toggleCategory(id: SkillCategory) {
    const next = new Set(categories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(domains, next);
  }

  const matches = useMemo(() => {
    return feed.filter((p) => {
      if (domains.size > 0 && !domains.has(p.dna.domainId)) return false;
      if (categories.size > 0) {
        const has = problemSkillCategories(p).some((c) => categories.has(c));
        if (!has) return false;
      }
      return true;
    });
  }, [feed, domains, categories]);

  const anyFilter = domains.size > 0 || categories.size > 0;

  return (
    <section className="section">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>Everything</h2>
        <span className="faint mono" style={{ fontSize: 12 }}>
          {matches.length}
        </span>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="block-label">Domain</div>
        <div className="chip-wrap" style={{ marginTop: 7 }}>
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              type="button"
              className="chip"
              data-on={domains.has(d.id) ? "true" : "false"}
              onClick={() => toggleDomain(d.id)}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="block-label">Skill</div>
        <div className="chip-wrap" style={{ marginTop: 7 }}>
          {(Object.entries(CATEGORY_LABELS) as [SkillCategory, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="chip"
              data-on={categories.has(id) ? "true" : "false"}
              onClick={() => toggleCategory(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {anyFilter && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginTop: 14 }}
          onClick={() => apply(new Set(), new Set())}
        >
          Clear filters
        </button>
      )}

      {matches.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          <p>Nothing matches these filters.</p>
        </div>
      ) : (
        <div className="grid-3" style={{ marginTop: 18 }}>
          {matches.map((p) => (
            <ProjectCard key={p.id} problem={p} signals={signals[p.id] ?? null} />
          ))}
        </div>
      )}
    </section>
  );
}
