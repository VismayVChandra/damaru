-- Phase 5: lineage for forked ("inspired by") projects.
--
-- `on delete set null`, not cascade: a fork is its own independent project,
-- not a row owned by its source, and must survive the source being deleted -
-- it just loses the backlink. Contrast project_roles.problem_id and
-- progress_entries.problem_id, which cascade because those rows are
-- meaningless without their parent.
alter table problems
  add column if not exists inspired_by_problem_id uuid references problems(id) on delete set null;

create index if not exists idx_problems_inspired_by on problems(inspired_by_problem_id);
