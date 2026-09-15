import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

// Load .env.local without adding a dependency.
try {
  const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // no .env.local — fall back to the ambient environment
}

const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("DATABASE_URL이 설정되지 않았습니다. .env.local을 확인하세요.");
  process.exit(1);
}

const schemaPath = fileURLToPath(new URL("../src/lib/schema.sql", import.meta.url));
const schema = await readFile(schemaPath, "utf8");

const sql = neon(connectionString);

// The driver sends one statement per request, so split on top-level semicolons.
const statements = schema
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
  console.log("✓", statement.split("\n")[0].slice(0, 72));
}

console.log(`\n테이블 준비 완료 (${statements.length}개 구문 실행).`);
