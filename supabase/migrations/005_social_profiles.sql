-- Public profile pages: a short bio, plus a follow graph so profile pages
-- can show real follower/following counts from day one rather than a
-- permanent "0" with no way to change it.

alter table profiles
  add column if not exists bio text not null default '';

alter table profiles
  add constraint bio_len check (char_length(bio) <= 240);

create table if not exists follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index if not exists idx_follows_following on follows(following_id);

alter table follows enable row level security;

-- Counts are public (that's the point of them), but only the follower
-- themselves can create or remove their own follow row.
create policy "follows are publicly readable"
  on follows for select
  using (true);

create policy "people manage their own follows"
  on follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);
