"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "./types";

export type Session = { userId: string; nickname: string; role: Role };

const KEY = "answersheet.session";

function parse(raw: string | null): Session | false {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Partial<Session> & { id?: string };
    // The API returns the account as { id, nickname, role }.
    const userId = parsed.userId ?? parsed.id;
    if (!userId || !parsed.nickname || !parsed.role) return false;
    return { userId, nickname: parsed.nickname, role: parsed.role };
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

/**
 * Signs in against the accounts table and caches what comes back. The userId is
 * the server's to hand out — minting one in the browser is what used to lose an
 * author every quiz they had written the moment they changed browser or pressed
 * 나가기.
 */
export async function signIn(nickname: string, role: Role): Promise<Session> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "로그인하지 못했습니다.");

  const session: Session = {
    userId: data.user.id,
    nickname: data.user.nickname,
    role: data.user.role,
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  emit();
  return session;
}

/* One reconcile per page load is plenty; it is a single indexed lookup. */
let reconciled = false;

/**
 * Trades a cached session in for whatever the accounts table says. Sessions
 * written before accounts existed carry a userId that was never in the table,
 * and the author would still see an empty quiz list until it is swapped for the
 * real account id. Signing in by nickname finds that account, so the repair is
 * the same call as a login.
 */
export async function reconcileSession(): Promise<void> {
  if (reconciled) return;
  reconciled = true;

  const current = readSession();
  if (!current) return;

  try {
    const fresh = await signIn(current.nickname, current.role);
    if (fresh.userId === current.userId) return;
  } catch (error) {
    // The name now belongs to the other role — that session cannot be restored.
    if (error instanceof Error && error.message.includes("이미")) clearSession();
  }
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
