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
      <>
        <div className="empty">
          <p>No member has generated anything yet — there is no club funnel to measure.</p>
        </div>
        <TestSectionView t={report.test} />
      </>
    );
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 14 }}>
        Everything on this page counts <strong>club members only</strong>. AI and testing accounts
        are reported separately at the bottom, so the record shows how much was done by whom.
      </p>

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

      <TestSectionView t={report.test} />
    </>
  );
}

/**
 * The AI and testing accounts, as their own population. Same stages and same
 * definitions as the club's funnel above, so the two read side by side. The
 * point is a record: how much of what exists was done by a person and how much
 * by an account that cannot, for instance, ever be a treasurer's customer.
 */
function TestSectionView({ t }: { t: Report["test"] }) {
  if (!t.flagAvailable) {
    return (
      <section className="section">
        <h2>AI and test accounts</h2>
        <div className="notice insight" style={{ marginTop: 14 }}>
          <strong>Not separated yet.</strong> Run{" "}
          <code>supabase/migrations/013_test_accounts.sql</code> in the Supabase SQL editor. Until
          then there is no way to tell an AI account from a member, so everything above includes
          them.
        </div>
      </section>
    );
  }

  if (t.accounts.length === 0) {
    return (
      <section className="section">
        <h2>AI and test accounts</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          None are flagged. Set <code>is_test</code> on a profile and its activity moves here
          instead of into the club&rsquo;s numbers.
        </p>
      </section>
    );
  }

  const [, triaged, committed, shipped] = t.stages;

  return (
    <section className="section">
      <h2>AI and test accounts</h2>
      <p className="muted" style={{ marginTop: 4 }}>
        Kept on the record, kept out of the club&rsquo;s numbers above. Counted the same way, so
        the two compare directly.
      </p>

      <div className="meter-grid" style={{ marginTop: 14 }}>
        <Stat
          n={pct(t.shareOfAll.generated)}
          label={`of all briefs on record were theirs (${t.generated})`}
        />
        <Stat n={pct(t.shareOfAll.logs)} label={`of all build logs (${t.evidence.logs})`} />
        <Stat n={String(t.commentsWritten)} label="comments they wrote" />
        <Stat
          n={String(t.commentsFromMembers)}
          label="comments real members left on their work"
        />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="block-label">What they did with those briefs</div>
        <dl className="kv">
          <dt>Generated</dt>
          <dd className="mono">{t.generated}</dd>
          <dt>Triaged</dt>
          <dd className="mono">{triaged?.count ?? 0}</dd>
          <dt>Kept as projects</dt>
          <dd className="mono">{committed?.count ?? 0}</dd>
          <dt>Marked shipped</dt>
          <dd className="mono">{shipped?.count ?? 0}</dd>
        </dl>
      </div>

      <div className="card" style={{ marginTop: 14, overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Gen</th>
              <th>Triaged</th>
              <th>Kept</th>
              <th>Logged</th>
              <th>Shipped</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {t.accounts.map((m) => (
              <tr key={m.handle}>
                <td className="mono">@{m.handle}</td>
                <td>{m.generated}</td>
                <td>{m.triaged}</td>
                <td>{m.committed}</td>
                <td>{m.logged}</td>
                <td>{m.shipped}</td>
                <td className="muted">{m.lastSeen ? timeAgo(m.lastSeen) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {t.commentsFromMembers === 0 && (
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          No member has reacted to this work yet. Output that no person has responded to is the
          weakest kind of evidence here.
        </p>
      )}
    </section>
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
