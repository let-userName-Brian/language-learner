-- Enable RLS where needed
alter table public.user_profiles enable row level security;
alter table public.progress enable row level security;

-- USER PROFILES: user can read/update only their own profile
drop policy if exists "select own profile" on public.user_profiles;
create policy "select own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "upsert own profile" on public.user_profiles;
create policy "upsert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own profile" on public.user_profiles;
create policy "update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id);

-- PROGRESS: user can read and upsert only their own lesson progress
drop policy if exists "select own progress" on public.progress;
create policy "select own progress"
on public.progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress"
on public.progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own progress" on public.progress;
create policy "update own progress"
on public.progress
for update
to authenticated
using (auth.uid() = user_id);
