import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, signIn } from "@/lib/users";
import { message } from "@/lib/rows";

const schema = z.object({
  nickname: z.string().trim().min(1, "닉네임을 적어 주세요.").max(40),
  role: z.enum(["teacher", "student"]),
});

/** POST /api/session — find or create the account behind this nickname. */
export async function POST(request: Request) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "입력값을 확인해 주세요." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "요청을 읽지 못했습니다." }, { status: 400 });
  }

  try {
    const user = await signIn(input.nickname, input.role);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
