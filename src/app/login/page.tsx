import { login } from "@/app/auth/actions";
import AuthPitch from "@/components/AuthPitch";
import AuthToggle from "@/components/AuthToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <main className="shell auth-layout">
      <AuthPitch />

      <div className="card auth-card">
        <AuthToggle active="signin" />

        {notice && (
          <div
            className="notice"
            style={{ marginTop: 18, borderColor: "var(--cool)", color: "var(--cool)" }}
          >
            {notice}
          </div>
        )}
        {error && (
          <div className="notice" style={{ marginTop: 18 }}>
            {error}
          </div>
        )}

        <form action={login} className="stack" style={{ marginTop: 20, gap: 16 }}>
          <div className="auth-field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" required autoFocus />
          </div>
          <div className="auth-field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" className="input" required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit">
            Sign in
          </button>
        </form>

        <p className="faint" style={{ marginTop: 16, fontSize: 13 }}>
          Forgot it? Ask in #damaru.
        </p>
      </div>
    </main>
  );
}
