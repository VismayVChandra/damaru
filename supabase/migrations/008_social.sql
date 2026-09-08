-- Social loop wave: likes + comments on problems (the "post" equivalent),
-- and a notifications table so the activity actually reaches people instead
-- of only ever being visible if they happen to revisit a page.

create table if not exists problem_likes (
  problem_id uuid not null references problems(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (problem_id, profile_id)
);

create index if not exists idx_likes_problem on problem_likes(problem_id);
create index if not exists idx_likes_profile on problem_likes(profile_id);

create table if not exists problem_comments (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint comment_len check (char_length(btrim(body)) between 1 and 500)
);

create index if not exists idx_comments_problem on problem_comments(problem_id, created_at);

-- One row per bit of activity aimed at a specific person. `actor_profile_id`
-- is who did it (null for none), `problem_id`/`collab_request_id` are the
-- thing it's about, whichever applies. Kept as one table rather than one per
-- type since a notification is always "read or not, newest first" regardless
-- of what triggered it.
create table if not exists notifications (
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

create index if not exists idx_notif_profile on notifications(profile_id, created_at desc);
create index if not exists idx_notif_unread on notifications(profile_id) where not read;

alter table problem_likes enable row level security;
alter table problem_comments enable row level security;
alter table notifications enable row level security;

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
