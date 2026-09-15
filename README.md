# 답안지

주제를 입력하면 객관식 문항을 만들어 주고, 공개하면 학생이 한 문항씩 풀어 바로 점수를 확인하는 퀴즈 사이트입니다.

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **Neon Postgres** (`@neondatabase/serverless`)
- **OpenAI** 문항 생성 (structured outputs)
- **Vercel** 배포

## 시작하기

### 1. 환경 변수

`.env.example`을 복사한 `.env.local`이 이미 있습니다. 값만 채워 주세요.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | Neon 콘솔 → Connection Details → **Pooled connection** 문자열 |
| `DATABASE_URL_UNPOOLED` | (선택) 풀러를 거치지 않는 직접 연결 |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `OPENAI_MODEL` | (선택) 기본값 `gpt-4o-mini` |

Vercel Marketplace에서 Neon을 연동하면 `DATABASE_URL`은 자동으로 주입됩니다.

```bash
npm i -g vercel          # 아직 없다면
vercel link
vercel integration add neon
vercel env pull .env.local
```

### 2. 테이블 만들기

```bash
npm run db:init
```

`src/lib/schema.sql`을 실행합니다. 모든 구문이 `if not exists`라 여러 번 돌려도 안전합니다.

### 3. 개발 서버

```bash
npm run dev
```

http://localhost:3000

## 흐름

```
/                     닉네임을 정하고 교수자 / 학생 선택
│
├── /teacher          주제·문항 수·난이도를 넣고 문항 생성, 내 퀴즈 목록
│   └── /teacher/[id] 문항 확인(정답 포함), 공개/비공개 전환,
│                     공유 코드·링크, 응시자별 점수와 문항별 정답률
│
├── /student          공개된 퀴즈 목록, 공유 코드로 바로 들어가기
│
├── /q/[code]         응시 — 한 화면에 한 문항, 이전/다음 자유 이동
│                     (링크로 처음 온 사람은 여기서 닉네임을 정합니다)
│
└── /result/[id]      점수와 문항별 채점, 정답과 해설
```

## API

| 메서드 | 경로 | 하는 일 |
| --- | --- | --- |
| `GET` | `/api/quizzes?scope=published` | 공개된 퀴즈 목록 |
| `GET` | `/api/quizzes?scope=mine&ownerId=` | 내가 만든 퀴즈 목록 |
| `POST` | `/api/quizzes` | OpenAI로 문항 생성 후 저장 |
| `GET` | `/api/quizzes/:id?ownerId=` | 출제자용 상세 (정답 포함) |
| `PATCH` | `/api/quizzes/:id` | 공개 / 비공개 전환 |
| `DELETE` | `/api/quizzes/:id?ownerId=` | 삭제 |
| `GET` | `/api/quizzes/:id/results?ownerId=` | 응시 결과와 문항별 정답률 |
| `GET` | `/api/quizzes/code/:code` | 응시자용 퀴즈 (**정답 제외**) |
| `POST` | `/api/attempts` | 서버에서 채점하고 응시 기록 저장 |
| `GET` | `/api/attempts/:id` | 채점 결과 |

## 설계 메모

**정답은 서버 밖으로 나가지 않습니다.** `/api/quizzes/code/:code`가 내려주는 문항에는
`answerIndex`가 없고, 채점은 `POST /api/attempts`에서 DB의 정답과 대조해 이뤄집니다.
점수도 클라이언트가 보낸 값을 쓰지 않고 서버가 계산합니다.

**로그인은 없습니다.** 닉네임과 브라우저에서 만든 `userId`를 `localStorage`에 두고
소유권 확인에만 씁니다. 같은 브라우저를 계속 써야 자기 퀴즈가 보입니다. 실제 수업에
쓰려면 여기에 인증을 붙이는 것이 다음 단계입니다.

**문항 생성은 최대 120초**(`maxDuration`)까지 걸릴 수 있어 Vercel Functions의
기본 타임아웃 안에 들어옵니다.

## 배포

```bash
vercel deploy --prod
```

Neon 연동과 `OPENAI_API_KEY`를 Vercel 프로젝트 환경 변수에 넣은 뒤,
배포 환경에서 `npm run db:init`을 한 번 실행하거나 Neon SQL Editor에
`src/lib/schema.sql`을 붙여 넣으면 됩니다.
