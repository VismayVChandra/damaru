import Link from "next/link";
import { login } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <main className="shell shell-narrow">
      <div className="eyebrow">Sign in</div>
      <h1>Welcome back.</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Sign in to see your profile and the problems already issued to you.
      </p>

      {notice && (
        <div className="notice" style={{ marginTop: 20, borderColor: "var(--cool)", color: "var(--cool)" }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="notice" style={{ marginTop: 20 }}>
          {error}
        </div>
      )}

      <form action={login} className="card section stack">
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
          <input id="password" name="password" type="password" className="input" required />
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          Sign in
        </button>
      </form>

      <p className="muted" style={{ marginTop: 20, fontSize: 14 }}>
        No account yet?{" "}
        <Link href="/signup" style={{ color: "var(--ember)" }}>
          Create one
        </Link>
      </p>
    </main>
  );
}
