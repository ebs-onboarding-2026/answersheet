"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Masthead, Notice } from "@/components/Chrome";
import { GradedSheet } from "@/components/GradedSheet";
import { useSession } from "@/lib/session";
import type { AttemptResult } from "@/lib/types";

export default function ResultPage() {
  const session = useSession();
  const { id } = useParams<{ id: string }>();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/attempts/${id}?viewerId=${session.userId}`);
      const data = await res.json();
      if (cancelled) return;
      if (res.ok) setResult(data.result);
      else setError(data.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session]);

  if (session === false) {
    return (
      <>
        <Masthead />
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <Notice tone="error">채점 결과를 보려면 로그인해 주세요.</Notice>
          <Link href="/" className="btn btn-line mt-6">
            처음으로
          </Link>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Masthead session={session || undefined} />
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <Notice tone="error">{error}</Notice>
          <Link href="/student" className="btn btn-line mt-6">
            공개된 퀴즈 보기
          </Link>
        </main>
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Masthead session={session || undefined} />
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <p className="text-sm text-graphite">채점 결과를 불러오는 중…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead session={session || undefined} crumb="채점 결과" />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <GradedSheet result={result} viewer="student" />

        <div className="mt-10 flex flex-wrap gap-2">
          <Link href="/student" className="btn btn-ink">
            다른 퀴즈 풀기
          </Link>
          <Link href={`/q/${result.quizCode}`} className="btn btn-line">
            이 퀴즈 다시 풀기
          </Link>
        </div>
      </main>
    </>
  );
}
