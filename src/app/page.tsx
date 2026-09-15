"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mark, Bubble } from "@/components/Chrome";
import { useSession, signIn } from "@/lib/session";
import type { Role } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const session = useSession();
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whatever the visitor types wins; otherwise fall back to their last visit.
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Role | null>(null);
  const nickname = nicknameDraft ?? (session ? session.nickname : "");
  const role = roleDraft ?? (session ? session.role : null);
  const setNickname = setNicknameDraft;
  const setRole = setRoleDraft;

  const trimmed = nickname.trim();
  const ready = trimmed.length >= 1 && role !== null;

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);
    if (!ready || !role || busy) return;

    setBusy(true);
    try {
      // The nickname is the account: the same name always comes back to the
      // same quizzes, on any browser.
      const signedIn = await signIn(trimmed, role);
      router.push(signedIn.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl content-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-16">
      <div>
        <div className="mb-7 flex items-center gap-2.5">
          <Mark size={22} />
          <span className="text-[0.95rem] font-semibold tracking-tight">답안지</span>
        </div>

        <h1 className="max-w-[16ch] text-[2.5rem] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[3.25rem]">
          주제 하나로
          <br />
          시험지 한 장.
        </h1>

        <p className="mt-5 max-w-[46ch] text-[1.02rem] leading-relaxed text-graphite">
          가르칠 주제를 적으면 객관식 문항을 만들어 드립니다. 공개하면 학생은 링크나
          코드로 들어와 한 문항씩 풀고, 제출하는 즉시 점수를 봅니다.
        </p>

        <form onSubmit={start} className="mt-10 max-w-md">
          <label htmlFor="nickname" className="block text-sm font-medium">
            어떤 이름으로 부를까요
          </label>
          <input
            id="nickname"
            className="field mt-2"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
            maxLength={40}
            autoComplete="nickname"
          />

          <fieldset className="mt-7">
            <legend className="text-sm font-medium">무엇을 하러 오셨나요</legend>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              <RoleChoice
                value="teacher"
                current={role}
                onPick={setRole}
                title="퀴즈 출제"
                detail="주제를 주면 문항을 만들고, 공개해 결과를 봅니다"
              />
              <RoleChoice
                value="student"
                current={role}
                onPick={setRole}
                title="퀴즈 응시"
                detail="공개된 퀴즈를 골라 풀고 점수를 확인합니다"
              />
            </div>
          </fieldset>

          {touched && !ready ? (
            <p role="alert" className="mt-4 text-sm text-redpen">
              {trimmed.length === 0
                ? "닉네임을 적어 주세요."
                : "출제와 응시 중 하나를 골라 주세요."}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 max-w-[46ch] text-sm leading-relaxed text-redpen">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-ink mt-6 w-full sm:w-auto sm:px-8"
            disabled={busy}
          >
            {busy ? "들어가는 중…" : "시작하기"}
          </button>

          <p className="mt-4 max-w-[44ch] text-[0.82rem] leading-relaxed text-graphite-lt">
            같은 닉네임으로 다시 들어오면 이전에 만든 퀴즈와 결과가 그대로 있습니다.
            닉네임 하나에 역할 하나입니다.
          </p>
        </form>
      </div>

      <AnswerSheetPreview />
    </main>
  );
}

function RoleChoice({
  value,
  current,
  onPick,
  title,
  detail,
}: {
  value: Role;
  current: Role | null;
  onPick: (role: Role) => void;
  title: string;
  detail: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      aria-pressed={selected}
      className={
        "sheet flex items-start gap-3 p-3.5 text-left transition-colors " +
        (selected ? "border-ink" : "hover:border-dropout-mid")
      }
    >
      <span className="mt-0.5">
        <Bubble marked={selected} size="1.15rem" />
      </span>
      <span>
        <span className="block text-[0.93rem] font-medium">{title}</span>
        <span className="mt-1 block text-[0.82rem] leading-snug text-graphite">
          {detail}
        </span>
      </span>
    </button>
  );
}

/** A quiet, still specimen of the sheet the whole product is built on. */
function AnswerSheetPreview() {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8];
  const marks = [1, 3, 0, 2, 1, 1, 3, 2];
  return (
    <aside
      aria-hidden="true"
      className="sheet hidden justify-self-end p-6 lg:block"
    >
      <div className="mb-4 flex items-baseline justify-between border-b border-dropout pb-3">
        <span className="text-[0.8rem] font-medium text-graphite">응시 답안</span>
        <span className="text-[0.8rem] text-graphite-lt">8문항</span>
      </div>
      <div className="grid gap-2.5">
        {rows.map((n, rowIndex) => (
          <div key={n} className="flex items-center gap-3">
            <span className="w-5 text-right text-[0.78rem] text-graphite-lt">
              {String(n).padStart(2, "0")}
            </span>
            {[0, 1, 2, 3].map((c) => (
              <Bubble key={c} marked={marks[rowIndex] === c} size="1.2rem" />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
