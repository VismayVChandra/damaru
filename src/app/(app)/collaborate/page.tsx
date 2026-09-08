"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/catalog/skills";
import DamaruSpinner from "@/components/DamaruSpinner";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/activity";
import type { CollabRequest, Problem } from "@/lib/types";

type Tab = "browse" | "requests";
type OpenProblem = Problem & { handle: string };

export default function CollaboratePage() {
  const [tab, setTab] = useState<Tab>("browse");
  const [open, setOpen] = useState<OpenProblem[]>([]);
  const [incoming, setIncoming] = useState<CollabRequest[]>([]);
  const [outgoing, setOutgoing] = useState<CollabRequest[]>([]);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(() => {
    setState("loading");
    Promise.all([
      api<{ problems: OpenProblem[] }>("/api/collaborate"),
      api<{ incoming: CollabRequest[]; outgoing: CollabRequest[] }>("/api/collab-requests"),
      api<{ profile: { handle: string } | null }>("/api/me"),
    ])
      .then(([openRes, reqRes, meRes]) => {
        setOpen(openRes.problems);
        setIncoming(reqRes.incoming);
        setOutgoing(reqRes.outgoing);
        setMe(meRes.profile?.handle ?? null);
      })
      .finally(() => setState("ready"));
  }, []);

  useEffect(() => load(), [load]);

  async function respond(id: string, status: "accepted" | "declined") {
    setIncoming((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await api(`/api/collab-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      load();
    }
  }

  const pendingIncoming = incoming.filter((r) => r.status === "pending");
  const answeredIncoming = incoming.filter((r) => r.status !== "pending");

  return (
    <main className="shell">
      <div className="eyebrow">Collaborate</div>
      <h1>Build it with someone</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Flag a problem you&apos;re building as open, or browse what everyone else has flagged.
        Requests only ever go to the two people involved.
      </p>

      <div className="row section" style={{ gap: 8 }}>
        <button
          className="chip"
          data-on={tab === "browse" ? "true" : "false"}
          onClick={() => setTab("browse")}
        >
          Browse
          <span className="faint mono" style={{ fontSize: 11 }}>
            {open.length}
          </span>
        </button>
        <button
          className="chip"
          data-on={tab === "requests" ? "true" : "false"}
          onClick={() => setTab("requests")}
        >
          My requests
          {pendingIncoming.length > 0 && (
            <span className="faint mono" style={{ fontSize: 11, color: "var(--ember)" }}>
              {pendingIncoming.length}
            </span>
          )}
        </button>
      </div>

      {state === "loading" ? (
        <div className="empty">
          <DamaruSpinner size={32} />
        </div>
      ) : tab === "browse" ? (
        open.length === 0 ? (
          <div className="empty">
            <p>Nothing open right now.</p>
            <p className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>
              A problem shows up here once its owner flags it as open to collaborators, from the{" "}
              <Link href="/dashboard" style={{ color: "var(--ember)" }}>
                dashboard
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="stack section" style={{ gap: 14 }}>
            {open.map((p) => (
              <OpenProblemCard
                key={p.id}
                problem={p}
                isMine={p.handle === me}
                alreadyRequested={outgoing.some(
                  (r) => r.problemId === p.id && r.status === "pending",
                )}
                onSent={load}
              />
            ))}
          </div>
        )
      ) : (
        <div className="section">
          <section>
            <h2>Incoming</h2>
            {pendingIncoming.length === 0 ? (
              <p className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>
                Nothing waiting on you.
              </p>
            ) : (
              <div className="stack" style={{ gap: 12, marginTop: 14 }}>
                {pendingIncoming.map((r) => (
                  <IncomingRequestCard key={r.id} request={r} onRespond={respond} />
                ))}
              </div>
            )}
          </section>

          {answeredIncoming.length > 0 && (
            <section className="section">
              <h3>Answered</h3>
              <div className="stack" style={{ gap: 10, marginTop: 12 }}>
                {answeredIncoming.map((r) => (
                  <RequestHistoryRow key={r.id} request={r} direction="incoming" />
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <h2>Sent</h2>
            {outgoing.length === 0 ? (
              <p className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>
                You haven&apos;t asked anyone yet.
              </p>
            ) : (
              <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                {outgoing.map((r) => (
                  <RequestHistoryRow key={r.id} request={r} direction="outgoing" />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function OpenProblemCard({
  problem,
  isMine,
  alreadyRequested,
  onSent,
}: {
  problem: OpenProblem;
  isMine: boolean;
  alreadyRequested: boolean;
  onSent: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const needs = [...new Set([...problem.fit.gaps, ...problem.fit.stretch])];

  async function send() {
    setSending(true);
    setError(null);
    try {
      await api(`/api/problems/${problem.id}/collab-requests`, {
        method: "POST",
        body: JSON.stringify({ message: message.trim() }),
      });
      setSent(true);
      setComposing(false);
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
        <span className="chip chip-static">
          {problem.domainIcon} {problem.domainLabel}
        </span>
        <Link href={`/u/${problem.handle}`} className="faint mono" style={{ fontSize: 11.5 }}>
          @{problem.handle}
        </Link>
      </div>

      <p style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>{problem.title}</p>
      <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
        {problem.hook}
      </p>

      {needs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="block-label">Could use a hand with</div>
          <div className="chip-wrap" style={{ marginTop: 7 }}>
            {needs.map((c) => (
              <span key={c} className="chip chip-static" style={{ color: "var(--cool)", borderColor: "var(--cool)" }}>
                {CATEGORY_LABELS[c]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 16, gap: 10 }}>
        {isMine ? (
          <span className="faint" style={{ fontSize: 13 }}>
            This is yours — manage it from the dashboard.
          </span>
        ) : sent || alreadyRequested ? (
          <span className="faint" style={{ fontSize: 13 }}>
            Request sent — waiting to hear back.
          </span>
        ) : composing ? (
          <div style={{ width: "100%" }}>
            <textarea
              className="textarea"
              value={message}
              maxLength={300}
              placeholder="Say what you'd bring, and why this one."
              onChange={(e) => setMessage(e.target.value)}
              style={{ minHeight: 60 }}
            />
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={send} disabled={sending}>
                {sending ? (
                  <>
                    <DamaruSpinner size={14} /> Sending…
                  </>
                ) : (
                  "Send request"
                )}
              </button>
              <button className="btn btn-sm" onClick={() => setComposing(false)} disabled={sending}>
                Cancel
              </button>
            </div>
            {error && (
              <p style={{ color: "var(--ember)", fontSize: 13, marginTop: 6 }}>{error}</p>
            )}
          </div>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={() => setComposing(true)}>
            Request to collaborate
          </button>
        )}
      </div>
    </div>
  );
}

function IncomingRequestCard({
  request,
  onRespond,
}: {
  request: CollabRequest;
  onRespond: (id: string, status: "accepted" | "declined") => void;
}) {
  return (
    <div className="card card-tight">
      <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
        <Link href={`/u/${request.fromHandle}`} className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: "inherit" }}>
          @{request.fromHandle}
        </Link>
        <span className="faint mono" style={{ fontSize: 11 }}>
          {timeAgo(request.createdAt)}
        </span>
      </div>
      {request.problemTitle ? (
        <p className="faint" style={{ fontSize: 13, marginTop: 6 }}>
          wants to join{" "}
          <span style={{ color: "var(--text)" }}>
            {request.problemDomainIcon} {request.problemTitle}
          </span>
        </p>
      ) : (
        <p className="faint" style={{ fontSize: 13, marginTop: 6 }}>wants to work together</p>
      )}
      {request.message && (
        <p style={{ marginTop: 8, fontSize: 14.5 }}>&ldquo;{request.message}&rdquo;</p>
      )}
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <button className="btn btn-sm btn-primary" onClick={() => onRespond(request.id, "accepted")}>
          Accept
        </button>
        <button className="btn btn-sm" onClick={() => onRespond(request.id, "declined")}>
          Decline
        </button>
      </div>
    </div>
  );
}

function RequestHistoryRow({
  request,
  direction,
}: {
  request: CollabRequest;
  direction: "incoming" | "outgoing";
}) {
  const other = direction === "incoming" ? request.fromHandle : request.toHandle;
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 10, fontSize: 13.5 }}>
      <span>
        <Link href={`/u/${other}`} style={{ color: "inherit" }}>
          @{other}
        </Link>{" "}
        <span className="faint">
          {request.problemTitle ? `— ${request.problemTitle}` : "— general request"}
        </span>
      </span>
      <span className="status" data-s={request.status === "accepted" ? "shipped" : "passed"}>
        {request.status}
      </span>
    </div>
  );
}
