"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Masthead, Notice, Empty } from "@/components/Chrome";
import { useSession } from "@/lib/session";
import { DIFFICULTY_LABEL, type Quiz } from "@/lib/types";

export default function StudentHome() {
  const router = useRouter();
  const session = useSession();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === false) router.replace("/");
  }, [session, router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/quizzes?scope=published");
      const data = await res.json();
      if (cancelled) return;
      if (res.ok) setQuizzes(data.quizzes);
      else setError(data.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function enterCode(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError("코드를 정확히 입력해 주세요.");
      return;
    }
    router.push(`/q/${clean}`);
  }

  if (!session) return <Masthead />;

  return (
    <>
      <Masthead session={session} crumb="응시" />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="text-[1.65rem] font-semibold tracking-tight">
          {session.nickname}님, 어떤 퀴즈를 풀까요
        </h1>

        <form
          onSubmit={enterCode}
          className="sheet mt-6 flex flex-wrap items-end gap-3 p-5"
        >
          <div className="min-w-[180px] flex-1">
            <label htmlFor="code" className="block text-sm font-medium">
              공유 코드로 바로 들어가기
            </label>
            <input
              id="code"
              className="field mt-2 tracking-[0.18em] uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="A7K3QX"
              maxLength={10}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-ink">
            들어가기
          </button>
        </form>

        {error ? (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b border-dropout pb-3">
            <h2 className="text-[1.05rem] font-semibold tracking-tight">공개된 퀴즈</h2>
            <span className="text-sm text-graphite-lt">
              {loading ? "" : `${quizzes.length}개`}
            </span>
          </div>

          <div className="mt-5">
            {loading ? (
              <p className="py-8 text-sm text-graphite">불러오는 중…</p>
            ) : error ? null : quizzes.length === 0 ? (
              <Empty title="아직 공개된 퀴즈가 없습니다. 출제자에게 코드를 받아 보세요." />
            ) : (
              <ul className="grid gap-2">
                {quizzes.map((quiz) => (
                  <li key={quiz.id}>
                    <Link
                      href={`/q/${quiz.code}`}
                      className="sheet flex flex-wrap items-center gap-x-5 gap-y-1.5 p-4 transition-colors hover:border-ink"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.98rem] font-medium">
                          {quiz.title}
                        </span>
                        <span className="mt-1 block text-[0.83rem] text-graphite">
                          {quiz.ownerNickname} 출제, {quiz.questionCount}문항,{" "}
                          {DIFFICULTY_LABEL[quiz.difficulty]}
                        </span>
                      </span>
                      <span className="text-[0.83rem] text-graphite-lt">
                        응시 {quiz.attemptCount ?? 0}명
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
