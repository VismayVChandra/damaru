-- Wave 3: pairing.
--
-- Run once, in the Supabase SQL Editor, on a project that already has the
-- earlier migrations. A brand-new project gets this from schema.sql.
--
-- One column. Being listed as a potential collaborator should be something a
-- person can switch off, so it defaults on but is theirs to control - the
-- profile page exposes it directly.

alter table profiles
  add column if not exists discoverable boolean not null default true;
