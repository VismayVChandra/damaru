"use client";

import { useMemo, useState } from "react";
import ProblemCard from "@/components/ProblemCard";
import { DOMAINS } from "@/lib/catalog/domains";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";
import { problemSkillCategories } from "@/lib/discover";
import type { Problem, SkillCategory } from "@/lib/types";

type FeedItem = Problem & { handle: string };

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function DiscoverExplorer({ feed, canEngage }: { feed: FeedItem[]; canEngage: boolean }) {
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<SkillCategory>>(new Set());

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
              onClick={() => setDomains((prev) => toggle(prev, d.id))}
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
              onClick={() => setCategories((prev) => toggle(prev, id))}
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
          onClick={() => {
            setDomains(new Set());
            setCategories(new Set());
          }}
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
            <div key={p.id} className="card-hover">
              <ProblemCard problem={p} interactive={false} canEngage={canEngage} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
