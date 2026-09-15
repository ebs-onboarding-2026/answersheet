import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { message } from "@/lib/rows";
import type { AttemptResult, GradedAnswer } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  quiz_id: string;
  user_id: string;
  nickname: string;
  answers: (number | null)[];
  correct_count: number;
  total_count: number;
  score: number;
  submitted_at: string;
  title: string;
  code: string;
  owner_id: string;
};

/**
 * GET /api/attempts/:id?viewerId=… — the graded sheet, answer key included now
 * that it is over. The key is in here, so only two people may read it: the
 * student who sat it and the author of the quiz.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const viewerId = new URL(request.url).searchParams.get("viewerId");

  try {
    const [row] = (await sql`
      select a.*, q.title, q.code, q.owner_id
      from attempts a join quizzes q on q.id = a.quiz_id
      where a.id = ${id}
    `) as Row[];

    if (!row) {
      return NextResponse.json({ error: "응시 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!viewerId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (viewerId !== row.user_id && viewerId !== row.owner_id) {
      return NextResponse.json(
        { error: "이 답안지를 볼 권한이 없습니다." },
        { status: 403 }
      );
    }

    const questions = (await sql`
      select position, prompt, choices, answer_index, explanation
      from questions where quiz_id = ${row.quiz_id} order by position
    `) as {
      position: number;
      prompt: string;
      choices: string[];
      answer_index: number;
      explanation: string | null;
    }[];

    const answers: GradedAnswer[] = questions.map((q, i) => {
      const chosen = row.answers[i] ?? null;
      return {
        position: q.position,
        prompt: q.prompt,
        choices: q.choices,
        chosenIndex: chosen,
        answerIndex: q.answer_index,
        correct: chosen === q.answer_index,
        explanation: q.explanation,
      };
    });

    const result: AttemptResult = {
      id: row.id,
      quizId: row.quiz_id,
      nickname: row.nickname,
      correctCount: row.correct_count,
      totalCount: row.total_count,
      score: row.score,
      submittedAt: row.submitted_at,
      quizTitle: row.title,
      quizCode: row.code,
      answers,
    };

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
