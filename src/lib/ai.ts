import OpenAI from "openai";
import { z } from "zod";
import type { Difficulty } from "./types";

/** Every question is five choices with exactly one key. */
export const CHOICE_COUNT = 5;

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

const generatedSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1),
        choices: z.array(z.string().min(1)).length(CHOICE_COUNT),
        answerIndex: z.number().int().min(0).max(CHOICE_COUNT - 1),
        explanation: z.string(),
      })
    )
    .min(1),
});

export type GeneratedQuiz = z.infer<typeof generatedSchema>;

/**
 * Structured outputs in strict mode ignore minItems/maxItems, so the choice
 * count is carried by the description here and checked by zod on the way back.
 */
const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "questions"],
  properties: {
    title: { type: "string", description: "퀴즈 제목. 20자 이내." },
    description: { type: "string", description: "이 퀴즈가 무엇을 확인하는지 한 문장." },
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
  "- 요청된 문항 수만큼 주제의 서로 다른 갈래를 고르게 다룬다. 같은 것을 두 번 묻지 않는다.",
  "",
  "[선택지]",
  "- 오답은 그 주제에서 학생이 실제로 저지르는 오해를 반영한다. 주제와 무관한 선택지는 쓰지 않는다.",
  "- 정답만 유독 길거나 자세해서는 안 된다. 다섯 선택지의 길이와 문체를 비슷하게 맞춘다.",
  "- 선택지끼리 의미가 겹치거나 한쪽이 다른 쪽을 포함해서는 안 된다.",
  "- '위 모두 해당', '정답 없음', '알 수 없음' 같은 선택지는 쓰지 않는다.",
  "- '항상', '절대', '모든' 같은 단정적 표현은 그 자체가 단서가 되므로 피한다.",
  "- 정답 위치를 다섯 자리에 고르게 흩어 놓는다. 한 자리에 몰리면 안 된다.",
  "",
  "[해설]",
  "- 정답이 왜 맞는지, 그리고 가장 고르기 쉬운 오답이 왜 틀리는지를 짚는다.",
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

  const request = {
    model,
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: [
          `주제: ${params.topic}`,
          `문항 수: 정확히 ${params.questionCount}개`,
          `난이도: ${DIFFICULTY_BRIEF[params.difficulty]}`,
        ].join("\n"),
      },
    ],
    response_format: {
      type: "json_schema" as const,
      json_schema: { name: "quiz", strict: true, schema: jsonSchema },
    },
  };

  // A little spread keeps twenty questions on one topic from rhyming; ask for
  // it, and go with the model's default when it will not take it.
  let completion;
  try {
    completion = await client.chat.completions.create({ ...request, temperature: 0.7 });
  } catch (error) {
    if (!rejectsTemperature(error)) throw error;
    completion = await client.chat.completions.create(request);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("모델이 빈 응답을 돌려줬습니다. 다시 시도해 주세요.");

  const parsed = generatedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error("생성된 문항 형식이 올바르지 않습니다. 다시 시도해 주세요.");
  }

  // Trim or reject if the model drifted off the requested count.
  const questions = parsed.data.questions.slice(0, params.questionCount);
  if (questions.length < params.questionCount) {
    throw new Error(
      `문항이 ${questions.length}개만 생성됐습니다. 주제를 조금 더 구체적으로 적고 다시 시도해 주세요.`
    );
  }

  return { ...parsed.data, questions };
}
