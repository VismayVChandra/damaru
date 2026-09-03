import Link from "next/link";
import { signup } from "@/app/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="shell shell-narrow">
      <div className="eyebrow">Create an account</div>
      <h1>Join the forge.</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        An account is what makes your profile yours — nobody else can edit it or claim your handle.
      </p>

      {error && (
        <div className="notice" style={{ marginTop: 20 }}>
          {error}
        </div>
      )}

      <form action={signup} className="card section stack">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="input" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            minLength={8}
            required
          />
          <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
            At least 8 characters.
          </p>
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          Create account
        </button>
      </form>

      <p className="muted" style={{ marginTop: 20, fontSize: 14 }}>
        Already have one?{" "}
        <Link href="/login" style={{ color: "var(--ember)" }}>
          Sign in
        </Link>
      </p>
    </main>
  );
}
