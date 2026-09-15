import { NextResponse } from "next/server";
import { z } from "zod";
import { sql, makeShareCode } from "@/lib/db";
import { generateQuiz } from "@/lib/ai";
import { rowToQuiz, message, type QuizRow } from "@/lib/rows";
import { AuthError, requireUser } from "@/lib/users";

// The reasoning models take roughly ten seconds a question, so twenty of them
// runs past the old two-minute ceiling.
export const maxDuration = 300;

const createSchema = z.object({
  topic: z.string().trim().min(2, "주제를 2자 이상 적어 주세요.").max(200),
  questionCount: z.number().int().min(1).max(30),
  difficulty: z.enum(["easy", "medium", "hard"]),
  ownerId: z.string().min(1),
});

/** GET /api/quizzes?scope=mine&ownerId=… | ?scope=published */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "published";

  try {
    if (scope === "mine") {
      const ownerId = searchParams.get("ownerId");
      if (!ownerId) {
        return NextResponse.json({ error: "ownerId가 필요합니다." }, { status: 400 });
      }
      const rows = (await sql`
        select q.*,
               count(a.id) as attempt_count,
               avg(a.score) as average_score
        from quizzes q
        left join attempts a on a.quiz_id = q.id
        where q.owner_id = ${ownerId}
        group by q.id
        order by q.created_at desc
      `) as QuizRow[];
      return NextResponse.json({ quizzes: rows.map(rowToQuiz) });
    }

    const rows = (await sql`
      select q.*,
             count(a.id) as attempt_count,
             avg(a.score) as average_score
      from quizzes q
      left join attempts a on a.quiz_id = q.id
      where q.published = true
      group by q.id
      order by q.published_at desc nulls last
    `) as QuizRow[];
    return NextResponse.json({ quizzes: rows.map(rowToQuiz) });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

/** POST /api/quizzes — generate the questions with OpenAI, then store the quiz. */
export async function POST(request: Request) {
  let input: z.infer<typeof createSchema>;
  try {
    input = createSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "입력값을 확인해 주세요." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "요청을 읽지 못했습니다." }, { status: 400 });
  }

  // The body can claim any ownerId, so the account and its role are read back
  // from the table before a single token is spent on generation.
  let owner;
  try {
    owner = await requireUser(input.ownerId, "teacher");
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }

  let generated;
  try {
    generated = await generateQuiz(input);
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 502 });
  }

  try {
    const code = await reserveCode();
    const [quizRow] = (await sql`
      insert into quizzes
        (code, topic, title, description, difficulty, question_count, owner_id, owner_nickname)
      values
        (${code}, ${input.topic}, ${generated.title}, ${generated.description},
         ${input.difficulty}, ${generated.questions.length}, ${owner.id}, ${owner.nickname})
      returning *
    `) as QuizRow[];

    // One multi-row insert keeps the questions to a single round trip.
    const values = generated.questions.map((q, i) => [
      quizRow.id,
      i + 1,
      q.prompt,
      JSON.stringify(q.choices),
      q.answerIndex,
      q.explanation,
    ]);
    const placeholders = values
      .map(
        (_, i) =>
          `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}::jsonb, $${i * 6 + 5}, $${i * 6 + 6})`
      )
      .join(", ");
    await sql.query(
      `insert into questions (quiz_id, position, prompt, choices, answer_index, explanation)
       values ${placeholders}`,
      values.flat()
    );

    return NextResponse.json({ quiz: rowToQuiz(quizRow) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

async function reserveCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeShareCode();
    const rows = (await sql`select 1 from quizzes where code = ${code}`) as unknown[];
    if (rows.length === 0) return code;
  }
  throw new Error("공유 코드를 만들지 못했습니다. 다시 시도해 주세요.");
}
