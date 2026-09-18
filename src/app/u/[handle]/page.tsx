"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DOMAIN_BY_ID } from "@/lib/catalog/domains";
import { SKILL_BY_ID } from "@/lib/catalog/skills";
import { ACTIVE_STATUSES } from "@/lib/status";
import DamaruSpinner from "@/components/DamaruSpinner";
import ShowcaseCard from "@/components/ShowcaseCard";
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
  /** Everything they've committed to - idea through shipped. */
  projects: Problem[];
  /** Someone else's project, their name on the team. */
  joined: Problem[];
  logCount: number;
  forkCount: number;
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

  const { profile, projects, joined, logCount, forkCount, followerCount, followingCount, isOwnProfile } =
    data;
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shipped = projects.filter((p) => p.status === "shipped");
  // Idea-stage work sits in neither section on purpose: a portfolio of things
  // not yet started isn't a portfolio.
  const inProgress = projects.filter((p) => ACTIVE_STATUSES.includes(p.status));
  // Strongest first - a portfolio should show depth, not just surface area.
  const skills = [...profile.skills].sort((a, b) => b.level - a.level);

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
          <div className="stat">{inProgress.length}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            in progress
          </div>
        </div>
        <div>
          <div className="stat">{logCount}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            {logCount === 1 ? "build note" : "build notes"}
          </div>
        </div>
        {/* Only worth a slot once it has happened - a zero here on every
            profile would read as a scoreboard nobody asked for. */}
        {forkCount > 0 && (
          <div>
            <div className="stat">{forkCount}</div>
            <div className="faint" style={{ fontSize: 13 }}>
              built on their work
            </div>
          </div>
        )}
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

      {skills.length > 0 && (
        <section className="section">
          <h3>Skills</h3>
          <div className="chip-wrap" style={{ marginTop: 12 }}>
            {skills.map((s) => {
              const skill = SKILL_BY_ID.get(s.id);
              return skill ? (
                <span
                  key={s.id}
                  className="chip chip-static"
                  data-level={s.level}
                  title={["", "still learning", "comfortable", "strong"][s.level]}
                >
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
          <div className="grid-3" style={{ marginTop: 14 }}>
            {shipped.map((p) => (
              <ShowcaseCard key={p.id} problem={p} />
            ))}
          </div>
        )}
      </section>

      {inProgress.length > 0 && (
        <section className="section">
          <h3>In progress</h3>
          <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
            Being built right now.
          </p>
          <div className="grid-3" style={{ marginTop: 14 }}>
            {inProgress.map((p) => (
              <ShowcaseCard key={p.id} problem={p} showStatus />
            ))}
          </div>
        </section>
      )}

      {joined.length > 0 && (
        <section className="section">
          <h3>On the team</h3>
          <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
            Someone else&apos;s project, their name on the team.
          </p>
          <div className="grid-3" style={{ marginTop: 14 }}>
            {joined.map((p) => (
              <ShowcaseCard key={p.id} problem={p} showStatus />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
