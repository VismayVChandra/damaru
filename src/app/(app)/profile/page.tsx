"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, SKILLS } from "@/lib/catalog/skills";
import { DOMAINS } from "@/lib/catalog/domains";
import { ARTIFACTS } from "@/lib/catalog/blocks";
import { api } from "@/lib/client";
import type { Appetite, Profile, SkillCategory, TeamSize, TimeBudget, UserSkill } from "@/lib/types";

const LEVEL_LABEL: Record<number, string> = { 1: "learning", 2: "ok", 3: "strong" };

const TIME_OPTIONS: { id: TimeBudget; label: string; hint: string }[] = [
  { id: "weekend", label: "A weekend", hint: "One focused burst" },
  { id: "twoweeks", label: "A couple of weeks", hint: "Evenings and a weekend or two" },
  { id: "semester", label: "A whole term", hint: "Something you can stage in milestones" },
];

const TEAM_OPTIONS: { id: TeamSize; label: string; hint: string }[] = [
  { id: "solo", label: "Solo", hint: "Just me" },
  { id: "pair", label: "Pair", hint: "Two of us" },
  { id: "team", label: "Team", hint: "Three or more" },
];

const APPETITE_OPTIONS: { id: Appetite; label: string; hint: string }[] = [
  { id: "comfort", label: "Play to my strengths", hint: "Mostly things I already know — I want to ship" },
  { id: "stretch", label: "Stretch me", hint: "One real step outside what I can do today" },
  { id: "deepend", label: "Throw me in", hint: "I want to be out of my depth and learn fast" },
];

