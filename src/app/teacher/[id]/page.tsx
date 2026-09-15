"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Masthead, Notice, Bubble, Empty } from "@/components/Chrome";
import { useSession } from "@/lib/session";
import {
  DIFFICULTY_LABEL,
  type AttemptSummary,
  type QuizWithQuestions,
} from "@/lib/types";

type PerQuestion = {
  position: number;
  prompt: string;
  answeredCount: number;
  correctCount: number;
  correctRate: number | null;
};

const CHOICE_LABELS = ["ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓔ"];

export default function TeacherQuizPage() {
  const router = useRouter();
  const session = useSession();
  const { id } = useParams<{ id: string }>();

  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[] | null>(null);
  const [perQuestion, setPerQuestion] = useState<PerQuestion[]>([]);
  const [view, setView] = useState<"questions" | "results">("questions");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  useEffect(() => {
    if (session === false) router.replace("/");
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    const ownerId = session.userId;
    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/quizzes/${id}?ownerId=${ownerId}`);
      const data = await res.json();
      if (cancelled) return;
      if (res.ok) setQuiz(data.quiz);
      else setError(data.error);
    })();

    void (async () => {
      const res = await fetch(`/api/quizzes/${id}/results?ownerId=${ownerId}`);
      const data = await res.json();
      if (cancelled || !res.ok) return;
      setAttempts(data.attempts);
      setPerQuestion(data.perQuestion);
    })();

    return () => {
      cancelled = true;
    };
  }, [session, id]);

  async function togglePublish() {
    if (!session || !quiz || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: session.userId, published: !quiz.published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuiz({ ...quiz, ...data.quiz });
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태를 바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(kind: "link" | "code") {
    if (!quiz) return;
    const text =
      kind === "code" ? quiz.code : `${window.location.origin}/q/${quiz.code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("복사하지 못했습니다. 주소를 직접 선택해 복사해 주세요.");
    }
  }

  if (!session) return <Masthead />;

  if (error && !quiz) {
    return (
      <>
        <Masthead session={session} crumb="출제" />
        <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          <Notice tone="error">{error}</Notice>
          <Link href="/teacher" className="btn btn-line mt-6">
            내 퀴즈로 돌아가기
          </Link>
        </main>
      </>
    );
  }

  if (!quiz) {
    return (
      <>
        <Masthead session={session} crumb="출제" />
        <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          <p className="text-sm text-graphite">불러오는 중…</p>
        </main>
      </>
    );
  }

  const shareUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/q/${quiz.code}`;
  const average =
    attempts && attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
      : null;

  return (
    <>
      <Masthead session={session} crumb="출제" />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <Link href="/teacher" className="text-sm text-graphite hover:text-ink">
          내 퀴즈
        </Link>

        <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight">
          {quiz.title}
        </h1>
        {quiz.description ? (
          <p className="mt-2 max-w-[58ch] text-[0.95rem] leading-relaxed text-graphite">
            {quiz.description}
          </p>
        ) : null}
        <p className="mt-3 text-[0.85rem] text-graphite-lt">
          주제 {quiz.topic} — {quiz.questionCount}문항, {DIFFICULTY_LABEL[quiz.difficulty]}
        </p>

        {/* Publishing panel: the one place the quiz leaves the author's hands. */}
        <section className="sheet mt-7 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[1rem] font-semibold tracking-tight">
                {quiz.published ? "공개 중" : "아직 비공개"}
              </h2>
              <p className="mt-1.5 max-w-[46ch] text-[0.88rem] leading-relaxed text-graphite">
                {quiz.published
                  ? "학생 화면의 공개 퀴즈 목록에 올라가 있습니다. 아래 코드나 링크로도 바로 들어올 수 있습니다."
                  : "공개하면 학생 목록에 올라가고, 공유 코드와 링크로 응시할 수 있습니다."}
              </p>
            </div>
            <button
              type="button"
              className={"btn " + (quiz.published ? "btn-line" : "btn-ink")}
              onClick={togglePublish}
              disabled={busy}
            >
              {busy ? "처리 중" : quiz.published ? "공개 내리기" : "공개하기"}
            </button>
          </div>

          {quiz.published ? (
            <div className="mt-5 grid gap-3 border-t border-dropout pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
              <div>
                <span className="block text-[0.8rem] text-graphite">공유 코드</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="rounded-[2px] border border-dropout-mid bg-paper px-3 py-2 text-[1.15rem] font-semibold tracking-[0.16em]">
                    {quiz.code}
                  </code>
                  <button
                    type="button"
                    className="btn btn-line px-3 py-2 text-[0.83rem]"
                    onClick={() => copy("code")}
                  >
                    {copied === "code" ? "복사함" : "복사"}
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <span className="block text-[0.8rem] text-graphite">공유 링크</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="field min-w-0 flex-1 text-[0.85rem]"
                    aria-label="공유 링크"
                  />
                  <button
                    type="button"
                    className="btn btn-line shrink-0 px-3 py-2 text-[0.83rem]"
                    onClick={() => copy("link")}
                  >
                    {copied === "link" ? "복사함" : "복사"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
        </section>

        <nav className="mt-10 flex gap-6 border-b border-dropout">
          <Tab active={view === "questions"} onClick={() => setView("questions")}>
            문항 {quiz.questions.length}
          </Tab>
          <Tab active={view === "results"} onClick={() => setView("results")}>
            응시 결과 {attempts?.length ?? 0}
          </Tab>
        </nav>

        {view === "questions" ? (
          <ol className="mt-6 grid gap-3">
            {quiz.questions.map((q) => (
              <li key={q.id} className="sheet p-5">
                <div className="flex gap-4">
                  <span className="w-7 shrink-0 pt-0.5 text-[0.95rem] font-semibold text-graphite-lt">
                    {String(q.position).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[1rem] leading-relaxed">{q.prompt}</p>
                    <ul className="mt-3.5 grid gap-2">
                      {q.choices.map((choice, i) => {
                        const isAnswer = i === q.answerIndex;
                        return (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="mt-0.5">
                              <Bubble
                                marked={isAnswer}
                                tone={isAnswer ? "green" : undefined}
                                size="1.1rem"
                              />
                            </span>
                            <span
                              className={
                                "text-[0.92rem] leading-relaxed " +
                                (isAnswer ? "text-ok" : "text-graphite")
                              }
                            >
                              <span className="mr-1.5 text-graphite-lt">
                                {CHOICE_LABELS[i]}
                              </span>
                              {choice}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {q.explanation ? (
                      <p className="mt-3.5 border-l-2 border-dropout pl-3 text-[0.87rem] leading-relaxed text-graphite">
                        {q.explanation}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-6">
            {attempts === null ? (
              <p className="py-8 text-sm text-graphite">불러오는 중…</p>
            ) : attempts.length === 0 ? (
              <Empty
                title={
                  quiz.published
                    ? "아직 아무도 응시하지 않았습니다. 코드나 링크를 학생에게 전달해 보세요."
                    : "공개하면 학생이 응시할 수 있고, 결과가 여기 쌓입니다."
                }
              />
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-dropout pb-4">
                  <Stat label="응시" value={`${attempts.length}명`} />
                  <Stat label="평균" value={`${average}점`} accent />
                  <Stat
                    label="최고"
                    value={`${Math.max(...attempts.map((a) => a.score))}점`}
                  />
                  <Stat
                    label="최저"
                    value={`${Math.min(...attempts.map((a) => a.score))}점`}
                  />
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[440px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-dropout text-[0.8rem] text-graphite">
                        <th className="py-2 pr-4 font-medium">닉네임</th>
                        <th className="py-2 pr-4 font-medium">점수</th>
                        <th className="py-2 pr-4 font-medium">정답</th>
                        <th className="py-2 font-medium">응시 시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id} className="border-b border-dropout/70">
                          <td className="py-2.5 pr-4 text-[0.92rem]">{a.nickname}</td>
                          <td className="py-2.5 pr-4 text-[0.92rem] font-semibold text-redpen">
                            {a.score}
                          </td>
                          <td className="py-2.5 pr-4 text-[0.88rem] text-graphite">
                            {a.correctCount} / {a.totalCount}
                          </td>
                          <td className="py-2.5 text-[0.88rem] text-graphite">
                            {new Date(a.submittedAt).toLocaleString("ko-KR", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="mt-12 border-b border-dropout pb-3 text-[1rem] font-semibold tracking-tight">
                  문항별 정답률
                </h3>
                <ul className="mt-4 grid gap-3.5">
                  {perQuestion.map((q) => (
                    <li key={q.position} className="flex items-start gap-4">
                      <span className="w-7 shrink-0 pt-0.5 text-[0.85rem] text-graphite-lt">
                        {String(q.position).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9rem]">{q.prompt}</p>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div
                            className="h-1.5 flex-1 bg-dropout"
                            role="img"
                            aria-label={`정답률 ${q.correctRate ?? 0}퍼센트`}
                          >
                            <div
                              className="h-full bg-ink"
                              style={{ width: `${q.correctRate ?? 0}%` }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right text-[0.82rem] text-graphite">
                            {q.correctRate === null ? "—" : `${q.correctRate}%`}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={
        "-mb-px border-b-2 pb-2.5 text-[0.92rem] transition-colors " +
        (active
          ? "border-ink font-medium text-ink"
          : "border-transparent text-graphite hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <span className="block text-[0.8rem] text-graphite">{label}</span>
      <span
        className={
          "mt-0.5 block text-[1.35rem] font-semibold tracking-tight " +
          (accent ? "text-redpen" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
