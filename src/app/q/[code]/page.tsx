"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Masthead, Notice, Bubble, Mark } from "@/components/Chrome";
import { readSession, writeSession, useSession } from "@/lib/session";
import { DIFFICULTY_LABEL, type QuizWithQuestions } from "@/lib/types";

const CHOICE_LABELS = ["ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓔ"];

export default function TakeQuizPage() {
  const router = useRouter();
  const session = useSession();
  const { code } = useParams<{ code: string }>();

  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/quizzes/code/${code}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(data.error);
        return;
      }
      setQuiz(data.quiz);
      setAnswers(new Array(data.quiz.questions.length).fill(null));
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const total = quiz?.questions.length ?? 0;
  const answeredCount = answers.filter((a) => a !== null).length;
  const unanswered = answers
    .map((a, i) => (a === null ? i + 1 : null))
    .filter((n): n is number => n !== null);

  const go = useCallback(
    (index: number) => {
      if (index < 0 || index >= total) return;
      setCurrent(index);
      setConfirming(false);
    },
    [total]
  );

  const mark = useCallback((questionIndex: number, choiceIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = next[questionIndex] === choiceIndex ? null : choiceIndex;
      return next;
    });
  }, []);

  // Arrow keys move between questions; 1–4 marks a choice.
  useEffect(() => {
    if (!quiz) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight") go(current + 1);
      else if (event.key === "ArrowLeft") go(current - 1);
      else if (/^[1-9]$/.test(event.key)) {
        const choice = Number(event.key) - 1;
        if (choice < (quiz?.questions[current]?.choices.length ?? 0)) {
          mark(current, choice);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quiz, current, go, mark]);

  async function submit() {
    const active = readSession();
    if (!quiz || !active || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          userId: active.userId,
          nickname: active.nickname,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/result/${data.attemptId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제출하지 못했습니다.");
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (loadError) {
    return (
      <>
        <Masthead session={session || undefined} />
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <Notice tone="error">{loadError}</Notice>
          <Link href="/student" className="btn btn-line mt-6">
            공개된 퀴즈 보기
          </Link>
        </main>
      </>
    );
  }

  if (!quiz) {
    return (
      <>
        <Masthead session={session || undefined} />
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <p className="text-sm text-graphite">불러오는 중…</p>
        </main>
      </>
    );
  }

  // A shared link can land on someone who has not picked a nickname yet.
  if (session === false) {
    return <NicknameGate quiz={quiz} />;
  }
  if (!session) {
    return (
      <>
        <Masthead />
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8" />
      </>
    );
  }

  const question = quiz.questions[current];
  const isLast = current === total - 1;

  return (
    <>
      <Masthead session={session} crumb="응시" />

      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-[1.15rem] font-semibold tracking-tight">{quiz.title}</h1>
          <p className="text-[0.85rem] text-graphite">
            {DIFFICULTY_LABEL[quiz.difficulty]}, {total}문항 중 {answeredCount}개 표시함
          </p>
        </header>

        {/* The navigator and the answer choices speak the same vocabulary: bubbles. */}
        <nav aria-label="문항 이동" className="mt-5 flex flex-wrap gap-1.5">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`${i + 1}번 문항${answers[i] !== null ? ", 표시함" : ""}`}
              aria-current={i === current ? "true" : undefined}
              className={
                "rounded-full p-0.5 transition-shadow " +
                (i === current ? "shadow-[0_0_0_1.5px_var(--ink)]" : "")
              }
            >
              <Bubble marked={answers[i] !== null} label={String(i + 1)} size="1.45rem" />
            </button>
          ))}
        </nav>

        <article className="sheet mt-5 p-5 sm:p-7">
          <div className="flex items-baseline gap-3">
            <span className="text-[1.6rem] font-semibold leading-none tracking-tight text-graphite-lt">
              {String(current + 1).padStart(2, "0")}
            </span>
            <span className="text-[0.82rem] text-graphite-lt">/ {total}</span>
          </div>

          <h2 className="mt-3.5 text-[1.12rem] leading-relaxed">{question.prompt}</h2>

          <ul className="mt-6 grid gap-2">
            {question.choices.map((choice, i) => {
              const selected = answers[current] === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => mark(current, i)}
                    aria-pressed={selected}
                    className={
                      "flex w-full items-start gap-3 rounded-[2px] border p-3.5 text-left transition-colors " +
                      (selected
                        ? "border-ink bg-paper"
                        : "border-dropout hover:border-dropout-mid")
                    }
                  >
                    <span className="mt-0.5">
                      <Bubble marked={selected} size="1.3rem" />
                    </span>
                    <span className="text-[0.97rem] leading-relaxed">
                      <span className="mr-2 text-graphite-lt">{CHOICE_LABELS[i]}</span>
                      {choice}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </article>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            className="btn btn-line"
            onClick={() => go(current - 1)}
            disabled={current === 0}
          >
            이전 문항
          </button>

          {isLast ? (
            <button
              type="button"
              className="btn btn-ink ml-auto"
              onClick={() => (unanswered.length ? setConfirming(true) : void submit())}
              disabled={submitting}
            >
              {submitting ? "채점 중" : "제출하기"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ink ml-auto"
              onClick={() => go(current + 1)}
            >
              다음 문항
            </button>
          )}
        </div>

        {!isLast && answeredCount === total ? (
          <div className="mt-5">
            <button
              type="button"
              className="btn btn-line w-full"
              onClick={() => void submit()}
              disabled={submitting}
            >
              {submitting ? "채점 중" : "모두 표시했습니다, 제출하기"}
            </button>
          </div>
        ) : null}

        {confirming ? (
          <div className="sheet mt-5 border-redpen p-5">
            <p className="text-[0.95rem]">
              {unanswered.length}개 문항이 비어 있습니다 — {unanswered.join(", ")}번.
              비운 문항은 오답으로 처리됩니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-line"
                onClick={() => go(unanswered[0] - 1)}
              >
                {unanswered[0]}번으로 가기
              </button>
              <button
                type="button"
                className="btn btn-ink"
                onClick={() => void submit()}
                disabled={submitting}
              >
                {submitting ? "채점 중" : "이대로 제출하기"}
              </button>
            </div>
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-5">
            <Notice tone="error">{submitError}</Notice>
          </div>
        ) : null}
      </main>
    </>
  );
}

/** Someone arriving from a shared link needs a name before they can be graded. */
function NicknameGate({ quiz }: { quiz: QuizWithQuestions }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  function start(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("닉네임을 적어 주세요.");
      return;
    }
    writeSession(trimmed, "student");
    // Re-render the page with a session in place.
    window.location.reload();
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-20 sm:px-8">
      <div className="mb-7 flex items-center gap-2.5">
        <Mark size={22} />
        <span className="text-[0.95rem] font-semibold tracking-tight">답안지</span>
      </div>

      <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight">
        {quiz.title}
      </h1>
      <p className="mt-2 text-[0.92rem] text-graphite">
        {quiz.ownerNickname} 출제, {quiz.questionCount}문항,{" "}
        {DIFFICULTY_LABEL[quiz.difficulty]}
      </p>

      <form onSubmit={start} className="sheet mt-7 p-5">
        <label htmlFor="nickname" className="block text-sm font-medium">
          점수에 적을 이름
        </label>
        <input
          id="nickname"
          className="field mt-2"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          maxLength={40}
        />
        {error ? (
          <p role="alert" className="mt-3 text-sm text-redpen">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-ink mt-5 w-full">
          시작하기
        </button>
      </form>
    </main>
  );
}
