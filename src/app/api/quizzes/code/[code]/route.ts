import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  rowToQuiz,
  rowToQuestion,
  message,
  type QuizRow,
  type QuestionRow,
} from "@/lib/rows";

type Params = { params: Promise<{ code: string }> };

/** GET /api/quizzes/code/:code — the student's view. No answer key in the payload. */
export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const [quizRow] = (await sql`
      select * from quizzes where code = ${code.toUpperCase()}
    `) as QuizRow[];

    if (!quizRow) {
      return NextResponse.json(
        { error: "그 코드로 열린 퀴즈가 없습니다." },
        { status: 404 }
      );
    }
    if (!quizRow.published) {
      return NextResponse.json(
        { error: "아직 공개되지 않은 퀴즈입니다. 출제자에게 공개를 요청하세요." },
        { status: 403 }
      );
    }

    const questionRows = (await sql`
      select id, position, prompt, choices, answer_index, explanation
      from questions where quiz_id = ${quizRow.id} order by position
    `) as QuestionRow[];

    return NextResponse.json({
      quiz: {
        ...rowToQuiz(quizRow),
        questions: questionRows.map((r) => rowToQuestion(r, false)),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
