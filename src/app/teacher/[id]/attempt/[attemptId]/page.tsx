"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Masthead, Notice } from "@/components/Chrome";
import { GradedSheet } from "@/components/GradedSheet";
import { useRequireRole } from "@/lib/guard";
import type { AttemptResult } from "@/lib/types";

/** One student's sheet, read by the author. The API checks the ownership. */
export default function TeacherAttemptPage() {
  const session = useRequireRole("teacher");
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/attempts/${attemptId}?viewerId=${session.userId}`);
      const data = await res.json();
      if (cancelled) return;
      if (res.ok) setResult(data.result);
      else setError(data.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, session]);

  if (!session) return <Masthead />;

  const back = (
    <Link href={`/teacher/${id}`} className="text-sm text-graphite hover:text-ink">
      응시 결과로 돌아가기
    </Link>
  );

  if (error) {
    return (
      <>
        <Masthead session={session} crumb="응시 답안" />
        <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <Notice tone="error">{error}</Notice>
          <div className="mt-6">{back}</div>
        </main>
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Masthead session={session} crumb="응시 답안" />
        <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <p className="text-sm text-graphite">불러오는 중…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead session={session} crumb="응시 답안" />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        {back}
        <div className="mt-4">
          <GradedSheet result={result} viewer="teacher" />
        </div>
      </main>
    </>
  );
}
