import OpenAI from "openai";
import { z } from "zod";
import type { Difficulty } from "./types";

/** Every question is five choices with exactly one key. */
export const CHOICE_COUNT = 5;

/**
 * Questions per model call. One call per question measured fastest: ten
 * questions took 92s in a single call, 49s in batches of three, 27s one at a
 * time. Left as a knob because a cheaper model may prefer fewer, larger calls.
 */
const BATCH_SIZE = 1;

/**
 * Raising this to 20 only took twenty questions from 52s to 48s — the wait is
 * the slowest single call, not the queue — so this stays low enough to be kind
 * to the account's rate limit.
 */
const MAX_CONCURRENT = 10;

const DIFFICULTY_BRIEF: Record<Difficulty, string> = {
  easy: [
    "학부 1학년 수준.",
    "정의, 용어, 기본 절차를 확인하는 문항 위주로 낸다.",
    "오답은 개념을 혼동했을 때 고를 법한 것으로 하되, 정답과 구별이 분명해야 한다.",
  ].join(" "),
  medium: [
    "학부 중급 수준.",
    "개념을 새로운 사례에 적용하거나, 비슷한 두 개념을 구별해야 풀리는 문항을 섞는다.",
    "오답은 절차의 한 단계를 빠뜨리거나 조건을 잘못 적용했을 때 실제로 도달하는 결과로 만든다.",
  ].join(" "),
  hard: [
    "심화 수준.",
    "여러 개념을 연결해 추론하거나, 일반 규칙이 통하지 않는 예외와 경계 조건을 판단해야 풀리는 문항을 낸다.",
    "오답은 그 분야에서 흔한 오개념이거나, 조건 하나를 놓쳤을 때 도달하는 그럴듯한 결론이어야 한다.",
  ].join(" "),
};

const questionSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(CHOICE_COUNT),
  answerIndex: z.number().int().min(0).max(CHOICE_COUNT - 1),
  explanation: z.string(),
});

const generatedSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  questions: z.array(questionSchema).min(1),
});

export type GeneratedQuiz = z.infer<typeof generatedSchema>;
type GeneratedQuestion = z.infer<typeof questionSchema>;

const outlineSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  points: z.array(z.string().min(1)).min(1),
});

/* Structured outputs in strict mode ignore minItems/maxItems, so the counts are
   carried by the descriptions here and checked by zod on the way back. */

const outlineJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "points"],
  properties: {
    title: {
      type: "string",
      description:
        "퀴즈 제목. 다루는 내용을 가리키는 이름만 20자 이내로. " +
        "'확인 지점', '퀴즈', '문제', '평가' 같은 작업 용어는 넣지 않는다.",
    },
    description: { type: "string", description: "이 퀴즈가 무엇을 확인하는지 한 문장." },
    points: {
      type: "array",
      items: { type: "string" },
      description:
        "문항 하나씩이 맡을 확인 지점. 요청된 문항 수와 같은 개수로, 서로 겹치지 않게.",
    },
  },
} as const;

const questionsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prompt", "choices", "answerIndex", "explanation"],
        properties: {
          prompt: {
            type: "string",
            description:
              "발문. 그 자체만 읽고도 무엇을 묻는지 알 수 있는 완결된 한 문장.",
          },
          choices: {
            type: "array",
            items: { type: "string" },
            description:
              "선택지 정확히 5개. 길이와 문체, 구체성 수준을 서로 비슷하게 맞춘다.",
          },
          answerIndex: {
            type: "integer",
            description: "정답 선택지의 0부터 시작하는 인덱스. 0 이상 4 이하.",
          },
          explanation: {
            type: "string",
            description:
              "정답이 맞는 이유 한 문장과, 가장 헷갈리는 오답이 틀린 이유 한 문장.",
          },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = [
  "너는 대학 강의의 형성평가 문항을 만드는 출제자다.",
  "학생이 개념을 실제로 이해했는지 가려내는 것이 목적이고, 외운 문장을 그대로 되묻는 것은 목적이 아니다.",
  "",
  "[문항]",
  `- 모든 문항은 선택지 ${CHOICE_COUNT}개짜리 객관식이고, 이견 없는 정답이 정확히 하나다.`,
  "- 한 문항은 한 가지만 묻는다. 발문만 읽고도 무엇을 답해야 하는지 알 수 있게 쓴다.",
  "- 지문이 따로 없으므로 '위 글', '다음 표'처럼 없는 자료를 가리키지 않는다.",
  "- 부정형 발문은 꼭 필요할 때만 쓰고, 쓸 때는 부정어를 드러나게 적는다.",
  "",
  "[선택지]",
  "- 오답은 그 주제에서 학생이 실제로 저지르는 오해를 반영한다. 주제와 무관한 선택지는 쓰지 않는다.",
  "- 정답만 유독 길거나 자세해서는 안 된다. 다섯 선택지의 길이와 문체를 비슷하게 맞춘다.",
  "- 선택지끼리 의미가 겹치거나 한쪽이 다른 쪽을 포함해서는 안 된다.",
  "- '위 모두 해당', '정답 없음', '알 수 없음' 같은 선택지는 쓰지 않는다.",
  "- '항상', '절대', '모든' 같은 단정적 표현은 그 자체가 단서가 되므로 피한다.",
  "",
  "[해설]",
  "- 정답이 왜 맞는지, 그리고 가장 고르기 쉬운 오답이 왜 틀리는지를 짚는다.",
  "- 선택지는 번호나 기호가 아니라 내용으로 가리킨다. 화면에서 순서가 바뀔 수 있다.",
  "",
  "[언어]",
  "- 제목, 발문, 선택지, 해설을 모두 한국어로 쓴다. 학술 용어는 필요하면 원어를 괄호로 덧붙인다.",
].join("\n");

/**
 * The reasoning models accept only the default temperature and answer a request
 * for any other with a 400. Which model runs is an env var, so the refusal is
 * detected rather than predicted from a list of model names that goes stale.
 */
function rejectsTemperature(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIError &&
    error.status === 400 &&
    typeof error.message === "string" &&
    error.message.includes("temperature")
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Runs the jobs with at most `limit` in flight, keeping the input order. */
async function pooled<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await run(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Spreads the keys evenly across the five slots and reshuffles the distractors.
 * Each batch only sees its own questions, so none of them can place an answer
 * with the whole quiz in view — doing it here is both more even than asking and
 * one less thing for the model to spend attention on.
 */
function balanceAnswerPositions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const targets = shuffle(questions.map((_, i) => i % CHOICE_COUNT));

  return questions.map((q, i) => {
    const target = targets[i];
    const answer = q.choices[q.answerIndex];
    const others = shuffle(q.choices.filter((_, j) => j !== q.answerIndex));
    return {
      ...q,
      choices: [...others.slice(0, target), answer, ...others.slice(target)],
      answerIndex: target,
    };
  });
}

export async function generateQuiz(params: {
  topic: string;
  questionCount: number;
  difficulty: Difficulty;
}): Promise<GeneratedQuiz> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 없습니다. .env.local에 키를 넣어 주세요.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const brief = DIFFICULTY_BRIEF[params.difficulty];

  // Settled once on the outline call and reused, so the batches never spend a
  // round trip rediscovering it.
  let allowTemperature = true;

  async function ask(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    name: string,
    schema: Record<string, unknown>
  ): Promise<string> {
    const request = {
      model,
      messages,
      response_format: {
        type: "json_schema" as const,
        json_schema: { name, strict: true, schema },
      },
    };

    let completion;
    if (allowTemperature) {
      try {
        completion = await client.chat.completions.create({
          ...request,
          temperature: 0.7,
        });
      } catch (error) {
        if (!rejectsTemperature(error)) throw error;
        allowTemperature = false;
      }
    }
    completion ??= await client.chat.completions.create(request);

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("모델이 빈 응답을 돌려줬습니다. 다시 시도해 주세요.");
    return raw;
  }

  // Phase one: carve the topic into one distinct checkpoint per question. The
  // batches below run blind to each other, so this is what keeps two of them
  // from writing the same question twice.
  const outlineRaw = await ask(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          `주제: ${params.topic}`,
          `문항 수: ${params.questionCount}개`,
          `난이도: ${brief}`,
          "",
          `이 주제를 서로 겹치지 않는 확인 지점 ${params.questionCount}개로 나눠라.`,
          "각 지점은 한 문항이 맡을 만큼 좁고 구체적이어야 하고, 문항은 아직 쓰지 않는다.",
          "쉬운 지점부터 어려운 지점 순으로 늘어놓는다.",
        ].join("\n"),
      },
    ],
    "outline",
    outlineJsonSchema
  );

  const outline = outlineSchema.safeParse(JSON.parse(outlineRaw));
  if (!outline.success) {
    throw new Error("문항 구성을 잡지 못했습니다. 다시 시도해 주세요.");
  }

  const points = outline.data.points.slice(0, params.questionCount);
  if (points.length < params.questionCount) {
    throw new Error(
      `주제를 ${params.questionCount}개 지점으로 나누지 못했습니다. 주제를 조금 더 넓게 적고 다시 시도해 주세요.`
    );
  }

  // Phase two: every batch writes its own slice, all at once.
  const batches = chunk(points, BATCH_SIZE);
  const written = await pooled(batches, MAX_CONCURRENT, async (batch) => {
    const raw = await ask(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `주제: ${params.topic}`,
            `난이도: ${brief}`,
            "",
            `아래 확인 지점마다 문항을 하나씩, 모두 ${batch.length}개 써라.`,
            "지점의 순서를 그대로 지키고, 맡지 않은 내용은 건드리지 않는다.",
            "",
            ...batch.map((point, i) => `${i + 1}. ${point}`),
          ].join("\n"),
        },
      ],
      "questions",
      questionsJsonSchema
    );

    const parsed = z
      .object({ questions: z.array(questionSchema) })
      .safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error("생성된 문항 형식이 올바르지 않습니다. 다시 시도해 주세요.");
    }
    return parsed.data.questions.slice(0, batch.length);
  });

  const questions = written.flat().slice(0, params.questionCount);
  if (questions.length < params.questionCount) {
    throw new Error(
      `문항이 ${questions.length}개만 생성됐습니다. 주제를 조금 더 구체적으로 적고 다시 시도해 주세요.`
    );
  }

  return generatedSchema.parse({
    title: outline.data.title,
    description: outline.data.description,
    questions: balanceAnswerPositions(questions),
  });
}