export default function ProfilePage() {
  const router = useRouter();

  const [handle, setHandleValue] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [artifactPrefs, setArtifactPrefs] = useState<string[]>([]);
  const [timeBudget, setTimeBudget] = useState<TimeBudget>("twoweeks");
  const [teamSize, setTeamSize] = useState<TeamSize>("solo");
  const [appetite, setAppetite] = useState<Appetite>("stretch");
  const [discoverable, setDiscoverable] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);

  // Who is signed in is now the session cookie, not a stored handle - load
  // whatever profile (if any) belongs to the current account.
  useEffect(() => {
    api<{ user: { id: string; email: string } | null; profile: Profile | null }>("/api/me")
      .then(({ user, profile }) => {
        if (profile) {
          setHandleValue(profile.handle);
          setDisplayName(profile.displayName);
          setSkills(profile.skills);
          setInterests(profile.interests);
          setArtifactPrefs(profile.artifactPrefs);
          setTimeBudget(profile.timeBudget);
          setTeamSize(profile.teamSize);
          setAppetite(profile.appetite);
          setDiscoverable(profile.discoverable);
        } else if (user?.email) {
          // A brand-new account - suggest a handle from the email as a
          // starting point, still fully editable.
          setDisplayName(user.email.split("@")[0]);
        }
      })
      .finally(() => setStatus("idle"));
  }, []);

  const skillLevel = useMemo(
    () => new Map(skills.map((s) => [s.id, s.level])),
    [skills],
  );

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = SKILLS.filter((s) => {
      if (!q) return true;
      return (
        s.label.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        (s.aliases ?? []).some((a) => a.includes(q)) ||
        CATEGORY_LABELS[s.category].toLowerCase().includes(q)
      );
    });
    const out = new Map<SkillCategory, typeof SKILLS>();
    for (const s of matches) {
      const list = out.get(s.category) ?? [];
      list.push(s);
      out.set(s.category, list);
    }
    return out;
  }, [search]);

  function toggleSkill(id: string) {
    setSkills((prev) =>
      prev.some((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, level: 2 }],
    );
  }

  function setLevel(id: string, level: UserSkill["level"]) {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, level } : s)));
  }

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function save() {
    setError(null);
    setStatus("saving");
    try {
      await api<{ profile: Profile }>("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          handle,
          displayName,
          skills,
          interests,
          artifactPrefs,
          timeBudget,
          teamSize,
          appetite,
          discoverable,
        }),
      });
      router.push("/generate");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  // Name exactly what is outstanding — a disabled button that lists every
  // requirement leaves people guessing which one they actually missed.
  const missing: string[] = [];
  if (handle.trim().length < 2) missing.push("a handle of at least 2 characters");
  if (skills.length === 0) missing.push("at least one skill");
  if (interests.length === 0) missing.push("at least one interest");
  const ready = missing.length === 0;

  if (status === "loading") {
    return (
      <main className="shell shell-narrow">
        <div className="empty">
          <span className="spin" /> Loading your profile…
        </div>
      </main>
    );
  }

  return (
    <main className="shell shell-narrow">
      <div className="eyebrow">Step one</div>
      <h1>Who are you, technically?</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Be honest rather than impressive. The generator uses this to keep problems inside what you
        can finish, and overstating a skill is how you end up with something you abandon.
      </p>

      {/* --- Identity --------------------------------------------------- */}
      <section className="card section">
        <h3>Identity</h3>
        <p className="faint" style={{ fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          Your handle is how the club feed credits you. It has nothing to do with your login email.
        </p>
        <div className="grid-2">
          <div>
            <label className="label" htmlFor="handle">
              Handle
            </label>
            <input
              id="handle"
              className="input"
              value={handle}
              placeholder="vismay"
              onChange={(e) =>
                setHandleValue(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              placeholder="Vismay"
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* --- Skills ------------------------------------------------------ */}
      <section className="card section">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>Skills</h3>
          <span className="faint mono" style={{ fontSize: 12 }}>
            {skills.length} selected
          </span>
        </div>
        <p className="faint" style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>
          Click to add. Then mark each one: <b>learning</b>, <b>ok</b>, or <b>strong</b>.
        </p>

        <input
          className="input"
          value={search}
          placeholder="Search skills — react, pandas, arduino, figma…"
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 18 }}
        />

        {skills.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="label">Yours</div>
            <div className="chip-wrap">
              {skills.map((us) => {
                const skill = SKILLS.find((s) => s.id === us.id);
                if (!skill) return null;
                return (
                  <span key={us.id} className="chip" data-on="true">
                    <span onClick={() => toggleSkill(us.id)} style={{ cursor: "pointer" }}>
                      {skill.label}
                    </span>
                    <span className="level-group">
                      {([1, 2, 3] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className="level-btn"
                          data-on={us.level === lvl ? "true" : "false"}
                          onClick={() => setLevel(us.id, lvl)}
                          title={LEVEL_LABEL[lvl]}
                        >
                          {LEVEL_LABEL[lvl]}
                        </button>
                      ))}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="stack">
          {Array.from(grouped.entries()).map(([category, list]) => (
            <div key={category}>
              <div className="label">{CATEGORY_LABELS[category]}</div>
              <div className="chip-wrap">
                {list.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="chip"
                    data-on={skillLevel.has(s.id) ? "true" : "false"}
                    onClick={() => toggleSkill(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {grouped.size === 0 && (
            <p className="faint" style={{ fontSize: 13 }}>
              Nothing matches “{search}”. The catalogue is deliberately finite — pick the closest
              thing.
            </p>
          )}
        </div>
      </section>

      {/* --- Interests --------------------------------------------------- */}
      <section className="card section">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>What do you care about?</h3>
          <span className="faint mono" style={{ fontSize: 12 }}>
            {interests.length} selected
          </span>
        </div>
        <p className="faint" style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>
          Pick the ones you would read about for fun. Interest is what gets you through the boring
          middle of a project, so this is weighted as heavily as skill.
        </p>
        <div className="chip-wrap">
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              type="button"
              className="chip"
              data-on={interests.includes(d.id) ? "true" : "false"}
              onClick={() => toggle(interests, setInterests, d.id)}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </section>

      {/* --- Shape ------------------------------------------------------- */}
      <section className="card section">
        <h3>What do you want to make?</h3>
        <p className="faint" style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>
          Optional. Leave it empty and you will get whatever fits best.
        </p>
        <div className="chip-wrap">
          {ARTIFACTS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="chip"
              data-on={artifactPrefs.includes(a.id) ? "true" : "false"}
              onClick={() => toggle(artifactPrefs, setArtifactPrefs, a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      {/* --- Constraints -------------------------------------------------- */}
      <section className="card section">
        <h3>Constraints</h3>
        <div className="stack" style={{ marginTop: 16, gap: 20 }}>
          <div>
            <div className="label">How much time do you have?</div>
            <div className="chip-wrap">
              {TIME_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="chip"
                  data-on={timeBudget === o.id ? "true" : "false"}
                  onClick={() => setTimeBudget(o.id)}
                  title={o.hint}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Who is building it?</div>
            <div className="chip-wrap">
              {TEAM_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="chip"
                  data-on={teamSize === o.id ? "true" : "false"}
                  onClick={() => setTeamSize(o.id)}
                  title={o.hint}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Can other people see you as a collaborator?</div>
            <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
              Pairing shows your handle and the skill areas you cover to other members. Never your
              email.
            </p>
            <div className="chip-wrap">
              <button
                type="button"
                className="chip"
                data-on={discoverable ? "true" : "false"}
                onClick={() => setDiscoverable(true)}
              >
                List me
              </button>
              <button
                type="button"
                className="chip"
                data-on={!discoverable ? "true" : "false"}
                onClick={() => setDiscoverable(false)}
              >
                Keep me hidden
              </button>
            </div>
          </div>
          <div>
            <div className="label">How hard do you want this?</div>
            <div className="stack" style={{ gap: 8 }}>
              {APPETITE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="chip"
                  data-on={appetite === o.id ? "true" : "false"}
                  onClick={() => setAppetite(o.id)}
                  style={{ display: "block", borderRadius: 10, padding: "10px 14px" }}
                >
                  <b>{o.label}</b>
                  <span className="faint" style={{ marginLeft: 8, fontWeight: 400 }}>
                    {o.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="notice" style={{ marginTop: 20 }}>
          {error}
        </div>
      )}

      <div className="row section" style={{ gap: 12 }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={save}
          disabled={!ready || status === "saving"}
        >
          {status === "saving" ? (
            <>
              <span className="spin" /> Saving…
            </>
          ) : (
            "Save and generate"
          )}
        </button>
        {!ready && (
          <span style={{ fontSize: 13, color: "var(--ember)" }}>
            Still needed: {missing.join(", ")}.
          </span>
        )}
      </div>
    </main>
  );
}
