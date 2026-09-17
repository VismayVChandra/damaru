"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import DamaruSpinner from "@/components/DamaruSpinner";
import type { ProjectRole } from "@/lib/types";

function ApplyForm({ roleId, problemId, onSent }: { roleId: string; problemId: string; onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    try {
      await api(`/api/problems/${problemId}/collab-requests`, {
        method: "POST",
        body: JSON.stringify({ roleId, message: message.trim() }),
      });
      setSent(true);
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className="faint" style={{ fontSize: 13 }}>
        Request sent — waiting to hear back.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        className="textarea"
        value={message}
        maxLength={300}
        placeholder="Say what you'd bring to this role."
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
            "Apply to this role"
          )}
        </button>
      </div>
      {error && <p style={{ color: "var(--ember)", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function PublishRoleForm({ problemId, onCreated }: { problemId: string; onCreated: (role: ProjectRole) => void }) {
  const [open, setOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [skills, setSkills] = useState("");
  const [countNeeded, setCountNeeded] = useState(1);
  const [description, setDescription] = useState("");
  const [commitment, setCommitment] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setSaving(true);
    setError(null);
    try {
      const { role } = await api<{ role: ProjectRole }>(`/api/problems/${problemId}/roles`, {
        method: "POST",
        body: JSON.stringify({
          roleName: roleName.trim(),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
          countNeeded,
          description: description.trim(),
          commitment: commitment.trim(),
          duration: duration.trim(),
        }),
      });
      onCreated(role);
      setRoleName("");
      setSkills("");
      setCountNeeded(1);
      setDescription("");
      setCommitment("");
      setDuration("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish that.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        Publish a role
      </button>
    );
  }

  return (
    <div className="card card-tight" style={{ marginTop: 10 }}>
      <div className="grid-2">
        <div>
          <label className="label" htmlFor="role-name">
            Role
          </label>
          <input
            id="role-name"
            className="input"
            value={roleName}
            placeholder="UI/UX Designer"
            onChange={(e) => setRoleName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="role-count">
            Seats needed
          </label>
          <input
            id="role-count"
            className="input"
            type="number"
            min={1}
            max={20}
            value={countNeeded}
            onChange={(e) => setCountNeeded(Number(e.target.value) || 1)}
          />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label className="label" htmlFor="role-skills">
          Skills (comma separated)
        </label>
        <input
          id="role-skills"
          className="input"
          value={skills}
          placeholder="Figma, Design systems"
          onChange={(e) => setSkills(e.target.value)}
        />
      </div>
      <div className="grid-2" style={{ marginTop: 12 }}>
        <div>
          <label className="label" htmlFor="role-commitment">
            Commitment
          </label>
          <input
            id="role-commitment"
            className="input"
            value={commitment}
            placeholder="3-5 hours/week"
            onChange={(e) => setCommitment(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="role-duration">
            Duration
          </label>
          <input
            id="role-duration"
            className="input"
            value={duration}
            placeholder="Weekend project"
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label className="label" htmlFor="role-description">
          Anything else
        </label>
        <textarea
          id="role-description"
          className="textarea"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 60 }}
        />
      </div>
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <button
          className="btn btn-sm btn-primary"
          onClick={publish}
          disabled={saving || roleName.trim().length < 2}
        >
          {saving ? (
            <>
              <DamaruSpinner size={14} /> Publishing…
            </>
          ) : (
            "Publish"
          )}
        </button>
        <button className="btn btn-sm" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </button>
      </div>
      {error && <p style={{ color: "var(--ember)", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

export default function OpenRoles({
  problemId,
  roles: initialRoles,
  isOwner,
  canApply,
  signedIn,
}: {
  problemId: string;
  roles: ProjectRole[];
  isOwner: boolean;
  /** Signed in, not the owner, and not already on the team. */
  canApply: boolean;
  signedIn: boolean;
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  async function closeRole(roleId: string) {
    const previous = roles;
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, open: false } : r)));
    try {
      await api(`/api/problems/${problemId}/roles/${roleId}`, {
        method: "PATCH",
        body: JSON.stringify({ open: false }),
      });
    } catch {
      setRoles(previous);
    }
  }

  async function deleteRole(roleId: string) {
    const previous = roles;
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    try {
      await api(`/api/problems/${problemId}/roles/${roleId}`, { method: "DELETE" });
    } catch {
      setRoles(previous);
    }
  }

  if (roles.length === 0 && !isOwner) return null;

  return (
    <section className="section">
      <h2>Looking for</h2>
      {roles.length === 0 ? (
        <p className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>
          No open roles yet.
        </p>
      ) : (
        <div className="stack" style={{ gap: 12, marginTop: 14 }}>
          {roles.map((role) => {
            const filled = role.filled >= role.countNeeded || !role.open;
            return (
              <div key={role.id} className="card card-tight role-card">
                <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                  <b>{role.roleName}</b>
                  <span className="faint mono" style={{ fontSize: 12 }}>
                    {role.filled}/{role.countNeeded}
                  </span>
                </div>
                {role.skills.length > 0 && (
                  <div className="chip-wrap" style={{ marginTop: 8 }}>
                    {role.skills.map((s) => (
                      <span key={s} className="chip chip-static">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {role.description && (
                  <p className="muted" style={{ fontSize: 13.5, marginTop: 8 }}>
                    {role.description}
                  </p>
                )}
                {(role.commitment || role.duration) && (
                  <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                    {[role.commitment, role.duration].filter(Boolean).join(" · ")}
                  </p>
                )}

                <div style={{ marginTop: 10 }}>
                  {isOwner ? (
                    <div className="row" style={{ gap: 8 }}>
                      {role.open && (
                        <button type="button" className="btn btn-sm" onClick={() => closeRole(role.id)}>
                          Stop taking applications
                        </button>
                      )}
                      <button type="button" className="btn btn-sm" onClick={() => deleteRole(role.id)}>
                        Delete
                      </button>
                    </div>
                  ) : filled ? (
                    <span className="faint" style={{ fontSize: 13 }}>
                      Filled
                    </span>
                  ) : !signedIn ? (
                    <Link href="/login" className="btn btn-sm">
                      Sign in to apply
                    </Link>
                  ) : canApply ? (
                    applyingTo === role.id ? (
                      <ApplyForm roleId={role.id} problemId={problemId} onSent={() => {}} />
                    ) : (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setApplyingTo(role.id)}>
                        Apply to this role
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOwner && (
        <div style={{ marginTop: 14 }}>
          <PublishRoleForm problemId={problemId} onCreated={(role) => setRoles((prev) => [...prev, role])} />
        </div>
      )}
    </section>
  );
}
