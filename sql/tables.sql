-- COURSES
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                   -- e.g. 'latin-intro-i'
  title text not null,
  description text,
  grade_level text check (grade_level in ('MS','HS')) default 'MS',
  created_at timestamptz default now()
);

-- UNITS
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  "order" int not null,
  title text not null,
  description text
);

create index if not exists units_course_order_idx on public.units(course_id, "order");

-- LESSONS
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  "order" int not null,
  title text not null
);

create index if not exists lessons_unit_order_idx on public.lessons(unit_id, "order");

-- ITEMS (sentences/exercises)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  kind text check (kind in ('sentence','vocab','picture-match','tile-build')) default 'sentence',
  latin text not null,
  accepted_english jsonb not null,      -- ["The girl carries...", "The girl is carrying..."]
  lemmas jsonb not null,                -- ["puella","porto","aqua","casa","ad"]
  morph jsonb not null,                 -- [{form:"Puella", pos:"N", case:"Nom", num:"S"}, ...]
  sense_notes jsonb,                    -- {"porto":"carry"}
  parent_tip text,
  media jsonb,                          -- {"image":"...","audio_classical":"...","audio_ecclesiastical":"..."}
  meta jsonb                            -- {"topic":"home","chapter_map":"Ch2-U1"}
);

create index if not exists items_lesson_idx on public.items(lesson_id);

-- LEXICON (school-scope dictionary)
create table if not exists public.lexicon (
  lemma text primary key,
  part_of_speech text,
  definition text,
  principal_parts text[],
  valency_notes jsonb                    -- {"ad":"accusative","in":{"acc":"into","abl":"in/at"}}
);




-- USER PROFILES
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text check (role in ('student','parent','teacher','admin')) default 'student',
  pronunciation text check (pronunciation in ('classical','ecclesiastical')) default 'classical',
  macrons boolean default true
);

-- PROGRESS (one row per lesson per user)
create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text check (status in ('not_started','in_progress','completed')) not null,
  last_position jsonb,                           -- {"item_id":"...", "step":2}
  updated_at timestamptz default now(),
  unique (user_id, lesson_id)
);

create index if not exists progress_user_lesson_idx on public.progress(user_id, lesson_id);
