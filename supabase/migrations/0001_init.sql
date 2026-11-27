-- Capstone Quest: schema, access rules and the only write paths.
-- Browsers can read what row level security allows and can write nothing directly.
-- People write through the functions below; the review engine writes with the service role.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_login text,
  full_name text,
  avatar_url text
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  track text not null,
  deadline timestamptz,
  max_attempts int not null default 3 check (max_attempts between 1 and 20),
  criteria_template text not null default '',
  created_at timestamptz not null default now()
);

create table public.cohort_invites (
  cohort_id uuid primary key references public.cohorts(id) on delete cascade,
  student_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  mentor_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  check (student_code <> mentor_code)
);

create table public.memberships (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('student', 'mentor')),
  created_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 20 and 3000),
  features text not null check (char_length(features) between 10 and 3000),
  status text not null default 'proposed' check (status in ('proposed', 'changes_requested', 'approved')),
  version int not null default 1,
  criteria jsonb,
  mentor_note text,
  updated_at timestamptz not null default now(),
  unique (cohort_id, student_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  attempt int not null,
  repo_url text not null,
  live_url text,
  status text not null default 'queued'
    check (status in ('queued', 'reviewing', 'ready', 'failed', 'void', 'graded')),
  message text,
  review_started_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, attempt)
);

-- The AI draft. Students never see it.
create table public.reviews (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  draft jsonb not null,
  created_at timestamptz not null default now()
);

-- What a mentor approved. This is what students see.
create table public.grades (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  total int not null check (total between 0 and 100),
  scores jsonb not null,
  feedback text not null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz not null default now()
);

-- Profiles are created from the GitHub sign-in.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, github_login, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'user_name',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'user_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anyone who signed in before this ran still needs a profile.
insert into public.profiles (id, github_login, full_name, avatar_url)
select id, raw_user_meta_data ->> 'user_name',
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'user_name'),
  raw_user_meta_data ->> 'avatar_url'
from auth.users on conflict (id) do nothing;

create function public.is_member(p_cohort uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
    where cohort_id = p_cohort and user_id = auth.uid())
$$;

create function public.is_mentor(p_cohort uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
    where cohort_id = p_cohort and user_id = auth.uid() and role = 'mentor')
$$;

create function public.can_see_project(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects p
    where p.id = p_project
      and ((p.student_id = auth.uid() and public.is_member(p.cohort_id)) or public.is_mentor(p.cohort_id)))
$$;

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_invites enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.submissions enable row level security;
alter table public.reviews enable row level security;
alter table public.grades enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from public.memberships m where m.user_id = profiles.id and public.is_mentor(m.cohort_id)));
create policy organisations_read on public.organisations for select to authenticated using (
  exists (select 1 from public.cohorts c where c.organisation_id = organisations.id and public.is_member(c.id)));
create policy cohorts_read on public.cohorts for select to authenticated using (public.is_member(id));
create policy invites_read on public.cohort_invites for select to authenticated using (public.is_mentor(cohort_id));
create policy memberships_read on public.memberships for select to authenticated using (
  user_id = (select auth.uid()) or public.is_mentor(cohort_id));
create policy projects_read on public.projects for select to authenticated using (public.can_see_project(id));
create policy submissions_read on public.submissions for select to authenticated using (public.can_see_project(project_id));
create policy reviews_read on public.reviews for select to authenticated using (
  exists (select 1 from public.submissions s join public.projects p on p.id = s.project_id
    where s.id = reviews.submission_id and public.is_mentor(p.cohort_id)));
create policy grades_read on public.grades for select to authenticated using (
  exists (select 1 from public.submissions s
    where s.id = grades.submission_id and public.can_see_project(s.project_id)));

-- Criteria: 1 to 12 items, each {name, description, points}, unique names, points adding to 100.
create function public.valid_criteria(c jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; total int := 0; names text[] := '{}';
begin
  if c is null or jsonb_typeof(c) <> 'array' or jsonb_array_length(c) not between 1 and 12 then
    return false;
  end if;
  for item in select * from jsonb_array_elements(c) loop
    if jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item -> 'name') is distinct from 'string'
       or jsonb_typeof(item -> 'description') is distinct from 'string'
       or jsonb_typeof(item -> 'points') is distinct from 'number'
       or btrim(item ->> 'name') = ''
       or (item ->> 'points') !~ '^[0-9]{1,3}$'
       or (item ->> 'points')::int < 1
       or (item ->> 'name') = any(names) then
      return false;
    end if;
    names := names || (item ->> 'name');
    total := total + (item ->> 'points')::int;
  end loop;
  return total = 100;
