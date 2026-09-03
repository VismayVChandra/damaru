-- Wave 1: close the loop.
--
-- Run this once, in the Supabase SQL Editor, on a project that already has the
-- original schema.sql applied. A brand-new project should run schema.sql
-- instead - it already includes everything below.
--
-- Adds two things: per-problem checklist state (so requirements and success
-- criteria can actually be ticked off rather than only read), and a progress
-- log (so "what moved" is recorded instead of inferred from a status dropdown).

alter table problems
  add column if not exists checklist jsonb not null default '{}'::jsonb;

create table if not exists progress_entries (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint body_not_empty check (length(trim(body)) > 0)
);

create index if not exists idx_progress_problem
  on progress_entries(problem_id, created_at desc);

alter table progress_entries enable row level security;

-- Ownership is inherited from the problem the entry belongs to: you can only
-- write progress against a problem that was issued to you.
create policy "progress entries are owned via their problem"
  on progress_entries for all
  using (
    exists (
      select 1 from problems p
      where p.id = progress_entries.problem_id and p.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from problems p
      where p.id = progress_entries.problem_id and p.profile_id = auth.uid()
    )
  );

-- Progress is public for the same reason the club feed is: seeing that someone
-- is actually moving is the point.
create policy "progress entries are publicly readable"
  on progress_entries for select
  using (true);
