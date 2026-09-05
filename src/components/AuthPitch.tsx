import { countProblems, countProfiles, countShippedProblems } from "@/lib/db";

/**
 * The left column on both auth screens - same pitch either way, so it lives
 * once rather than being copy-pasted into /login and /signup. Fetches its
 * own numbers (a Server Component can be async) since the two pages have
 * nothing else in common to thread them through.
 */
export default async function AuthPitch() {
  const [problems, shipped, profiles] = await Promise.all([
    countProblems(),
    countShippedProblems(),
    countProfiles(),
  ]);

  return (
    <div className="auth-pitch">
      <div className="auth-glow" aria-hidden="true" />
      <div className="eyebrow">Coding club, internal</div>
      <h1 style={{ maxWidth: "16ch" }}>
        You know how to build things. Deciding what to build is the hard part.
      </h1>
      <p className="muted" style={{ marginTop: 16, maxWidth: "46ch", fontSize: 15.5 }}>
        Damaru reads your skills, your interests and how much time you actually have, then writes
        you a project brief nobody in the club has been issued before. Keep the ones worth
        keeping. Ship one.
      </p>
      <p className="mono faint" style={{ marginTop: 28, fontSize: 13 }}>
        {problems.toLocaleString()} problems issued · {shipped.toLocaleString()} shipped ·{" "}
        {profiles.toLocaleString()} members
      </p>
      <p className="faint" style={{ marginTop: 10, fontSize: 13 }}>
        Nothing is written to the club feed until you ship it.
      </p>
    </div>
  );
}
