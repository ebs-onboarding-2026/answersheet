import { sql } from "./db";
import type { Role } from "./types";

export type User = { id: string; nickname: string; role: Role };

type UserRow = { id: string; nickname: string; role: Role };

const ROLE_LABEL: Record<Role, string> = { teacher: "교수자", student: "학생" };

/** Thrown with the status the route should answer with. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** The account name as stored and compared — see the lower(nickname) index. */
export function foldNickname(nickname: string): string {
  return nickname.trim();
}

export async function findByNickname(nickname: string): Promise<User | null> {
  const folded = foldNickname(nickname);
  const [row] = (await sql`
    select id, nickname, role from users where lower(nickname) = lower(${folded})
  `) as UserRow[];
  return row ?? null;
}

/**
 * The whole login. The nickname is the account, so coming back on another
 * browser — or after 나가기 — lands on the same id and the same quizzes.
 * One account holds one role, so a name already taken by the other side is
 * refused rather than quietly forked into a second account.
 */
export async function signIn(nickname: string, role: Role): Promise<User> {
  const folded = foldNickname(nickname);

  const existing = await findByNickname(folded);
  if (existing) {
    if (existing.role !== role) {
      throw new AuthError(
        `'${existing.nickname}' 이름은 이미 ${ROLE_LABEL[existing.role]} 계정으로 쓰이고 있습니다. ` +
          `${ROLE_LABEL[existing.role]}로 들어오시거나 다른 이름을 적어 주세요.`,
        409
      );
    }
    return existing;
  }

  try {
    const [row] = (await sql`
      insert into users (nickname, role) values (${folded}, ${role})
      returning id, nickname, role
    `) as UserRow[];
    return row;
  } catch (error) {
    // Someone claimed the name between the select and the insert.
    const raced = await findByNickname(folded);
    if (raced) return signIn(folded, role);
    throw error;
  }
}

/**
 * Server-side gate for anything that acts as a user. The client can send any
 * ownerId it likes, so the role is read back from the table, never trusted
 * from the request body.
 */
export async function requireUser(
  userId: string | null | undefined,
  role: Role
): Promise<User> {
  if (!userId) throw new AuthError("로그인이 필요합니다.", 401);

  const [row] = (await sql`
    select id, nickname, role from users where id::text = ${userId}
  `) as UserRow[];

  if (!row) throw new AuthError("계정을 찾을 수 없습니다. 다시 로그인해 주세요.", 401);
  if (row.role !== role) {
    throw new AuthError(`${ROLE_LABEL[role]}만 할 수 있습니다.`, 403);
  }
  return row;
}
