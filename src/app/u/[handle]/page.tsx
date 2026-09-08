"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { SKILL_BY_ID } from "@/lib/catalog/skills";
import DamaruSpinner from "@/components/DamaruSpinner";
import { api } from "@/lib/client";
import type { Problem, UserSkill } from "@/lib/types";

interface PublicProfile {
  handle: string;
  displayName: string;
  bio: string;
  skills: UserSkill[];
  interests: string[];
  timeBudget: string;
  teamSize: string;
  appetite: string;
  createdAt: string;
}

interface ProfileBundle {
  profile: PublicProfile;
  shipped: Problem[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean | null;
  isOwnProfile: boolean;
}

export default function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [data, setData] = useState<ProfileBundle | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found">("loading");
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [collabState, setCollabState] = useState<"idle" | "composing" | "sending" | "sent">("idle");
  const [collabMessage, setCollabMessage] = useState("");
  const [collabError, setCollabError] = useState<string | null>(null);

  useEffect(() => {
    setState("loading");
    api<ProfileBundle>(`/api/profiles/${handle}`)
      .then((d) => {
        setData(d);
        setFollowing(d.isFollowing);
        setState("ready");
      })
      .catch(() => setState("not-found"));
  }, [handle]);

  async function toggleFollow() {
    if (!data || following === null || busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      await api(`/api/profiles/${handle}/follow`, { method: next ? "POST" : "DELETE" });
      setData((prev) =>
        prev
          ? { ...prev, followerCount: prev.followerCount + (next ? 1 : -1) }
          : prev,
      );
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  async function sendCollabRequest() {
    setCollabState("sending");
    setCollabError(null);
    try {
      await api(`/api/profiles/${handle}/collab-requests`, {
        method: "POST",
        body: JSON.stringify({ message: collabMessage.trim() }),
      });
      setCollabState("sent");
    } catch (e) {
      setCollabError(e instanceof Error ? e.message : "Could not send that.");
      setCollabState("composing");
    }
  }

  if (state === "loading") {
    return (
      <main className="shell shell-narrow">
        <div className="empty">
          <DamaruSpinner size={32} />
        </div>
      </main>
    );
  }

  if (state === "not-found" || !data) {
    return (
      <main className="shell shell-narrow">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>No such member</h2>
          <p className="muted" style={{ maxWidth: "44ch", margin: "12px auto 0" }}>
            Nobody has claimed that handle.
          </p>
        </div>
      </main>
    );
  }

  const { profile, shipped, followerCount, followingCount, isOwnProfile } = data;
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="shell shell-narrow">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="eyebrow">@{profile.handle}</div>
          <h1>{profile.displayName}</h1>
          {profile.bio && (
            <p className="muted" style={{ marginTop: 10, maxWidth: "50ch" }}>
              {profile.bio}
            </p>
          )}
          <p className="faint" style={{ marginTop: 8, fontSize: 13 }}>
            Member since {memberSince}
          </p>
        </div>

        {isOwnProfile ? (
          <Link href="/profile" className="btn btn-sm">
            Edit profile
          </Link>
        ) : following === null ? (
          <Link href="/login" className="btn btn-sm">
            Sign in to follow
          </Link>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className={following ? "btn btn-sm" : "btn btn-sm btn-primary"}
              onClick={toggleFollow}
              disabled={busy}
            >
              {following ? "Following" : "Follow"}
            </button>
            {collabState === "idle" && (
              <button type="button" className="btn btn-sm" onClick={() => setCollabState("composing")}>
                Request to collaborate
              </button>
            )}
            {collabState === "sent" && (
              <span className="faint" style={{ fontSize: 13 }}>
                Request sent
              </span>
            )}
          </div>
        )}
      </div>

      {(collabState === "composing" || collabState === "sending") && (
        <div className="card section" style={{ maxWidth: 460 }}>
          <label className="label" htmlFor="collab-message">
            Request to collaborate
          </label>
          <textarea
            id="collab-message"
            className="textarea"
            value={collabMessage}
            maxLength={300}
            placeholder="What are you working on, or hoping to?"
            onChange={(e) => setCollabMessage(e.target.value)}
            style={{ minHeight: 60 }}
          />
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button
              className="btn btn-sm btn-primary"
              onClick={sendCollabRequest}
              disabled={collabState === "sending"}
            >
              {collabState === "sending" ? (
                <>
                  <DamaruSpinner size={14} /> Sending…
                </>
              ) : (
                "Send request"
              )}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setCollabState("idle")}
              disabled={collabState === "sending"}
            >
              Cancel
            </button>
          </div>
          {collabError && (
            <p style={{ color: "var(--ember)", fontSize: 13, marginTop: 8 }}>{collabError}</p>
          )}
        </div>
      )}

      <div className="row section" style={{ gap: 28 }}>
        <div>
          <div className="stat">{shipped.length}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            shipped
          </div>
        </div>
        <div>
          <div className="stat">{followerCount}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            {followerCount === 1 ? "follower" : "followers"}
          </div>
        </div>
        <div>
          <div className="stat">{followingCount}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            following
          </div>
        </div>
      </div>

      {profile.skills.length > 0 && (
        <section className="section">
          <h3>Skills</h3>
          <div className="chip-wrap" style={{ marginTop: 12 }}>
            {profile.skills.map((s) => {
              const skill = SKILL_BY_ID.get(s.id);
              return skill ? (
                <span key={s.id} className="chip chip-static">
                  {skill.label}
                </span>
              ) : null;
            })}
          </div>
        </section>
      )}

      {profile.interests.length > 0 && (
        <section className="section">
          <h3>Interested in</h3>
          <div className="chip-wrap" style={{ marginTop: 12 }}>
            {profile.interests.map((id) => {
              const d = DOMAIN_BY_ID.get(id);
              return d ? (
                <span key={id} className="chip chip-static">
                  {d.icon} {d.label}
                </span>
              ) : null;
            })}
          </div>
        </section>
      )}

      <section className="section">
        <h3>Shipped</h3>
        {shipped.length === 0 ? (
          <p className="faint" style={{ fontSize: 14, marginTop: 10 }}>
            Nothing shipped yet.
          </p>
        ) : (
          <div className="stack" style={{ gap: 12, marginTop: 14 }}>
            {shipped.map((p) => (
              <div key={p.id} className="card card-tight card-hover">
                <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                  <span className="chip chip-static">
                    {p.domainIcon} {p.domainLabel}
                  </span>
                  <span className="faint mono" style={{ fontSize: 11.5 }}>
                    fit {Math.round(p.fit.score * 100)}%
                  </span>
                </div>
                <p style={{ marginTop: 10, fontSize: 15, fontWeight: 600 }}>{p.title}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
