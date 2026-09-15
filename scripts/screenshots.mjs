/**
 * Captures the README screenshots with Playwright.
 *
 *   SHOT_QUIZ=<quizId> SHOT_CODE=<code> node scripts/screenshots.mjs [baseUrl]
 *
 * Needs a published quiz that has a few attempts on it. The session lives in
 * localStorage, so each context writes one before the first script runs.
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
const QUIZ = process.env.SHOT_QUIZ;
const CODE = process.env.SHOT_CODE;

if (!QUIZ || !CODE) {
  console.error("SHOT_QUIZ와 SHOT_CODE가 필요합니다.");
  process.exit(1);
}

async function signIn(nickname, role) {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${nickname}: ${JSON.stringify(data)}`);
  return data.user;
}

await mkdir(OUT, { recursive: true });

const teacher = await signIn("장우석", "teacher");
const student = await signIn("김서연", "student");

const mine = await fetch(`${BASE}/api/attempts?userId=${student.id}`).then((r) =>
  r.json()
);
const studentAttempt = mine.attempts?.find((a) => a.quizId === QUIZ) ?? mine.attempts?.[0];
if (!studentAttempt) throw new Error("김서연의 응시 기록이 없습니다.");

const browser = await chromium.launch();

const VIEWPORT = { width: 1280, height: 900 };
const CONTEXT = {
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  colorScheme: "light",
  locale: "ko-KR",
  timezoneId: "Asia/Seoul",
};

/** The dev overlay button is not part of the product. */
const HIDE_DEV_TOOLS = `
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
`;

async function contextFor(session) {
  const ctx = await browser.newContext(CONTEXT);
  await ctx.addInitScript((value) => {
    if (value) window.localStorage.setItem("answersheet.session", value);
    else window.localStorage.clear();
  }, session ? JSON.stringify(session) : null);
  return ctx;
}

function sessionOf(user) {
  return { userId: user.id, nickname: user.nickname, role: user.role };
}

async function capture(session, jobs) {
  const ctx = await contextFor(session);
  const page = await ctx.newPage();
  await page.addStyleTag({ content: HIDE_DEV_TOOLS }).catch(() => {});

  for (const [name, path, opts = {}] of jobs) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: HIDE_DEV_TOOLS }).catch(() => {});
    if (opts.prepare) await opts.prepare(page);
    // Lists and results land after hydration; wait for the spinner to go.
    await page
      .getByText("불러오는 중", { exact: false })
      .first()
      .waitFor({ state: "detached", timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `${OUT}${name}.png`,
      fullPage: opts.full !== false,
    });
    console.log("✓", `${name}.png`, "←", path);
  }
  await ctx.close();
}

await capture(null, [["01-landing", "/", { full: false }]]);

await capture(sessionOf(teacher), [
  ["02-teacher-home", "/teacher"],
  ["03-teacher-questions", `/teacher/${QUIZ}`],
  [
    "04-teacher-results",
    `/teacher/${QUIZ}`,
    { prepare: (p) => p.locator("nav button").nth(1).click() },
  ],
  ["05-teacher-attempt", `/teacher/${QUIZ}/attempt/${studentAttempt.id}`],
]);

await capture(sessionOf(student), [
  ["06-student-home", "/student"],
  ["07-taking-quiz", `/q/${CODE}`, { full: false }],
  ["08-result", `/result/${studentAttempt.id}`],
]);

await browser.close();
console.log("\ndocs/screenshots/ 에 저장했습니다.");
