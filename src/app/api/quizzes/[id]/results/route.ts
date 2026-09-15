import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { message } from "@/lib/rows";
import type { AttemptSummary } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

type AttemptRow = {
  id: string;
  quiz_id: string;
  nickname: string;
  correct_count: number;
  total_count: number;
  score: number;
  submitted_at: string;
  answers: (number | null)[];
};

/** GET /api/quizzes/:id/results?ownerId=… — the author's result dashboard. */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const ownerId = new URL(request.url).searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId가 필요합니다." }, { status: 400 });
  }

  try {
    const owned = (await sql`
      select 1 from quizzes where id = ${id} and owner_id = ${ownerId}
    `) as unknown[];
    if (owned.length === 0) {
      return NextResponse.json(
        { error: "퀴즈를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const rows = (await sql`
      select id, quiz_id, nickname, correct_count, total_count, score, submitted_at, answers
      from attempts where quiz_id = ${id} order by submitted_at desc
    `) as AttemptRow[];

    const questions = (await sql`
      select position, prompt, answer_index from questions
      where quiz_id = ${id} order by position
    `) as { position: number; prompt: string; answer_index: number }[];

    // Per-question correct rate, so the author can see which items missed.
    const perQuestion = questions.map((q) => {
      const answered = rows.filter((r) => r.answers[q.position - 1] != null);
      const correct = answered.filter(
        (r) => r.answers[q.position - 1] === q.answer_index
      ).length;
      return {
        position: q.position,
        prompt: q.prompt,
        answeredCount: answered.length,
        correctCount: correct,
        correctRate: answered.length ? Math.round((correct / answered.length) * 100) : null,
      };
    });

    const attempts: AttemptSummary[] = rows.map((r) => ({
      id: r.id,
      quizId: r.quiz_id,
      nickname: r.nickname,
      correctCount: r.correct_count,
      totalCount: r.total_count,
      score: r.score,
      submittedAt: r.submitted_at,
    }));

    return NextResponse.json({ attempts, perQuestion });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
