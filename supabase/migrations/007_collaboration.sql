-- Collaboration requests: the two mechanics from the "social media" wave -
-- (1) flag a problem you're building as open to collaborators, discoverable
-- by anyone; (2) a general request to work with someone, found by browsing
-- the club for a skill category rather than a specific problem. Both share
-- one table - a request is either tied to a problem or it isn't.

alter table problems
  add column if not exists looking_for_collaborators boolean not null default false;

create table if not exists collab_requests (
  id              uuid primary key default gen_random_uuid(),
  -- Null for a general "let's work together" request not tied to any problem.
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

create index if not exists idx_collab_to on collab_requests(to_profile_id, status);
create index if not exists idx_collab_from on collab_requests(from_profile_id);
create index if not exists idx_collab_problem on collab_requests(problem_id);
create index if not exists idx_problems_looking on problems(looking_for_collaborators) where looking_for_collaborators;

alter table collab_requests enable row level security;

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
