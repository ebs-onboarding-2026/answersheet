"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { reconcileSession, useSession, type Session } from "./session";
import type { Role } from "./types";

/**
 * Sends anyone without a session back to the door, and anyone with the wrong
 * role to their own side of the building. Returns the session only once it is
 * known to be the right one, so a page can render on it directly.
 *
 * The server checks the role too — this only saves the person a dead end.
 */
export function useRequireRole(role: Role): Session | null {
  const router = useRouter();
  const session = useSession();

  // Heal a session minted before accounts existed before reading anything with it.
  useEffect(() => {
    if (session) void reconcileSession();
  }, [session]);

  useEffect(() => {
    if (session === false) {
      router.replace("/");
      return;
    }
    if (session && session.role !== role) {
      router.replace(session.role === "teacher" ? "/teacher" : "/student");
    }
  }, [session, role, router]);

  if (!session || session.role !== role) return null;
  return session;
}