end $$;

create function public.join_cohort(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_cohort uuid; v_role text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select cohort_id, case when mentor_code = p_code then 'mentor' else 'student' end
    into v_cohort, v_role
    from public.cohort_invites where student_code = p_code or mentor_code = p_code;
  if v_cohort is null then raise exception 'That invite code is not valid'; end if;
  insert into public.memberships as m (cohort_id, user_id, role)
  values (v_cohort, auth.uid(), v_role)
  on conflict (cohort_id, user_id) do update
    set role = case when excluded.role = 'mentor' then 'mentor' else m.role end;
  return v_cohort;
end $$;

create function public.propose_project(p_cohort uuid, p_title text, p_summary text, p_features text)
returns public.projects
language plpgsql security definer set search_path = '' as $$
declare v public.projects;
begin
  if not exists (select 1 from public.memberships
      where cohort_id = p_cohort and user_id = auth.uid() and role = 'student') then
    raise exception 'Only students of this cohort can propose a project';
  end if;
  select * into v from public.projects where cohort_id = p_cohort and student_id = auth.uid() for update;
  if v.id is null then
    insert into public.projects (cohort_id, student_id, title, summary, features)
    values (p_cohort, auth.uid(), btrim(p_title), btrim(p_summary), btrim(p_features))
    returning * into v;
  else
    if v.status = 'approved' then raise exception 'This project is already approved'; end if;
    -- Every version triggers a paid AI draft, so the number of edits is capped.
    if v.version >= 10 then raise exception 'Proposal edit limit reached. Ask your mentor for help'; end if;
    update public.projects set title = btrim(p_title), summary = btrim(p_summary),
      features = btrim(p_features), status = 'proposed', criteria = null,
      version = version + 1, updated_at = now()
    where id = v.id returning * into v;
  end if;
  return v;
end $$;

create function public.decide_project(p_project uuid, p_version int, p_approve boolean, p_criteria jsonb, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v public.projects;
begin
  select * into v from public.projects where id = p_project for update;
  if v.id is null or not public.is_mentor(v.cohort_id) then raise exception 'Not allowed'; end if;
  if v.status <> 'proposed' then raise exception 'This proposal is not waiting for a decision'; end if;
  if v.version <> p_version then raise exception 'The student edited this proposal. Reload and check it again'; end if;
  if p_approve then
    if not public.valid_criteria(p_criteria) then
      raise exception 'Criteria need unique names and points that add up to 100';
    end if;
    update public.projects set status = 'approved', criteria = p_criteria,
      mentor_note = nullif(btrim(coalesce(p_note, '')), ''), updated_at = now() where id = v.id;
  else
    if btrim(coalesce(p_note, '')) = '' then raise exception 'Tell the student what to change'; end if;
    update public.projects set status = 'changes_requested', mentor_note = btrim(p_note), updated_at = now()
    where id = v.id;
  end if;
end $$;

create function public.submit_project(p_project uuid, p_repo_url text, p_live_url text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v public.projects; c public.cohorts; v_used int; v_next int; v_id uuid;
  v_repo text := btrim(coalesce(p_repo_url, '')); v_live text := nullif(btrim(coalesce(p_live_url, '')), '');
begin
  select * into v from public.projects where id = p_project for update;
  if v.id is null or v.student_id <> auth.uid() or not public.is_member(v.cohort_id) then
    raise exception 'Not allowed';
  end if;
  if v.status <> 'approved' then raise exception 'Your mentor has not approved this project yet'; end if;
  select * into c from public.cohorts where id = v.cohort_id;
  if c.deadline is not null and now() > c.deadline then raise exception 'The deadline has passed'; end if;
  if v_repo !~ '^https://(github\.com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+/?|gist\.github\.com/([A-Za-z0-9-]+/)?[A-Fa-f0-9]+/?)$'
     or char_length(v_repo) > 300 then
    raise exception 'Use a GitHub repository or gist link';
  end if;
  if v_live is not null and (v_live !~ '^https?://[^[:space:]]+$' or char_length(v_live) > 500) then
    raise exception 'The live link must start with http:// or https://';
  end if;
  if exists (select 1 from public.submissions
      where project_id = v.id and status in ('queued', 'reviewing', 'ready', 'failed')) then
    raise exception 'Your last attempt is still waiting for review';
  end if;
  select count(*) filter (where status <> 'void'), coalesce(max(attempt), 0) + 1
    into v_used, v_next from public.submissions where project_id = v.id;
  if v_used >= c.max_attempts then raise exception 'You have used all your attempts'; end if;
  -- Void attempts are free, but they still cost review time, so the total is bounded too.
  if v_next > c.max_attempts + 10 then raise exception 'Too many submissions. Ask your mentor for help'; end if;
  insert into public.submissions (project_id, attempt, repo_url, live_url)
  values (v.id, v_next, v_repo, v_live) returning id into v_id;
  return v_id;
end $$;

-- Lets one worker at a time review a submission. Service role only.
create function public.claim_review(p_submission uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.submissions set status = 'reviewing', review_started_at = now(), message = null
  where id = p_submission and (status in ('queued', 'failed', 'ready')
    or (status = 'reviewing' and review_started_at < now() - interval '6 minutes'));
  return found;
end $$;

create function public.approve_grade(p_submission uuid, p_scores jsonb, p_feedback text)
returns void
language plpgsql security definer set search_path = '' as $$
declare s public.submissions; p public.projects; item jsonb; crit jsonb; v_total int := 0; seen text[] := '{}';
begin
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'Not allowed'; end if;
  select * into p from public.projects where id = s.project_id;
  if not public.is_mentor(p.cohort_id) then raise exception 'Not allowed'; end if;
  if s.status not in ('ready', 'failed') then raise exception 'This attempt cannot be graded right now'; end if;
  if btrim(coalesce(p_feedback, '')) = '' then raise exception 'Write some feedback for the student'; end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'array'
     or jsonb_array_length(p_scores) <> jsonb_array_length(p.criteria) then
    raise exception 'Score every criterion';
  end if;
  for item in select * from jsonb_array_elements(p_scores) loop
    select x into crit from jsonb_array_elements(p.criteria) x where x ->> 'name' = item ->> 'name';
    if crit is null or (item ->> 'name') = any(seen)
       or coalesce(item ->> 'score', '') !~ '^[0-9]{1,3}$'
       or (item ->> 'score')::int > (crit ->> 'points')::int then
      raise exception 'Scores must be whole numbers within each criterion''s points';
    end if;
    seen := seen || (item ->> 'name');
    v_total := v_total + (item ->> 'score')::int;
  end loop;
  insert into public.grades (submission_id, total, scores, feedback, approved_by)
  values (s.id, v_total, p_scores, btrim(p_feedback), auth.uid());
  update public.submissions set status = 'graded', message = null where id = s.id;
end $$;

-- Hands an attempt back without a grade. It does not count against the student.
create function public.void_submission(p_submission uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.submissions; v_cohort uuid;
begin
  select * into s from public.submissions where id = p_submission for update;
  select cohort_id into v_cohort from public.projects where id = s.project_id;
  if s.id is null or not public.is_mentor(v_cohort) then raise exception 'Not allowed'; end if;
  if s.status in ('graded', 'void') then raise exception 'This attempt is already closed'; end if;
  if btrim(coalesce(p_reason, '')) = '' then raise exception 'Give the student a reason'; end if;
  update public.submissions set status = 'void', message = btrim(p_reason) where id = s.id;
end $$;

create function public.update_cohort(p_cohort uuid, p_deadline timestamptz, p_max_attempts int, p_template text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_mentor(p_cohort) then raise exception 'Not allowed'; end if;
  update public.cohorts set deadline = p_deadline, max_attempts = p_max_attempts,
    criteria_template = left(coalesce(p_template, ''), 4000) where id = p_cohort;
end $$;

-- Access: signed-in people read through the policies above and write only through functions.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_member(uuid), public.is_mentor(uuid), public.can_see_project(uuid),
  public.join_cohort(text), public.propose_project(uuid, text, text, text),
  public.decide_project(uuid, int, boolean, jsonb, text), public.submit_project(uuid, text, text),
  public.approve_grade(uuid, jsonb, text), public.void_submission(uuid, text),
  public.update_cohort(uuid, timestamptz, int, text)
  to authenticated;
grant execute on function public.claim_review(uuid) to service_role;
