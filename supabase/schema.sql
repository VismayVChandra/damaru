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
  -- Whether this problem is flagged as open for someone else to join.
  looking_for_collaborators boolean not null default false,
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

-- Collaboration requests: the two mechanics from the "social media" wave -
-- (1) flag a problem you're building as open to collaborators, discoverable
-- by anyone; (2) a general request to work with someone, found by browsing
-- the club for a skill category rather than a specific problem. Both share
-- one table - a request is either tied to a problem or it isn't.
create table collab_requests (
  id              uuid primary key default gen_random_uuid(),
  problem_id      uuid references problems(id) on delete cascade,
  from_profile_id uuid not null references profiles(id) on delete cascade,
  to_profile_id   uuid not null references profiles(id) on delete cascade,
  message         text not null default '',
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,

  constraint collab_status_valid check (status in ('pending', 'accepted', 'declined')),
  constraint collab_message_len check (char_length(message) <= 300),
  constraint collab_no_self check (from_profile_id <> to_profile_id)
);

create index idx_collab_to on collab_requests(to_profile_id, status);
create index idx_collab_from on collab_requests(from_profile_id);
create index idx_collab_problem on collab_requests(problem_id);
create index idx_problems_looking on problems(looking_for_collaborators) where looking_for_collaborators;

-- Likes + comments treat a problem like a post - the engagement loop that
-- makes the feed worth returning to, not just a directory.
create table problem_likes (
  problem_id uuid not null references problems(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (problem_id, profile_id)
);

create index idx_likes_problem on problem_likes(problem_id);
create index idx_likes_profile on problem_likes(profile_id);

create table problem_comments (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint comment_len check (char_length(btrim(body)) between 1 and 500)
);

create index idx_comments_problem on problem_comments(problem_id, created_at);

-- One row per bit of activity aimed at a specific person - a follow, a like,
-- a comment, a collab request or its acceptance. One table rather than one
-- per type, since every kind is "read or not, newest first" the same way.
create table notifications (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references profiles(id) on delete cascade,
  type               text not null,
  actor_profile_id   uuid references profiles(id) on delete cascade,
  problem_id         uuid references problems(id) on delete cascade,
  collab_request_id  uuid references collab_requests(id) on delete cascade,
  read               boolean not null default false,
  created_at         timestamptz not null default now(),

  constraint notif_type_valid check (type in ('follow', 'like', 'comment', 'collab_request', 'collab_accepted'))
);

create index idx_notif_profile on notifications(profile_id, created_at desc);
create index idx_notif_unread on notifications(profile_id) where not read;

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
alter table collab_requests enable row level security;
alter table problem_likes enable row level security;
alter table problem_comments enable row level security;
alter table notifications enable row level security;

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

-- Only the two people involved ever see a request - unlike follows or
-- feedback, this isn't meant to be public.
create policy "collab requests are readable by sender or recipient"
  on collab_requests for select
  using (auth.uid() = from_profile_id or auth.uid() = to_profile_id);

create policy "people send their own collab requests"
  on collab_requests for insert
  with check (auth.uid() = from_profile_id);

create policy "recipients respond to their own collab requests"
  on collab_requests for update
  using (auth.uid() = to_profile_id)
  with check (auth.uid() = to_profile_id);

create policy "likes are publicly readable"
  on problem_likes for select
  using (true);

create policy "people manage their own likes"
  on problem_likes for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "comments are publicly readable"
  on problem_comments for select
  using (true);

create policy "people write their own comments"
  on problem_comments for insert
  with check (auth.uid() = profile_id);

create policy "people delete their own comments"
  on problem_comments for delete
  using (auth.uid() = profile_id);

-- Unlike likes/comments/follows, notifications are never meant to be public -
-- only the recipient ever sees their own.
create policy "notifications are private to their recipient"
  on notifications for select
  using (auth.uid() = profile_id);

create policy "recipients mark their own notifications read"
  on notifications for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- A fresh project should now run supabase/migrations/002b_seed_frictions.sql
-- to load the 144 starting frictions into the table above.
