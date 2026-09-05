import Link from "next/link";

/**
 * Plain links styled as a segmented control, not client-side tab state -
 * /login and /signup stay two real routes (own server action, own error
 * handling), so switching mode is just a navigation.
 */
export default function AuthToggle({ active }: { active: "signin" | "signup" }) {
  return (
    <div className="auth-toggle" role="tablist">
      <Link
        href="/login"
        className="auth-toggle-btn"
        data-on={active === "signin" ? "true" : "false"}
        role="tab"
        aria-selected={active === "signin"}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="auth-toggle-btn"
        data-on={active === "signup" ? "true" : "false"}
        role="tab"
        aria-selected={active === "signup"}
      >
        Create account
      </Link>
    </div>
  );
}
