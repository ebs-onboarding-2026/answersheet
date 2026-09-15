"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Masthead, Notice, Bubble } from "@/components/Chrome";
import { useSession } from "@/lib/session";
import type { AttemptResult } from "@/lib/types";

const CHOICE_LABELS = ["ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓔ"];

export default function ResultPage() {
  const session = useSession();
  const { id } = useParams<{ id: string }>();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/attempts/${id}`);
      const data = await res.json();
      if (cancelled) return;
      if (res.ok) setResult(data.result);
      else setError(data.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        {/* The red pen only ever shows up here, on the score. */}
        <section className="sheet flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
          <div>
            <p className="text-[0.88rem] text-graphite">{result.quizTitle}</p>
            <p className="mt-1 text-[0.85rem] text-graphite-lt">
              {result.nickname}님의 답안
            </p>
            <p className="mt-5 text-[1rem]">
              {result.totalCount}문항 중{" "}
              <strong className="font-semibold">{result.correctCount}문항</strong> 정답
            </p>
          </div>
          <p className="leading-none text-redpen">
            <span className="text-[4.5rem] font-semibold tracking-[-0.04em]">
              {result.score}
            </span>
            <span className="ml-1 text-[1.1rem] font-medium">점</span>
          </p>
        </section>

        <h2 className="mt-12 border-b border-dropout pb-3 text-[1.05rem] font-semibold tracking-tight">
          문항별 채점
        </h2>

        <ol className="mt-5 grid gap-3">
          {result.answers.map((a) => (
            <li key={a.position} className="sheet p-5">
              <div className="flex gap-4">
                <span className="w-7 shrink-0 pt-0.5">
                  <span
                    className={
                      "text-[0.95rem] font-semibold " +
                      (a.correct ? "text-ok" : "text-redpen")
                    }
                  >
                    {String(a.position).padStart(2, "0")}
                  </span>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[1rem] leading-relaxed">{a.prompt}</p>

                  <ul className="mt-3.5 grid gap-2">
                    {a.choices.map((choice, i) => {
                      const isKey = i === a.answerIndex;
                      const isMine = i === a.chosenIndex;
                      const tone = isKey ? "green" : isMine ? "red" : undefined;
                      return (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-0.5">
                            <Bubble marked={isKey || isMine} tone={tone} size="1.1rem" />
                          </span>
                          <span
                            className={
                              "text-[0.92rem] leading-relaxed " +
                              (isKey
                                ? "text-ok"
                                : isMine
                                  ? "text-redpen"
                                  : "text-graphite")
                            }
                          >
                            <span className="mr-1.5 text-graphite-lt">
                              {CHOICE_LABELS[i]}
                            </span>
                            {choice}
                            {isMine && !isKey ? (
                              <span className="ml-2 text-[0.8rem]">내가 고른 답</span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {a.chosenIndex === null ? (
                    <p className="mt-3 text-[0.85rem] text-redpen">비워 둔 문항입니다.</p>
                  ) : null}

                  {a.explanation ? (
                    <p className="mt-3.5 border-l-2 border-dropout pl-3 text-[0.87rem] leading-relaxed text-graphite">
                      {a.explanation}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

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
