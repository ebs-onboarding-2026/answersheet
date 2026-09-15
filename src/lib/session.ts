"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "./types";

export type Session = { userId: string; nickname: string; role: Role };

const KEY = "answersheet.session";

function parse(raw: string | null): Session | false {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.userId || !parsed.nickname || !parsed.role) return false;
    return parsed as Session;
  } catch {
    return false;
  }
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  return parse(window.localStorage.getItem(KEY)) || null;
}

/* useSyncExternalStore needs a stable snapshot, so cache until the raw string moves. */
let lastRaw: string | null = null;
let lastValue: Session | false = false;

function getSnapshot(): Session | false {
  const raw = window.localStorage.getItem(KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastValue = parse(raw);
  }
  return lastValue;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing the same key should update this one too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

export function writeSession(nickname: string, role: Role): Session {
  const existing = readSession();
  const session: Session = {
    userId: existing?.userId ?? crypto.randomUUID(),
    nickname,
    role,
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  emit();
  return session;
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
  emit();
}

/**
 * `null` while the browser store has not been read yet (server render and
 * hydration), then the session, or `false` when there is none.
 */
export function useSession(): Session | null | false {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
