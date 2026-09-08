"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Mark from "@/components/Mark";
import NotificationBell from "@/components/NotificationBell";
import { logout } from "@/app/auth/actions";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/types";

/** Only shown once signed in - there is nobody to follow yet from a fresh account. */
const SIGNED_IN_LINKS = [{ href: "/home", label: "Home" }];

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/generate", label: "Generate" },
  { href: "/dashboard", label: "My problems" },
  { href: "/browse", label: "Explore" },
  { href: "/pair", label: "Pairing" },
  { href: "/collaborate", label: "Collaborate" },
  { href: "/submit", label: "Submit a friction" },
];

interface Me {
  user: { id: string; email: string } | null;
  profile: Profile | null;
}

export default function Nav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [open, setOpen] = useState(false);

  // Re-check on every navigation - cheap, and keeps the handle chip in sync
  // right after signup/login/logout without a full page reload. Navigating
  // also closes the menu, so a tap on mobile does not leave it hanging open.
  useEffect(() => {
    setOpen(false);
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe({ user: null, profile: null }));
  }, [pathname]);

  const links = [
    ...(me?.user ? SIGNED_IN_LINKS : []),
    ...LINKS,
    ...(me?.profile?.isAdmin ? [{ href: "/admin/frictions", label: "Review" }] : []),
  ];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <Mark size={19} className="brand-mark" />
          <span>Damaru</span>
        </Link>

        <div className="nav-links" id="nav-links" data-open={open ? "true" : "false"}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              data-active={pathname === l.href ? "true" : "false"}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <span className="nav-spacer" />

        {/* Auth stays outside the collapsible menu: on a phone, "how do I sign
            in" must never be the thing hidden behind a tap. */}
        {me === undefined ? null : me.user ? (
          <form action={logout} className="row nav-auth" style={{ gap: 8 }}>
            <NotificationBell />
            {me.profile ? (
              <Link href={`/u/${me.profile.handle}`} className="nav-handle">
                @{me.profile.handle}
              </Link>
            ) : (
              <span className="nav-handle">finish your profile</span>
            )}
            <button type="submit" className="btn btn-sm">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/login" className="btn btn-sm nav-auth">
            Sign in
          </Link>
        )}

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav-toggle-bars" data-open={open ? "true" : "false"} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
    </nav>
  );
}
