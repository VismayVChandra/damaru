-- Damaru schema. Run this once in the Supabase SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run) on a fresh project.
--
-- Identity is Supabase Auth: profiles.id IS the auth.users.id, so a profile
-- can only ever belong to the account that owns it. `handle` is a separate,
-- unique, user-chosen public display name shown on the club feed - it is
-- never used for authorization, only for display.

create extension if not exists "pgcrypto";

create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  handle         text not null unique,
  display_name   text not null,
  -- Shown on the public profile page only - never part of the generator's
  -- inputs, just a line of "who I am" for other members to read.
  bio            text not null default '',
  skills         jsonb not null default '[]'::jsonb,
  interests      jsonb not null default '[]'::jsonb,
  artifact_prefs jsonb not null default '[]'::jsonb,
  time_budget    text not null default 'twoweeks',
  team_size      text not null default 'solo',
  appetite       text not null default 'stretch',
  -- Set by hand in the database only. The app never writes this column, so
  -- admin rights cannot be granted through the API.
  is_admin       boolean not null default false,
  -- Whether this person appears as a potential collaborator to others.
  discoverable   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint handle_format check (handle ~ '^[a-z0-9_-]{2,32}$'),
  constraint bio_len check (char_length(bio) <= 240),
  constraint time_budget_valid check (time_budget in ('weekend', 'twoweeks', 'semester')),
  constraint team_size_valid check (team_size in ('solo', 'pair', 'team')),
  constraint appetite_valid check (appetite in ('comfort', 'stretch', 'deepend'))
);

create table problems (
  id          uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  profile_id  uuid not null references profiles(id) on delete cascade,
  payload     jsonb not null,
  status      text not null default 'new',
  notes       text not null default '',
  checklist   jsonb not null default '{}'::jsonb,
  domain_id   text not null,
  fit         real not null,
  difficulty  int not null,
  created_at  timestamptz not null default now(),

  constraint status_valid check (status in ('new', 'saved', 'building', 'shipped', 'passed'))
);

-- One line per "what moved". A status dropdown records where something ended
-- up; this records that it is actually moving.
create table progress_entries (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint body_not_empty check (length(trim(body)) > 0)
);

-- The friction catalogue the generator draws from. Domains, mechanics,
-- artifacts and twists stay in code (structural, rarely change); frictions
-- live here so a club member can submit one and have it reach the generator
-- once accepted, without a deploy.
create table frictions (
  id           uuid primary key default gen_random_uuid(),
  domain_id    text not null,
  actor        text not null,
  text         text not null,
  mechanics    text[] not null,
  status       text not null default 'pending',
  -- null for the frictions seeded from the original hand-written catalogue.
  submitted_by uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,

  constraint friction_status_valid check (status in ('pending', 'accepted', 'rejected')),
  constraint friction_actor_len    check (char_length(btrim(actor)) between 3 and 120),
  constraint friction_text_len     check (char_length(btrim(text)) between 20 and 400),
  constraint friction_mechanics    check (array_length(mechanics, 1) between 1 and 8)
);

-- References the specific catalogue row a problem was drawn from, so
-- feedback can roll up per friction rather than floating per problem. An
-- `alter` here, not inline on `problems`: `frictions` is only created above,
-- after `problems` already is.
alter table problems
  add column friction_id uuid references frictions(id) on delete set null;

alter table problems
  add column feedback text
    check (feedback is null or feedback in ('up', 'down'));

create index idx_frictions_status on frictions(status);
create index idx_frictions_submitter on frictions(submitted_by);
create unique index idx_frictions_unique on frictions(domain_id, lower(btrim(text)));

create index idx_problems_profile on problems(profile_id);
create index idx_problems_created on problems(created_at desc);
create index idx_progress_problem on progress_entries(problem_id, created_at desc);
create index idx_problems_friction on problems(friction_id);

-- Public profile pages' follow graph. Counts are meant to be visible to
-- everyone, which is why the read policy below is unrestricted.
create table follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index idx_follows_following on follows(following_id);

-- Row Level Security. The app server talks to Postgres with the service-role
-- key and bypasses RLS entirely (it is the trusted gatekeeper - every API
-- route re-checks the session itself, mirroring how the SQLite version
-- worked). RLS here is defense in depth: if the anon/public key ever reaches
-- Postgres directly - a debugging session, a future client-side query - these
-- policies are what stop it from reading or writing anyone else's data.
alter table profiles enable row level security;
alter table problems enable row level security;
alter table progress_entries enable row level security;
alter table frictions enable row level security;
alter table follows enable row level security;

create policy "profiles are privately owned"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "problems are privately owned"
  on problems for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- The club feed is intentionally public: everyone should be able to see what
-- the club is building without signing in. This grants read-only access to
-- problems (and the handle they belong to) alongside the owner-only policy
-- above - Postgres RLS is permissive, so a row is visible if ANY policy
-- allows it.
create policy "problems are publicly readable"
  on problems for select
  using (true);

create policy "handles are publicly readable"
  on profiles for select
  using (true);

-- Progress entries inherit ownership from the problem they belong to, and are
-- publicly readable for the same reason the feed is.
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

create policy "progress entries are publicly readable"
  on progress_entries for select
  using (true);

-- The accepted catalogue is public - it is what the generator draws from.
-- Members submit as pending and cannot self-approve; review happens
-- server-side behind an is_admin check.
create policy "accepted frictions are publicly readable"
  on frictions for select
  using (status = 'accepted');

create policy "submitters can read their own"
  on frictions for select
  using (auth.uid() = submitted_by);

create policy "members submit as pending"
  on frictions for insert
  with check (auth.uid() = submitted_by and status = 'pending');

-- Counts are public (that's the point of them), but only the follower
-- themselves can create or remove their own follow row.
create policy "follows are publicly readable"
  on follows for select
  using (true);

create policy "people manage their own follows"
  on follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- A fresh project should now run supabase/migrations/002b_seed_frictions.sql
-- to load the 144 starting frictions into the table above.
