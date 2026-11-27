-- Run once in the Supabase SQL editor after the migration. Change the three names first.
with org as (
  insert into public.organisations (name) values ('Web3Bridge') returning id
), cohort as (
  insert into public.cohorts (organisation_id, name, track, criteria_template)
  select id, 'Cohort 1', 'Smart contract engineering',
    'Promised features work. Code quality and structure. Tests. Security. README and setup instructions. Live deployment.'
  from org returning id
)
insert into public.cohort_invites (cohort_id) select id from cohort
returning student_code, mentor_code;
-- Share student_code with students and keep mentor_code for mentors only.
