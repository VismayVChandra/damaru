-- Problems -> Projects wave: a real status ladder, teams, open roles, and a
-- typed build log. Order matters below - project_roles must exist before
-- project_members and collab_requests can reference it.

-- --- The ladder -------------------------------------------------------------
-- new -> idea -> prototype -> building -> beta -> shipped (+ passed, terminal
-- from anywhere). "new" keeps its exact meaning: freshly generated, not yet
-- committed to. "saved" becomes "idea", the first committed stage.

alter table problems drop constraint if exists status_valid;
update problems set status = 'idea' where status = 'saved';
alter table problems
  add constraint status_valid
  check (status in ('new', 'idea', 'prototype', 'building', 'beta', 'shipped', 'passed'));

create index if not exists idx_problems_status on problems(status);

-- --- Open roles ---------------------------------------------------------------

create table if not exists project_roles (
  id           uuid primary key default gen_random_uuid(),
  problem_id   uuid not null references problems(id) on delete cascade,
  role_name    text not null,
  skills       jsonb not null default '[]'::jsonb,
  count_needed int  not null default 1,
  description  text not null default '',
  commitment   text not null default '',
  duration     text not null default '',
  open         boolean not null default true,
  created_at   timestamptz not null default now(),

  constraint role_name_len       check (char_length(btrim(role_name)) between 2 and 60),
  constraint role_count_valid    check (count_needed between 1 and 20),
  constraint role_desc_len       check (char_length(description) <= 500),
  constraint role_commitment_len check (char_length(commitment) <= 60),
  constraint role_duration_len   check (char_length(duration) <= 60)
);

create index if not exists idx_roles_problem on project_roles(problem_id, created_at);

-- --- Team members ---------------------------------------------------------------
-- role_id -> on delete set null: a member's credit for a role must survive
-- the owner later deleting or renaming that role. The owner is never a row
-- here - problems.profile_id already means "owner"; the app synthesises the
-- owner as the first team entry instead of duplicating that fact.

create table if not exists project_members (
  problem_id uuid not null references problems(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role_name  text not null default '',
  role_id    uuid references project_roles(id) on delete set null,
  joined_at  timestamptz not null default now(),

  primary key (problem_id, profile_id),
  constraint member_role_len check (char_length(role_name) <= 60)
);

create index if not exists idx_members_profile on project_members(profile_id);
create index if not exists idx_members_role on project_members(role_id);

-- --- Applying to a role rides the existing request pipeline ------------------

alter table collab_requests
  add column if not exists role_id uuid references project_roles(id) on delete set null;

create index if not exists idx_collab_role on collab_requests(role_id);

-- --- Build logs: progress_entries upgraded in place, not a parallel table ----

alter table progress_entries add column if not exists kind text not null default 'progress';
alter table progress_entries add column if not exists image_url text;
alter table progress_entries add column if not exists link_url text;

do $$ begin
  alter table progress_entries add constraint progress_kind_valid
    check (kind in ('progress', 'blocked', 'looking_for_help', 'milestone', 'shipped'));
exception when duplicate_object then null; end $$;

-- Both fields render as <a href> / <img src> - an unvalidated value is
-- stored XSS, so this is enforced here and re-checked in the API route.
do $$ begin
  alter table progress_entries add constraint progress_link_url_valid
    check (link_url is null or (link_url ~ '^https?://' and char_length(link_url) <= 2000));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table progress_entries add constraint progress_image_url_valid
    check (image_url is null or (image_url ~ '^https?://' and char_length(image_url) <= 2000));
exception when duplicate_object then null; end $$;

-- --- Row Level Security -------------------------------------------------------

alter table project_roles enable row level security;
alter table project_members enable row level security;

create policy "project roles are publicly readable"
  on project_roles for select
  using (true);

create policy "project roles are managed by the project owner"
  on project_roles for all
  using (exists (select 1 from problems p
                 where p.id = project_roles.problem_id and p.profile_id = auth.uid()))
  with check (exists (select 1 from problems p
                 where p.id = project_roles.problem_id and p.profile_id = auth.uid()));

create policy "team membership is publicly readable"
  on project_members for select
  using (true);

create policy "the project owner manages its team"
  on project_members for all
  using (exists (select 1 from problems p
                 where p.id = project_members.problem_id and p.profile_id = auth.uid()))
  with check (exists (select 1 from problems p
                 where p.id = project_members.problem_id and p.profile_id = auth.uid()));

create policy "members can remove themselves"
  on project_members for delete
  using (auth.uid() = profile_id);

-- Teams are the whole point: widen who can write a build log from
-- owner-only to owner-or-team-member.
drop policy if exists "progress entries are owned via their problem" on progress_entries;

create policy "progress entries are written by the project's team"
  on progress_entries for all
  using (
    exists (select 1 from problems p
            where p.id = progress_entries.problem_id and p.profile_id = auth.uid())
    or exists (select 1 from project_members m
               where m.problem_id = progress_entries.problem_id and m.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from problems p
            where p.id = progress_entries.problem_id and p.profile_id = auth.uid())
    or exists (select 1 from project_members m
               where m.problem_id = progress_entries.problem_id and m.profile_id = auth.uid())
  );
