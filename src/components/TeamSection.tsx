"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import type { TeamMember } from "@/lib/types";

export default function TeamSection({
  problemId,
  members: initialMembers,
  isOwner,
  viewerId,
}: {
  problemId: string;
  members: TeamMember[];
  isOwner: boolean;
  /** The signed-in viewer's own profile id, if any - for "Leave project". */
  viewerId: string | null;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(profileId: string) {
    const previous = members;
    setMembers((prev) => prev.filter((m) => m.profileId !== profileId));
    setBusyId(profileId);
    try {
      await api(`/api/problems/${problemId}/members/${profileId}`, { method: "DELETE" });
    } catch {
      setMembers(previous);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="section">
      <h2>Team</h2>
      <div className="stack" style={{ gap: 10, marginTop: 14 }}>
        {members.map((m) => (
          <div key={m.profileId} className="card card-tight team-row">
            <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
              <div>
                <Link href={`/u/${m.handle}`} className="mono handle-link" style={{ fontWeight: 600 }}>
                  @{m.handle}
                </Link>{" "}
                <span className="faint" style={{ fontSize: 13 }}>
                  {m.isOwner ? "Creator" : m.roleName || "Team member"}
                </span>
              </div>
              {isOwner && !m.isOwner && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => remove(m.profileId)}
                  disabled={busyId === m.profileId}
                  title="Remove from the team"
                >
                  Remove
                </button>
              )}
              {!isOwner && !m.isOwner && viewerId === m.profileId && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => remove(m.profileId)}
                  disabled={busyId === m.profileId}
                >
                  Leave project
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
