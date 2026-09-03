-- Wave 2: the friction catalogue moves into the database.
--
-- Run this BEFORE 002b_seed_frictions.sql, which loads the 144 frictions that
-- previously lived in src/lib/catalog/domains.ts.
--
-- Domains, mechanics, artifacts and twists stay in code - they are structural
-- and change rarely. Only frictions move, because those are the ones club
-- members will write, and the point is that an accepted friction goes live
-- without a deploy.

alter table profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists frictions (
  id           uuid primary key default gen_random_uuid(),
  domain_id    text not null,
  actor        text not null,
  text         text not null,
  mechanics    text[] not null,
  status       text not null default 'pending',
  -- null for the frictions seeded from the original catalogue.
  submitted_by uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,

  constraint friction_status_valid check (status in ('pending', 'accepted', 'rejected')),
  constraint friction_actor_len    check (char_length(btrim(actor)) between 3 and 120),
  constraint friction_text_len     check (char_length(btrim(text)) between 20 and 400),
  constraint friction_mechanics    check (array_length(mechanics, 1) between 1 and 8)
);

create index if not exists idx_frictions_status on frictions(status);
create index if not exists idx_frictions_submitter on frictions(submitted_by);

-- Stops the same friction being submitted twice into one domain, and makes the
-- seed file safe to re-run.
create unique index if not exists idx_frictions_unique
  on frictions(domain_id, lower(btrim(text)));

alter table frictions enable row level security;

-- The accepted catalogue is public: it is what the generator draws from, and
-- there is nothing secret in it.
create policy "accepted frictions are publicly readable"
  on frictions for select
  using (status = 'accepted');

-- You can always see what you submitted, whatever state it is in.
create policy "submitters can read their own"
  on frictions for select
  using (auth.uid() = submitted_by);

-- Members submit; they cannot self-approve. Review happens server-side behind
-- an is_admin check (the app uses the service-role key, which bypasses RLS -
-- this policy is the defense-in-depth copy of that rule).
create policy "members submit as pending"
  on frictions for insert
  with check (auth.uid() = submitted_by and status = 'pending');
