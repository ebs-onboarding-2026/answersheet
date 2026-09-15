import OpenAI from "openai";
import { z } from "zod";
import type { Difficulty } from "./types";

const DIFFICULTY_BRIEF: Record<Difficulty, string> = {
  easy: "학부 1학년 수준. 정의와 기본 개념을 확인하는 문항 위주로 내고, 오답 선택지는 명확히 구별되게 한다.",
  medium:
    "학부 중급 수준. 개념을 사례에 적용하거나 두 개념을 비교해야 풀리는 문항을 섞고, 오답 선택지는 그럴듯하게 만든다.",
  hard: "심화 수준. 여러 개념을 연결해 추론하거나 미묘한 예외를 판단해야 풀리는 문항을 내고, 오답 선택지는 흔한 오개념을 반영한다.",
};

const generatedSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1),
        choices: z.array(z.string().min(1)).length(4),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
      })
    )
    .min(1),
});

export type GeneratedQuiz = z.infer<typeof generatedSchema>;

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
          prompt: { type: "string", description: "문항. 완결된 한 문장 또는 발문." },
          choices: {
            type: "array",
            items: { type: "string" },
            description: "선택지 4개. 길이를 비슷하게 맞춘다.",
          },
          answerIndex: {
            type: "integer",
            description: "정답 선택지의 0부터 시작하는 인덱스.",
          },
          explanation: { type: "string", description: "정답 해설 한두 문장." },
        },
      },
    },
  },
} as const;

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

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: [
          "너는 대학 강의의 형성평가 문항을 만드는 출제자다.",
          "규칙:",
          "- 모든 문항은 선택지 4개짜리 객관식이고 정답은 정확히 하나다.",
          "- 정답이 특정 위치에 몰리지 않게 선택지 순서를 고르게 섞는다.",
          "- '위 모두 해당', '정답 없음' 같은 선택지는 쓰지 않는다.",
          "- 같은 내용을 묻는 문항을 두 번 내지 않는다.",
          "- 문항, 선택지, 해설을 모두 한국어로 쓴다.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `주제: ${params.topic}`,
          `문항 수: 정확히 ${params.questionCount}개`,
          `난이도: ${DIFFICULTY_BRIEF[params.difficulty]}`,
        ].join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "quiz", strict: true, schema: jsonSchema },
    },
  });

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
