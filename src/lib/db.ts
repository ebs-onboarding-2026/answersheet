import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

let cached: NeonSql | null = null;

function client(): NeonSql {
  if (cached) return cached;

  const connectionString =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL이 없습니다. .env.local에 Neon 연결 문자열을 넣어 주세요."
    );
  }

  cached = neon(connectionString);
  return cached;
}

/**
 * Neon's HTTP driver — one round trip per query, safe inside Vercel Functions.
 * Connecting is deferred to the first query so `next build` never needs credentials.
 */
export const sql: NeonSql = new Proxy(function () {} as unknown as NeonSql, {
  apply(_target, _thisArg, args: Parameters<NeonSql>) {
    return Reflect.apply(client(), undefined, args);
  },
  get(_target, prop, receiver) {
    const value = Reflect.get(client(), prop, receiver);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});

/** Ambiguous characters left out so a code still works when read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeShareCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}
