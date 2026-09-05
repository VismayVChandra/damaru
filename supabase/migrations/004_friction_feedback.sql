-- Swipe triage + friction feedback.
--
-- Run once, in the Supabase SQL Editor, on a project that already has the
-- earlier migrations. A brand-new project gets this from schema.sql.
--
-- Problems never had a durable link back to the specific friction row they
-- were generated from - only the friction's text lived inside the payload.
-- That link is what lets feedback roll up per friction rather than just
-- floating per problem with nowhere to go.

alter table problems
  add column if not exists friction_id uuid references frictions(id) on delete set null;

alter table problems
  add column if not exists feedback text
    check (feedback is null or feedback in ('up', 'down'));

create index if not exists idx_problems_friction on problems(friction_id);
