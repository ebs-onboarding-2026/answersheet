export type Role = "teacher" | "student";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

export type Question = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
  /** Hidden from students until they submit. */
  answerIndex?: number;
  explanation?: string | null;
};

export type Quiz = {
  id: string;
  code: string;
  topic: string;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  questionCount: number;
  ownerId: string;
  ownerNickname: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  attemptCount?: number;
  averageScore?: number | null;
};

export type QuizWithQuestions = Quiz & { questions: Question[] };

export type AttemptSummary = {
  id: string;
  quizId: string;
  nickname: string;
  correctCount: number;
  totalCount: number;
  score: number;
  submittedAt: string;
};

export type GradedAnswer = {
  position: number;
  prompt: string;
  choices: string[];
  chosenIndex: number | null;
  answerIndex: number;
  correct: boolean;
  explanation: string | null;
};

export type AttemptResult = AttemptSummary & {
  quizTitle: string;
  quizCode: string;
  answers: GradedAnswer[];
};
