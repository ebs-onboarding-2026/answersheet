"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, type Session } from "@/lib/session";

/** The masthead reads like the header block printed at the top of an answer sheet. */
export function Masthead({
  session,
  crumb,
}: {
  session?: Session | null | false;
  crumb?: string;
}) {
  const router = useRouter();

  return (
    <header className="border-b border-dropout bg-sheet">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[0.95rem] font-semibold tracking-tight">답안지</span>
        </Link>

        {crumb ? (
          <span className="text-sm text-graphite">{crumb}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-graphite">
                {session.nickname}
                <span className="ml-1.5 text-graphite-lt">
                  {session.role === "teacher" ? "교수자" : "학생"}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-quiet px-2 py-1 text-sm"
                onClick={() => {
                  clearSession();
                  router.push("/");
                }}
              >
                나가기
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** Four bubbles, the third filled — the brand mark is the interaction itself. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="5" cy="5" r="3.2" fill="none" stroke="var(--dropout-mid)" strokeWidth="1.4" />
      <circle cx="15" cy="5" r="3.2" fill="none" stroke="var(--dropout-mid)" strokeWidth="1.4" />
      <circle cx="5" cy="15" r="3.2" fill="var(--ink)" />
      <circle cx="15" cy="15" r="3.2" fill="none" stroke="var(--dropout-mid)" strokeWidth="1.4" />
    </svg>
  );
}

export function Bubble({
  marked,
  tone,
  label,
  size,
}: {
  marked: boolean;
  tone?: "red" | "green";
  label?: string;
  size?: string;
}) {
  return (
    <span
      className="bubble"
      data-marked={marked}
      data-tone={tone}
      style={size ? ({ "--size": size } as React.CSSProperties) : undefined}
    >
      {label && !marked ? (
        <span className="text-[0.68rem] font-medium text-graphite-lt">{label}</span>
      ) : null}
    </span>
  );
}

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "error";
  children: React.ReactNode;
}) {
  const isError = tone === "error";
  return (
    <p
      role={isError ? "alert" : undefined}
      className={
        "border-l-2 py-2 pl-3 text-sm " +
        (isError
          ? "border-redpen bg-redpen-soft text-redpen"
          : "border-dropout-mid bg-paper text-graphite")
      }
    >
      {children}
    </p>
  );
}

export function Empty({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sheet grid-paper px-6 py-14 text-center">
      <p className="text-[0.95rem] text-graphite">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
