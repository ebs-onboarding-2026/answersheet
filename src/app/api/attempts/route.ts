import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { message } from "@/lib/rows";
import { AuthError, requireUser } from "@/lib/users";
import type { AttemptHistoryItem } from "@/lib/types";

const submitSchema = z.object({
  quizId: z.string().uuid(),
  userId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(9).nullable()),
});

type HistoryRow = {
  id: string;
  quiz_id: string;
  nickname: string;
  correct_count: number;
  total_count: number;
  score: number;
  submitted_at: string;
  title: string;
  code: string;
};

/**
 * GET /api/attempts?userId=… — everything this student has sat, newest first.
 * Without it a score was only ever visible on the redirect after submitting.
 */
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");

  try {
    await requireUser(userId, "student");

    const rows = (await sql`
      select a.id, a.quiz_id, a.nickname, a.correct_count, a.total_count,
             a.score, a.submitted_at, q.title, q.code
      from attempts a join quizzes q on q.id = a.quiz_id
      where a.user_id = ${userId}
      order by a.submitted_at desc
    `) as HistoryRow[];

    const attempts: AttemptHistoryItem[] = rows.map((r) => ({
      id: r.id,
      quizId: r.quiz_id,
      nickname: r.nickname,
      correctCount: r.correct_count,
      totalCount: r.total_count,
      score: r.score,
      submittedAt: r.submitted_at,
      quizTitle: r.title,
      quizCode: r.code,
    }));

    return NextResponse.json({ attempts });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

/** POST /api/attempts — grade on the server and store the attempt. */
export async function POST(request: Request) {
  let input: z.infer<typeof submitSchema>;
  try {
    input = submitSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "제출 내용을 읽지 못했습니다." }, { status: 400 });
  }

  // The name on the answer sheet comes from the account, not the request body.
  let student;
  try {
    student = await requireUser(input.userId, "student");
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }

  try {
    const [quiz] = (await sql`
      select id, published from quizzes where id = ${input.quizId}
    `) as { id: string; published: boolean }[];

    if (!quiz) {
      return NextResponse.json({ error: "퀴즈를 찾을 수 없습니다." }, { status: 404 });
    }
    if (!quiz.published) {
      return NextResponse.json(
        { error: "공개되지 않은 퀴즈에는 제출할 수 없습니다." },
        { status: 403 }
      );
    }

    const key = (await sql`
      select position, answer_index from questions
      where quiz_id = ${input.quizId} order by position
    `) as { position: number; answer_index: number }[];

    if (key.length === 0) {
      return NextResponse.json({ error: "문항이 없는 퀴즈입니다." }, { status: 400 });
    }

    // Normalise to the quiz's own length so a stale client can't change the total.
    const answers = key.map((_, i) => input.answers[i] ?? null);
    const correctCount = key.reduce(
      (n, q, i) => n + (answers[i] === q.answer_index ? 1 : 0),
      0
    );
    const totalCount = key.length;
    const score = Math.round((correctCount / totalCount) * 100);

    const [attempt] = (await sql`
      insert into attempts (quiz_id, user_id, nickname, answers, correct_count, total_count, score)
      values (${input.quizId}, ${student.id}, ${student.nickname},
              ${JSON.stringify(answers)}::jsonb, ${correctCount}, ${totalCount}, ${score})
      returning id
    `) as { id: string }[];

    return NextResponse.json({ attemptId: attempt.id, score, correctCount, totalCount }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
