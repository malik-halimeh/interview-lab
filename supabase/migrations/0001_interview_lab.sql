create extension if not exists pgcrypto;

create type public.assessment_mode as enum ('flexible', 'strict');
create type public.assessment_status as enum ('active', 'completed', 'abandoned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  real_name text,
  publish_real_name boolean not null default false,
  leaderboard_visible boolean not null default true,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint real_name_public_requires_name check (not publish_real_name or real_name is not null)
);

create table public.study_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  status text not null default 'unseen' check (status in ('unseen', 'learning', 'review', 'mastered')),
  ease_factor numeric not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  next_review_at timestamptz,
  private_answer text,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.study_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  private_answer text not null default '',
  created_at timestamptz not null default now()
);

create table public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.assessment_mode not null,
  status public.assessment_status not null default 'active',
  item_version text not null default '2026-08-event-v1',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_item_id text,
  current_option_order jsonb,
  current_deadline timestamptz,
  family_order jsonb not null,
  sequence_ids jsonb not null default '[]'::jsonb,
  sequence_hash text,
  theta numeric not null default 0,
  standard_error numeric not null default 1,
  scaled_grade integer,
  readiness_band text,
  focus_events integer not null default 0,
  leaderboard_eligible boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index one_active_assessment_per_candidate
  on public.assessment_sessions(user_id) where status = 'active';
create index assessment_sessions_recent on public.assessment_sessions(user_id, mode, completed_at desc);

create table public.assessment_responses (
  id uuid primary key,
  session_id uuid not null references public.assessment_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  family text not null,
  difficulty_b numeric not null,
  answer_ids jsonb not null,
  correct boolean not null,
  deadline_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (session_id, item_id)
);

create table public.integrity_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('focus-hidden', 'reload')),
  created_at timestamptz not null default now()
);

create table public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.assessment_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.assessment_mode not null,
  grade integer not null check (grade between 0 and 100),
  band text not null,
  eligible boolean not null,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);

create index leaderboard_mode_grade on public.leaderboard_entries(mode, grade desc);

create table public.admin_actions (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_entry_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.study_progress enable row level security;
alter table public.study_attempts enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.integrity_events enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.admin_actions enable row level security;

create policy "candidate reads own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "candidate updates own safe profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "candidate reads own study progress" on public.study_progress for select to authenticated using (user_id = auth.uid());
create policy "candidate creates own study progress" on public.study_progress for insert to authenticated with check (user_id = auth.uid());
create policy "candidate updates own study progress" on public.study_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "candidate reads own study attempts" on public.study_attempts for select to authenticated using (user_id = auth.uid());
create policy "candidate appends own study attempts" on public.study_attempts for insert to authenticated with check (user_id = auth.uid());
-- Assessment state, responses, integrity events, leaderboard rows, and audit rows
-- deliberately have no browser policies. Candidates receive a minimized view
-- of their own records through the ownership-checking Edge Function only.

create or replace function public.make_private_nickname()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  adjectives text[] := array['Calm','Curious','Bright','Quiet','Patient','Clever','Steady','Kind','Nimble','Measured'];
  nouns text[] := array['Comet','Circuit','Lynx','Vector','Otter','Falcon','Pixel','Orbit','Cedar','Fox'];
  candidate text;
  suffix integer;
begin
  loop
    suffix := (get_byte(gen_random_bytes(2), 0) * 256 + get_byte(gen_random_bytes(2), 1)) % 10000;
    candidate := adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
      || nouns[1 + floor(random() * array_length(nouns, 1))::int]
      || '-' || lpad(suffix::text, 4, '0');
    exit when not exists (select 1 from public.profiles where nickname = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_candidate_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, nickname) values (new.id, public.make_private_nickname());
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users for each row execute function public.create_candidate_profile();

create or replace function public.public_leaderboard(p_mode public.assessment_mode)
returns table(rank bigint, display_name text, grade integer, band text, own boolean)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with recent as (
    select e.*, row_number() over (partition by e.user_id order by e.created_at desc, e.id desc) as attempt_number
    from public.leaderboard_entries e
    join public.profiles p on p.id = e.user_id
    where e.mode = p_mode and e.eligible and e.removed_at is null and p.leaderboard_visible
  ), candidate_best as (
    select distinct on (r.user_id) r.user_id, r.grade, r.band
    from recent r
    where r.attempt_number <= 3
    order by r.user_id, r.grade desc
  )
  select dense_rank() over (order by b.grade desc) as rank,
    case when p.publish_real_name and p.real_name is not null then p.real_name else p.nickname end as display_name,
    b.grade,
    b.band,
    b.user_id = auth.uid() as own
  from candidate_best b
  join public.profiles p on p.id = b.user_id
  order by b.grade desc, display_name asc;
$$;

grant execute on function public.public_leaderboard(public.assessment_mode) to anon, authenticated;

revoke execute on function public.make_private_nickname() from public;
revoke execute on function public.create_candidate_profile() from public;

revoke all on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update(real_name, publish_real_name, leaderboard_visible) on public.profiles to authenticated;
grant select, insert, update on public.study_progress to authenticated;
grant select, insert on public.study_attempts to authenticated;
revoke all on public.assessment_sessions, public.assessment_responses, public.integrity_events, public.leaderboard_entries, public.admin_actions from anon, authenticated;

create or replace function public.remove_leaderboard_entry(p_entry_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'leaderboard_admin' then
    raise exception 'not authorized';
  end if;
  update public.leaderboard_entries set removed_at = now() where id = p_entry_id and removed_at is null;
  if not found then raise exception 'entry not found'; end if;
  insert into public.admin_actions(actor_id, action, target_entry_id, reason)
    values (auth.uid(), 'leaderboard_entry_removed', p_entry_id, p_reason);
end;
$$;

revoke all on function public.remove_leaderboard_entry(uuid, text) from public;
grant execute on function public.remove_leaderboard_entry(uuid, text) to authenticated;
