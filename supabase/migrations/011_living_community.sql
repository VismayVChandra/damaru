-- Making the club feel alive: when a project actually moved, who wrote a
-- build-log line, and telling someone their work was forked.

-- --- When a project actually moved -----------------------------------------
-- One nullable column rather than an event table: a "what's happening now"
-- feed needs the latest transition per project, never the full history.
--
-- Deliberately NOT a synthesised progress_entries row either - that table is a
-- human-authored artifact ("a line of what moved", written by a person), and
-- fabricating rows into it would corrupt it and inflate the build-note counts
-- shown on profiles.
--
-- No backfill, on purpose. Setting this to created_at would assert that a
-- transition happened at creation, which is false, and would spray fake
-- "moved to X" events across the feed on day one. Null means "we don't know";
-- the feed emits nothing for those and reality accumulates from here.
alter table problems
  add column if not exists status_changed_at timestamptz;

create index if not exists idx_problems_status_changed
  on problems(status_changed_at desc) where status_changed_at is not null;

-- --- Who wrote a build-log line ---------------------------------------------
-- 009 widened these writes from the owner to anyone on the team, but never
-- recorded which of them it was, so "who did what" was unanswerable. Nullable
-- and `on delete set null`: rows written before this column fall back to the
-- project's owner, and an entry outlives its author leaving.
alter table progress_entries
  add column if not exists profile_id uuid references profiles(id) on delete set null;

create index if not exists idx_progress_profile on progress_entries(profile_id);

-- --- Fork notifications ------------------------------------------------------
alter table notifications drop constraint if exists notif_type_valid;
alter table notifications
  add constraint notif_type_valid
  check (type in ('follow', 'like', 'comment', 'collab_request', 'collab_accepted', 'fork'));

-- --- Activity-feed scan hygiene ----------------------------------------------
-- The existing indexes on these tables are all (problem_id, created_at)
-- composites; the club-wide feed scans the time column on its own.
create index if not exists idx_progress_created on progress_entries(created_at desc);
create index if not exists idx_members_joined on project_members(joined_at desc);
create index if not exists idx_roles_created on project_roles(created_at desc);
