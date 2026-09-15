/**
 * Reproduction + verification for the lost-quiz bug.
 *
 * Root cause: identity was a random UUID minted in the browser's localStorage,
 * so a new browser — or just pressing "나가기" — orphaned every quiz the author
 * had made. These checks pin the account down to the nickname instead.
 *
 * Usage: npm run dev, then `node scripts/check-accounts.mjs`
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const stamp = Date.now().toString(36);

let failures = 0;

function check(label, ok, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // a 404 from Next is HTML, not JSON
  }
  return { status: res.status, data };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

const teacher = `선생_${stamp}`;
const student = `학생_${stamp}`;

// 1. The bug itself: signing in again with the same name must be the same account.
const first = await post("/api/session", { nickname: teacher, role: "teacher" });
check("첫 로그인이 계정을 발급한다", first.status === 200 && !!first.data?.user?.id,
  `status ${first.status} ${JSON.stringify(first.data)}`);

const second = await post("/api/session", { nickname: teacher, role: "teacher" });
check("같은 닉네임 재로그인 = 같은 userId (새 브라우저/나가기 후 재입장)",
  !!first.data?.user?.id && first.data.user.id === second.data?.user?.id,
  `${first.data?.user?.id} vs ${second.data?.user?.id}`);

// 2. Whitespace and case must not fork the account.
const loose = await post("/api/session", { nickname: `  ${teacher.toUpperCase()}  `, role: "teacher" });
check("공백/대소문자가 달라도 같은 계정",
  loose.data?.user?.id === first.data?.user?.id,
  `${loose.data?.user?.id}`);

// 3. One account = one role.
const crossRole = await post("/api/session", { nickname: teacher, role: "student" });
check("같은 닉네임을 다른 역할로 쓰면 거부 (409)", crossRole.status === 409,
  `status ${crossRole.status} ${JSON.stringify(crossRole.data)}`);

// 4. The server, not just the UI, enforces the role.
const learner = await post("/api/session", { nickname: student, role: "student" });
check("학생 계정 발급", learner.status === 200 && !!learner.data?.user?.id,
  `status ${learner.status}`);

const asStudent = await post("/api/quizzes", {
  topic: "삼각함수의 덧셈정리",
  questionCount: 3,
  difficulty: "easy",
  ownerId: learner.data?.user?.id ?? "none",
});
check("학생 계정은 출제 API가 거부한다 (403)", asStudent.status === 403,
  `status ${asStudent.status} ${JSON.stringify(asStudent.data)}`);

// 5. Unknown ids are not accepted as owners.
const ghost = await post("/api/quizzes", {
  topic: "삼각함수의 덧셈정리",
  questionCount: 3,
  difficulty: "easy",
  ownerId: crypto.randomUUID(),
});
check("존재하지 않는 계정의 출제 요청 거부", ghost.status === 401 || ghost.status === 403,
  `status ${ghost.status}`);

// 6. The teacher's list is reachable from the rediscovered account.
const mine = await get(`/api/quizzes?scope=mine&ownerId=${first.data?.user?.id}`);
check("내 퀴즈 목록 조회 가능", mine.status === 200 && Array.isArray(mine.data?.quizzes),
  `status ${mine.status}`);


// 7. The real recovery: an author who lost their quizzes when the browser UUID
//    reset gets them back by signing in under the same name. Set
//    RECOVER_NICKNAME to an existing author to check it; skipped otherwise.
const recover = process.env.RECOVER_NICKNAME;
if (recover) {
  const back = await post("/api/session", { nickname: recover, role: "teacher" });
  const list = await get(`/api/quizzes?scope=mine&ownerId=${back.data?.user?.id}`);
  check(`'${recover}' 계정이 예전 퀴즈를 되찾는다`,
    back.status === 200 && list.data?.quizzes?.length > 0,
    `${list.data?.quizzes?.length ?? 0}개`);
}


// 8. The graded sheet carries the answer key, so it is not public. ATTEMPT_ID
//    names a real attempt; skipped when it is not set.
const attemptId = process.env.ATTEMPT_ID;
if (attemptId) {
  const anon = await get(`/api/attempts/${attemptId}`);
  check("답안지는 로그인 없이 못 본다 (401)", anon.status === 401, `status ${anon.status}`);

  const outsider = await get(`/api/attempts/${attemptId}?viewerId=${learner.data?.user?.id}`);
  check("남의 답안지는 못 본다 (403)", outsider.status === 403, `status ${outsider.status}`);
}

console.log(`\n${failures === 0 ? "모두 통과" : `${failures}개 실패`}`);
process.exit(failures === 0 ? 0 : 1);
