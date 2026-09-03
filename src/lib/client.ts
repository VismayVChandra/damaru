"use client";

/**
 * Identity is a handle in localStorage. That is a deliberate v1 tradeoff for a
 * club-internal tool: anyone who knows a handle can edit that profile. See the
 * README before putting this on the open internet.
 */
const HANDLE_KEY = "damaru.handle";

export function getHandle(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(HANDLE_KEY);
  } catch {
    return null;
  }
}

export function setHandle(handle: string): void {
  try {
    window.localStorage.setItem(HANDLE_KEY, handle);
  } catch {
    /* private mode - identity just will not persist */
  }
}

export function clearHandle(): void {
  try {
    window.localStorage.removeItem(HANDLE_KEY);
  } catch {
    /* ignore */
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}
