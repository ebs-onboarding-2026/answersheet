import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import {
  rowToQuiz,
  rowToQuestion,
  message,
  type QuizRow,
  type QuestionRow,
} from "@/lib/rows";

type Params = { params: Promise<{ id: string }> };

/** GET /api/quizzes/:id?ownerId=… — the author's view, answer key included. */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const ownerId = new URL(request.url).searchParams.get("ownerId");

  try {
    const [quizRow] = (await sql`
      select q.*,
             (select count(*) from attempts a where a.quiz_id = q.id) as attempt_count,
             (select avg(a.score) from attempts a where a.quiz_id = q.id) as average_score
      from quizzes q where q.id = ${id}
    `) as QuizRow[];

    if (!quizRow) {
      return NextResponse.json({ error: "퀴즈를 찾을 수 없습니다." }, { status: 404 });
    }

    const isOwner = ownerId !== null && ownerId === quizRow.owner_id;
    if (!isOwner) {
      return NextResponse.json(
        { error: "이 퀴즈를 볼 권한이 없습니다." },
        { status: 403 }
      );
    }

    const questionRows = (await sql`
      select id, position, prompt, choices, answer_index, explanation
      from questions where quiz_id = ${id} order by position
    `) as QuestionRow[];

    return NextResponse.json({
      quiz: {
        ...rowToQuiz(quizRow),
        questions: questionRows.map((r) => rowToQuestion(r, true)),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

const patchSchema = z.object({
  ownerId: z.string().min(1),
  published: z.boolean(),
});

/** PATCH /api/quizzes/:id — publish or unpublish. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { ownerId, published } = patchSchema.parse(await request.json());
    const rows = (await sql`
      update quizzes
      set published = ${published},
          published_at = case when ${published} then coalesce(published_at, now()) else null end
      where id = ${id} and owner_id = ${ownerId}
      returning *
    `) as QuizRow[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "퀴즈를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json({ quiz: rowToQuiz(rows[0]) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

/** DELETE /api/quizzes/:id?ownerId=… */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const ownerId = new URL(request.url).searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId가 필요합니다." }, { status: 400 });
  }
  try {
    const rows = (await sql`
      delete from quizzes where id = ${id} and owner_id = ${ownerId} returning id
    `) as unknown[];
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "퀴즈를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
