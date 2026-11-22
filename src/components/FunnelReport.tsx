"use client";

import { ARTIFACT_BY_ID, MECHANIC_BY_ID } from "@/lib/catalog/blocks";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { timeAgo } from "@/lib/activity";
import type { Cohort, Concentration, FunnelReport as Report } from "@/lib/funnel";

/**
 * The funnel, rendered. Presentation only - it takes a finished report and
 * draws it, so the numbers can be checked against a fixture without an admin
 * session, and `buildFunnel()` stays the single place any of them are
 * decided.
 */

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Catalogue ids are not written for people; the labels are. */
const label = {
  artifacts: (id: string) => ARTIFACT_BY_ID.get(id)?.label ?? id,
  mechanics: (id: string) => MECHANIC_BY_ID.get(id)?.label ?? id,
  domains: (id: string) => DOMAIN_BY_ID.get(id)?.label ?? id,
};

export default function FunnelReport({ report }: { report: Report }) {
  const { stages, evidence } = report;
  const top = stages[0]?.count ?? 0;

  if (report.generatedTotal === 0) {
    return (
      <div className="empty">
        <p>Nothing generated yet — there is no funnel to measure.</p>
      </div>
    );
  }

  return (
    <>
      {/* --- The ladder ------------------------------------------------- */}
      <section className="section">
        <h2>The funnel</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Each step is a strict subset of the one above it. Bars are drawn against the top of the
          funnel, not against each other, so the drop-off is what you see.
        </p>

        <div className="card" style={{ marginTop: 14 }}>
          {stages.map((s) => (
            <div key={s.key} className="funnel-step">
              <div className="funnel-step-head">
                <span className="funnel-step-label">{s.label}</span>
                <span className="funnel-step-n">
                  {s.count}
                  {s.ofPrevious !== null && (
                    <span className="funnel-step-drop"> · {pct(s.ofPrevious)} of previous</span>
                  )}
                </span>
              </div>
              <div className="funnel-bar">
                <div
                  className="funnel-bar-fill"
                  style={{ width: `${top ? (s.count / top) * 100 : 0}%` }}
                />
              </div>
              <p className="funnel-step-blurb">{s.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Evidence of work -------------------------------------------- */}
      <section className="section">
        <h2>Evidence of work</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Not a stage — a project can be marked shipped without ever writing a line. This is
          whether anything was visible while it happened, which is what the whole club feed is
          built on.
        </p>

        <div className="meter-grid" style={{ marginTop: 14 }}>
          <Stat
            n={evidence.committed ? pct(evidence.withLog / evidence.committed) : "—"}
            label={`of committed projects have a build log (${evidence.withLog}/${evidence.committed})`}
          />
          <Stat n={String(evidence.logs)} label="build-log entries, all time" />
          <Stat
            n={evidence.medianLogsPerLogged?.toString() ?? "—"}
            label="median entries, where there are any"
          />
          <Stat n={String(evidence.shippedWithoutLog)} label="shipped with no log at all" />
        </div>

        {evidence.logs === 0 && (
          <div className="notice insight" style={{ marginTop: 16 }}>
            <strong>No build logs exist.</strong> The home feed, Project Radar, the weekly digest
            and the follow feed all read from this table. Until something is written here, every
            one of them has nothing to show — the social layer is not underperforming, it is
            unsupplied.
          </div>
        )}
      </section>

      {/* --- Finishers vs stallers ---------------------------------------- */}
      <section className="section">
        <h2>Do the ones people finish look different?</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          The test for &ldquo;briefs are too big&rdquo;. If stalled projects are consistently
          harder or longer than the ones that get finished, the generator is aiming too high by
          default.
        </p>
        <div className="grid-2" style={{ marginTop: 14 }}>
          <CohortCard cohort={report.shipped} />
          <CohortCard cohort={report.stalled} />
        </div>
        {(report.shipped.n < 5 || report.stalled.n < 5) && (
          <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            Sample sizes are small — read these as a direction to check, not a result.
          </p>
        )}
      </section>

      {/* --- Effort mix ---------------------------------------------------- */}
      <section className="section">
        <h2>How big is a typical brief?</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Across everything issued. This needs no outcome data at all — if most briefs are a term
          long, that is a decision the generator is making for every member.
        </p>
        <Bars rows={report.estimateMix} total={report.generatedTotal} />
      </section>

      {/* --- Coming back ---------------------------------------------------- */}
      <section className="section">
        <h2>Does anyone come back?</h2>
        <div className="meter-grid" style={{ marginTop: 14 }}>
          <Stat n={String(report.returnRate.generatedAtAll)} label="members who generated at all" />
          <Stat
            n={String(report.returnRate.onMoreThanOneDay)}
            label="came back on a different day"
          />
          <Stat
            n={report.daysSinceLastGeneration?.toString() ?? "—"}
            label="days since the last generation"
          />
          <Stat
            n={report.daysSinceLastLog?.toString() ?? "never"}
            label="days since the last build log"
          />
        </div>
      </section>

      {/* --- Per member ------------------------------------------------------ */}
      <section className="section">
        <h2>Per member</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Admin-only on purpose: this is who has finished what, and it is not a leaderboard the
          club should be able to browse.
        </p>
        <div className="card" style={{ marginTop: 14, overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Gen</th>
                <th>Triaged</th>
                <th>Kept</th>
                <th>Logged</th>
                <th>Shipped</th>
                <th>Days active</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {report.members.map((m) => (
                <tr key={m.handle} data-idle={m.generated === 0 ? "true" : "false"}>
                  <td className="mono">@{m.handle}</td>
                  <td>{m.generated}</td>
                  <td>{m.triaged}</td>
                  <td>{m.committed}</td>
                  <td>{m.logged}</td>
                  <td>{m.shipped}</td>
                  <td>{m.activeDays}</td>
                  <td className="muted">{m.lastSeen ? timeAgo(m.lastSeen) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- What actually got issued ----------------------------------------- */}
      <section className="section">
        <h2>What the catalogue actually handed out</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          The audit script simulates draws; this is what real members were really given. A leader
          above roughly a third means the engine is leaning on one answer.
        </p>
        <div className="grid-3" style={{ marginTop: 14 }}>
          <ConcentrationCard
            title="Shipping format"
            c={report.concentration.artifacts}
            total={report.generatedTotal}
            name={label.artifacts}
          />
          <ConcentrationCard
            title="Technical crux"
            c={report.concentration.mechanics}
            total={report.generatedTotal}
            name={label.mechanics}
          />
          <ConcentrationCard
            title="Domain"
            c={report.concentration.domains}
            total={report.generatedTotal}
            name={label.domains}
          />
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          Problems keep the prose they were issued with, so these counts include every brief from
          before the generator was reworked. Expect the leader&rsquo;s share to fall as new ones
          accumulate rather than to change retroactively.
        </p>
      </section>
    </>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="stat">{n}</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function CohortCard({ cohort }: { cohort: Cohort }) {
  return (
    <div className="card">
      <div className="block-label">{cohort.label}</div>
      <div className="stat" style={{ marginTop: 6 }}>
        {cohort.n}
      </div>
      <dl className="kv">
        <dt>Median difficulty</dt>
        <dd className="mono">{cohort.medianDifficulty?.toFixed(1) ?? "—"} / 5</dd>
        <dt>Median fit</dt>
        <dd className="mono">{cohort.medianFit === null ? "—" : pct(cohort.medianFit)}</dd>
      </dl>
      {cohort.estimates.length > 0 && (
        <>
          <div className="block-label" style={{ marginTop: 14 }}>
            Effort estimates
          </div>
          <ul className="plain-list">
            {cohort.estimates.map(([e, n]) => (
              <li key={e}>
                <span className="mono">{n}×</span> {e}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Bars({ rows, total }: { rows: [string, number][]; total: number }) {
  return (
    <div className="card" style={{ marginTop: 14 }}>
      {rows.map(([k, n]) => (
        <div key={k} className="funnel-step">
          <div className="funnel-step-head">
            <span>{k}</span>
            <span className="funnel-step-n">
              {n} · {pct(total ? n / total : 0)}
            </span>
          </div>
          <div className="funnel-bar">
            <div
              className="funnel-bar-fill"
              style={{ width: `${total ? (n / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConcentrationCard({
  title,
  c,
  total,
  name,
}: {
  title: string;
  c: Concentration;
  total: number;
  name: (id: string) => string;
}) {
  return (
    <div className="card">
      <div className="block-label">{title}</div>
      <div className="row" style={{ gap: 8, alignItems: "baseline", marginTop: 6 }}>
        <span className="stat" style={{ fontSize: 20 }}>
          {pct(c.leaderShare)}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          top share · {c.distinct} distinct
        </span>
      </div>
      <ul className="plain-list" style={{ marginTop: 10 }}>
        {c.top.map(([id, n]) => (
          <li key={id}>
            <div className="conc-row">
              <span className="clamp-2">{name(id)}</span>
              <span className="mono muted">{pct(total ? n / total : 0)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
