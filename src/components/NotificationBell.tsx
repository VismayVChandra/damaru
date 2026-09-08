"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/activity";
import type { AppNotification } from "@/lib/types";

const LABEL: Record<AppNotification["type"], (n: AppNotification) => string> = {
  follow: () => "started following you",
  like: (n) => (n.problemTitle ? `cheered on "${n.problemTitle}"` : "cheered on your problem"),
  comment: (n) => (n.problemTitle ? `commented on "${n.problemTitle}"` : "commented on your problem"),
  collab_request: (n) =>
    n.problemTitle ? `wants to collaborate on "${n.problemTitle}"` : "wants to work together",
  collab_accepted: (n) =>
    n.problemTitle ? `accepted your request on "${n.problemTitle}"` : "accepted your collaboration request",
};

/** Where clicking a notification should actually take you. */
function targetHref(n: AppNotification): string {
  if (n.type === "collab_request" || n.type === "collab_accepted") return "/collaborate";
  return n.actorHandle ? `/u/${n.actorHandle}` : "/collaborate";
}

export default function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function load() {
    api<{ items: AppNotification[]; unreadCount: number }>("/api/notifications")
      .then(({ items, unreadCount }) => {
        setItems(items);
        setUnreadCount(unreadCount);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // Not a live socket - a light poll is enough to make follows/likes/
    // comments/requests show up without the person having to reload.
    const interval = setInterval(load, 45_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      try {
        await api("/api/notifications/read", { method: "POST" });
      } catch {
        // Not worth rolling back over - the next load() will reconcile.
      }
    }
  }

  return (
    <div className="notif-root" ref={rootRef}>
      <button
        type="button"
        className="notif-bell"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown card">
          <div className="block-label" style={{ marginBottom: 10 }}>
            Activity
          </div>
          {items.length === 0 ? (
            <p className="faint" style={{ fontSize: 13.5 }}>
              Nothing yet.
            </p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={targetHref(n)} className="notif-item" data-read={n.read ? "true" : "false"}>
                    <span>
                      {n.actorHandle && <b>@{n.actorHandle}</b>} {LABEL[n.type](n)}
                    </span>
                    <span className="faint mono" style={{ fontSize: 11 }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
