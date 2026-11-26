-- Telling AI and testing accounts apart from real members.
--
-- An AI account (the "Akash" run, which built a whole project through the app
-- to see whether the briefs are worth solving) is real activity and worth
-- keeping on the record. But mixed into the club's numbers it made the funnel
-- unreadable: build logs went from none to four, all written by the AI, and
-- the first sign of life the club ever showed was not the club.
--
-- So this is a flag, not a deletion. The admin funnel reports members and
-- these accounts as two separate populations with the same definitions, side
-- by side. Nothing is hidden and nothing is removed.
--
-- Set by hand, like is_admin: it is never writable through the app.
alter table profiles
  add column if not exists is_test boolean not null default false;

-- The one account that exists today.
update profiles set is_test = true where handle = 'akash';
