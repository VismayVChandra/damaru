"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** The one place the storage key is spelled. The inline pre-paint script in
 *  `layout.tsx` reads the same string - keep them in step. */
export const THEME_KEY = "damaru-theme";

/**
 * Light / dark switch.
 *
 * The theme is already on <html data-theme> before React runs (see the inline
 * script in `layout.tsx`), so this component's only job is to *report* that
 * and change it. It deliberately does not render a theme on the server: the
 * server cannot know what is in this browser's localStorage, so committing to
 * one in the HTML would either mismatch hydration or need the real answer to
 * arrive a frame later as a visible flip. Until mounted it renders the button
 * at its final size with no icon, which keeps the nav from reflowing.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;

    // Swapping the palette under elements that animate `color`/`background`
    // makes the flip ragged: nav links and buttons ease across 120-200ms
    // while everything else changes instantly, so for a fifth of a second
    // the page is half one theme. Suppress transitions for the swap, then
    // hand them back - two frames, because clearing it in the same frame is
    // coalesced away and the transitions never actually stop.
    root.dataset.themeSwitching = "";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        delete root.dataset.themeSwitching;
      }),
    );

    // The attribute is the switch; every token hangs off it.
    if (next === "dark") root.dataset.theme = "dark";
    else delete root.dataset.theme;
    // A browser with storage blocked or cleared still toggles for this page -
    // it just will not remember, which is better than throwing on click.
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private window, or site data blocked */
    }
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => apply(next)}
      aria-label={theme === null ? "Switch theme" : `Switch to ${next} theme`}
      title={theme === null ? undefined : `Switch to ${next} theme`}
      data-theme-state={theme ?? "pending"}
    >
      <span aria-hidden="true" className="theme-toggle-icon">
        {theme === null ? "" : theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

/* Both icons are inline SVG at currentColor rather than an emoji: ☀/🌙 render
   at a different size and baseline on every platform, and one of them is
   full-colour on Windows, which no amount of CSS fixes. */

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" />
    </svg>
  );
}
