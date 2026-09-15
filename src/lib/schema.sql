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

-- An account, keyed by the name the person types on the way in. Before this
-- table the identity was a UUID minted in localStorage, so a new browser — or
-- just pressing 나가기 — silently orphaned everything the author had made.
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  nickname   text not null,
  role       text not null check (role in ('teacher','student')),
  created_at timestamptz not null default now()
);

-- Folded, so "선생님" and "  선생님 " are the one account and not three.
create unique index if not exists users_nickname_key on users (lower(nickname));

-- Backfill: hand every pre-account quiz back to the name that wrote it.
insert into users (nickname, role)
select distinct on (lower(owner_nickname)) owner_nickname, 'teacher'
from quizzes
where not exists (
  select 1 from users u where lower(u.nickname) = lower(quizzes.owner_nickname)
)
order by lower(owner_nickname), created_at;

update quizzes q
set owner_id = u.id::text
from users u
where lower(u.nickname) = lower(q.owner_nickname)
  and q.owner_id is distinct from u.id::text;

-- Same for anyone who only ever sat a quiz.
insert into users (nickname, role)
select distinct on (lower(nickname)) nickname, 'student'
from attempts
where not exists (
  select 1 from users u where lower(u.nickname) = lower(attempts.nickname)
)
order by lower(nickname), submitted_at;

update attempts a
set user_id = u.id::text
from users u
where lower(u.nickname) = lower(a.nickname)
  and a.user_id is distinct from u.id::text;
