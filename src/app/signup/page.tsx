import { signup } from "@/app/auth/actions";
import AuthPitch from "@/components/AuthPitch";
import AuthToggle from "@/components/AuthToggle";
import SubmitButton from "@/components/SubmitButton";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="shell auth-layout">
      <AuthPitch />

      <div className="card auth-card">
        <AuthToggle active="signup" />

        {error && (
          <div className="notice" style={{ marginTop: 18 }}>
            {error}
          </div>
        )}

        <form action={signup} className="stack" style={{ marginTop: 20, gap: 16 }}>
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
          <SubmitButton className="btn btn-primary btn-lg auth-submit" pendingText="Creating account…">
            Create account
          </SubmitButton>
        </form>

        <p className="faint" style={{ marginTop: 16, fontSize: 13 }}>
          Pick a handle nobody else has taken — that's the only rule.
        </p>
      </div>
    </main>
  );
}
