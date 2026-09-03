"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getHandle } from "@/lib/client";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/generate", label: "Generate" },
  { href: "/dashboard", label: "My problems" },
  { href: "/browse", label: "Club feed" },
];

export default function Nav() {
  const pathname = usePathname();
  const [handle, setHandleState] = useState<string | null>(null);

  // localStorage is unavailable during SSR, so read it after mount.
  useEffect(() => setHandleState(getHandle()), [pathname]);

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
        <span className="nav-spacer" />
        {handle && <span className="nav-handle">@{handle}</span>}
      </div>
    </nav>
  );
}
