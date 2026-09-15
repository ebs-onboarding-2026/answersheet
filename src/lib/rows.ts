import type { Quiz, Question } from "./types";

export type QuizRow = {
  id: string;
  code: string;
  topic: string;
  title: string;
  description: string | null;
  difficulty: Quiz["difficulty"];
  question_count: number;
  owner_id: string;
  owner_nickname: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  attempt_count?: string | number;
  average_score?: string | number | null;
};

export type QuestionRow = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
  answer_index: number;
  explanation: string | null;
};

export function rowToQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    code: row.code,
    topic: row.topic,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    questionCount: row.question_count,
    ownerId: row.owner_id,
    ownerNickname: row.owner_nickname,
    published: row.published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    attemptCount:
      row.attempt_count === undefined ? undefined : Number(row.attempt_count),
    averageScore:
      row.average_score === undefined || row.average_score === null
        ? null
        : Math.round(Number(row.average_score)),
  };
}

/** `withAnswer: false` is what students receive — the key never leaves the server. */
export function rowToQuestion(row: QuestionRow, withAnswer: boolean): Question {
  return {
    id: row.id,
    position: row.position,
    prompt: row.prompt,
    choices: row.choices,
    ...(withAnswer
      ? { answerIndex: row.answer_index, explanation: row.explanation }
      : {}),
  };
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}
