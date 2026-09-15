create extension if not exists "pgcrypto";

create table if not exists quizzes (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  topic          text not null,
  title          text not null,
  description    text,
  difficulty     text not null check (difficulty in ('easy','medium','hard')),
  question_count integer not null check (question_count between 1 and 30),
  owner_id       text not null,
  owner_nickname text not null,
  published      boolean not null default false,
  published_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists quizzes_owner_idx on quizzes (owner_id, created_at desc);
create index if not exists quizzes_published_idx on quizzes (published, published_at desc);

create table if not exists questions (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references quizzes(id) on delete cascade,
  position     integer not null,
  prompt       text not null,
  choices      jsonb not null,
  answer_index integer not null,
  explanation  text,
  unique (quiz_id, position)
);

create index if not exists questions_quiz_idx on questions (quiz_id, position);

create table if not exists attempts (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references quizzes(id) on delete cascade,
  user_id       text not null,
  nickname      text not null,
  answers       jsonb not null,
  correct_count integer not null,
  total_count   integer not null,
  score         integer not null,
  submitted_at  timestamptz not null default now()
);

create index if not exists attempts_quiz_idx on attempts (quiz_id, submitted_at desc);
create index if not exists attempts_user_idx on attempts (user_id, submitted_at desc);
