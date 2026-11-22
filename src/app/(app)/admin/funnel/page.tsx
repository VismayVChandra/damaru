"use client";

import { useEffect, useState } from "react";
import DamaruSpinner from "@/components/DamaruSpinner";
import FunnelReport from "@/components/FunnelReport";
import { api } from "@/lib/client";
import type { FunnelReport as Report } from "@/lib/funnel";

/**
 * Fetches the report and hands it to the view. Everything that decides a
 * number lives in `lib/funnel.ts`; everything that draws one lives in
 * `components/FunnelReport.tsx`. This file is only the wiring and the two
 * states it can be in before the data arrives.
 */
export default function FunnelPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    api<{ report: Report }>("/api/admin/funnel")
      .then(({ report }) => {
        setReport(report);
        setState("ready");
      })
      .catch(() => setState("denied"));
  }, []);

  if (state === "denied") {
    return (
      <main className="shell shell-narrow">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>Not an admin</h2>
          <p className="muted" style={{ maxWidth: "46ch", margin: "12px auto 0" }}>
            Outcome data is per-member, so it needs <code>is_admin</code> on your profile — set by
            hand in the database, never through the app.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">Instrumentation</div>
      <h1>What happens after a brief is issued</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Generating is the easy half. This is the other one — how far a problem gets once somebody
        has it, and where it stops. Every number here is counted from <code>problems</code> and{" "}
        <code>progress_entries</code>; nothing is estimated.
      </p>

      {state === "loading" || !report ? (
        <div className="empty">
          <DamaruSpinner size={32} />
        </div>
      ) : (
        <FunnelReport report={report} />
      )}
    </main>
  );
}
