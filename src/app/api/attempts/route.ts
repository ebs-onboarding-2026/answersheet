import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { message } from "@/lib/rows";
import { AuthError, requireUser } from "@/lib/users";

const submitSchema = z.object({
  quizId: z.string().uuid(),
  userId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(9).nullable()),
});

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
