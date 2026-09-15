"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Masthead, Notice, Empty } from "@/components/Chrome";
import { useRequireRole } from "@/lib/guard";
import { DIFFICULTY_LABEL, type Difficulty, type Quiz } from "@/lib/types";

const COUNT_OPTIONS = [5, 10, 15, 20];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function TeacherHome() {
  const router = useRouter();
  const session = useRequireRole("teacher");

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/quizzes?scope=mine&ownerId=${session.userId}`);
      const data = await res.json();
      if (cancelled) return;
      if (res.ok) setQuizzes(data.quizzes);
      else setError(data.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          questionCount,
          difficulty,
          ownerId: session.userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/teacher/${data.quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "퀴즈를 만들지 못했습니다.");
      setBusy(false);
    }
  }

  if (!session) return <Masthead />;

  return (
    <>
      <Masthead session={session} crumb="출제" />

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <section>
          <h1 className="text-[1.65rem] font-semibold tracking-tight">새 퀴즈 만들기</h1>
          <p className="mt-2 max-w-[52ch] text-[0.95rem] leading-relaxed text-graphite">
            다루는 범위를 구체적으로 적을수록 문항이 정확해집니다. 단원명보다는
            {" “"}이진 탐색 트리의 삽입과 삭제{"”"}처럼요.
          </p>

          <form onSubmit={create} className="sheet mt-6 p-5 sm:p-6">
            <label htmlFor="topic" className="block text-sm font-medium">
              주제
            </label>
            <input
              id="topic"
              className="field mt-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예) 이진 탐색 트리의 삽입과 삭제"
              maxLength={200}
              disabled={busy}
            />

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <fieldset>
                <legend className="text-sm font-medium">문항 수</legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {COUNT_OPTIONS.map((n) => (
                    <Chip
                      key={n}
                      selected={questionCount === n}
                      disabled={busy}
                      onClick={() => setQuestionCount(n)}
                    >
                      {n}문항
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium">난이도</legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <Chip
                      key={d}
                      selected={difficulty === d}
                      disabled={busy}
                      onClick={() => setDifficulty(d)}
                    >
                      {DIFFICULTY_LABEL[d]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>

            {error ? (
              <div className="mt-5">
                <Notice tone="error">{error}</Notice>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                className="btn btn-ink"
                disabled={busy || topic.trim().length < 2}
              >
                {busy ? "문항 만드는 중" : "문항 만들기"}
              </button>
              {busy ? (
                <span className="text-sm text-graphite">
                  {questionCount}문항을 쓰고 있습니다. 20초쯤 걸립니다.
                </span>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-14">
          <div className="flex items-baseline justify-between border-b border-dropout pb-3">
            <h2 className="text-[1.05rem] font-semibold tracking-tight">내 퀴즈</h2>
            <span className="text-sm text-graphite-lt">
              {loading ? "" : `${quizzes.length}개`}
            </span>
          </div>

          <div className="mt-5">
            {loading ? (
              <p className="py-8 text-sm text-graphite">불러오는 중…</p>
            ) : quizzes.length === 0 ? (
              <Empty title="아직 만든 퀴즈가 없습니다. 위에서 주제를 적고 시작해 보세요." />
            ) : (
              <ul className="grid gap-2">
                {quizzes.map((quiz) => (
                  <li key={quiz.id}>
                    <QuizRow quiz={quiz} />
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

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={
        "rounded-[2px] border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40 " +
        (selected
          ? "border-ink bg-ink text-white"
          : "border-dropout-mid bg-sheet text-graphite hover:border-ink hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function QuizRow({ quiz }: { quiz: Quiz }) {
  return (
    <Link
      href={`/teacher/${quiz.id}`}
      className="sheet flex flex-wrap items-center gap-x-5 gap-y-2 p-4 transition-colors hover:border-ink"
    >
      <span
        className={
          "h-1.5 w-1.5 shrink-0 rounded-full " +
          (quiz.published ? "bg-ink" : "bg-dropout-mid")
        }
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.98rem] font-medium">{quiz.title}</span>
        <span className="mt-1 block text-[0.83rem] text-graphite">
          {quiz.questionCount}문항, {DIFFICULTY_LABEL[quiz.difficulty]}
          {quiz.published ? `, 공개 중 — 코드 ${quiz.code}` : ", 비공개"}
        </span>
      </span>
      <span className="text-right text-[0.83rem] text-graphite">
        응시 {quiz.attemptCount ?? 0}명
        {quiz.averageScore !== null && quiz.averageScore !== undefined ? (
          <span className="block text-graphite-lt">평균 {quiz.averageScore}점</span>
        ) : null}
      </span>
    </Link>
  );
}
