"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/auth/actions";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/types";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/generate", label: "Generate" },
  { href: "/dashboard", label: "My problems" },
  { href: "/browse", label: "Club feed" },
  { href: "/submit", label: "Submit a friction" },
];

interface Me {
  user: { id: string; email: string } | null;
  profile: Profile | null;
}

export default function Nav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | undefined>(undefined);

  // Re-check on every navigation - cheap, and keeps the handle chip in sync
  // right after signup/login/logout without a full page reload.
  useEffect(() => {
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe({ user: null, profile: null }));
  }, [pathname]);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">&#129346;</span>
          <span>Damaru</span>
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="nav-link"
            data-active={pathname === l.href ? "true" : "false"}
          >
            {l.label}
          </Link>
        ))}
        {me?.profile?.isAdmin && (
          <Link
            href="/admin/frictions"
            className="nav-link"
            data-active={pathname === "/admin/frictions" ? "true" : "false"}
          >
            Review
          </Link>
        )}
        <span className="nav-spacer" />
        {me === undefined ? null : me.user ? (
          <form action={logout} className="row" style={{ gap: 8 }}>
            <span className="nav-handle">
              {me.profile ? `@${me.profile.handle}` : "finish your profile"}
            </span>
            <button type="submit" className="btn btn-sm">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/login" className="btn btn-sm">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
