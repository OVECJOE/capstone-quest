-- Join approval, email list, visibility, badges, characters, frozen versions and zip uploads.

alter table public.memberships add column status text not null default 'active' check (status in ('pending', 'active'));
alter table public.cohorts add column visibility text not null default 'private'
  check (visibility in ('private', 'projects', 'grades'));
alter table public.profiles add column avatar jsonb;
alter table public.grades add column readme_ok boolean not null default false,
  add column live_ok boolean not null default false;
alter table public.submissions alter column repo_url drop not null,
  add column zip_path text unique,
  add column pinned_ref text,
  add column pinned_at timestamptz,
  add constraint one_source check ((repo_url is null) <> (zip_path is null));

create table public.cohort_allowed_emails (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  email text not null check (email = lower(email)),
  primary key (cohort_id, email)
);
alter table public.cohort_allowed_emails enable row level security;
create policy allowed_emails_read on public.cohort_allowed_emails for select to authenticated
  using (public.is_mentor(cohort_id));
revoke all on public.cohort_allowed_emails from anon, authenticated;
grant select on public.cohort_allowed_emails to authenticated;
grant all on public.cohort_allowed_emails to service_role;

-- People waiting for approval can see nothing in the cohort yet.
create or replace function public.is_member(p_cohort uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'active')
$$;
create or replace function public.is_mentor(p_cohort uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
    where cohort_id = p_cohort and user_id = auth.uid() and role = 'mentor' and status = 'active')
$$;

create or replace function public.join_cohort(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_cohort uuid; v_role text; v_status text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select cohort_id, case when mentor_code = p_code then 'mentor' else 'student' end
    into v_cohort, v_role
    from public.cohort_invites where student_code = p_code or mentor_code = p_code;
  if v_cohort is null then raise exception 'That invite code is not valid'; end if;
  -- Mentor links are private. Students on the uploaded list skip the queue; others wait.
  v_status := case when v_role = 'mentor' or exists (
      select 1 from auth.users u join public.cohort_allowed_emails a on a.email = lower(u.email)
      where u.id = auth.uid() and u.email_confirmed_at is not null and a.cohort_id = v_cohort)
    then 'active' else 'pending' end;
  insert into public.memberships as m (cohort_id, user_id, role, status)
  values (v_cohort, auth.uid(), v_role, v_status)
  on conflict (cohort_id, user_id) do update
    set role = case when excluded.role = 'mentor' then 'mentor' else m.role end,
        status = case when excluded.status = 'active' then 'active' else m.status end;
  return v_cohort;
end $$;

create function public.my_cohorts()
returns table (id uuid, name text, organisation text, role text, status text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, o.name, m.role, m.status
  from public.memberships m
  join public.cohorts c on c.id = m.cohort_id
  join public.organisations o on o.id = c.organisation_id
  where m.user_id = auth.uid()
  order by m.created_at desc
$$;

create function public.decide_join(p_cohort uuid, p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_mentor(p_cohort) then raise exception 'Not allowed'; end if;
  if p_approve then
    update public.memberships set status = 'active'
    where cohort_id = p_cohort and user_id = p_user and status = 'pending';
  else
    delete from public.memberships where cohort_id = p_cohort and user_id = p_user and status = 'pending';
  end if;
  if not found then raise exception 'That request has already been handled'; end if;
end $$;

create function public.set_allowed_emails(p_cohort uuid, p_emails text[]) returns int
language plpgsql security definer set search_path = '' as $$
declare v_clean text[]; v_count int;
begin
  if not public.is_mentor(p_cohort) then raise exception 'Not allowed'; end if;
  select coalesce(array_agg(distinct lower(btrim(e))), '{}') into v_clean
    from unnest(coalesce(p_emails, '{}')) e where btrim(e) <> '';
  if cardinality(v_clean) > 2000 then raise exception 'The list can hold up to 2000 emails'; end if;
  if exists (select 1 from unnest(v_clean) e where e !~ '^[^@[:space:],;]+@[^@[:space:],;]+\.[^@[:space:],;]+$') then
    raise exception 'One of those lines is not an email address';
  end if;
  delete from public.cohort_allowed_emails where cohort_id = p_cohort;
  insert into public.cohort_allowed_emails (cohort_id, email) select p_cohort, e from unnest(v_clean) e;
  get diagnostics v_count = row_count;
  update public.memberships m set status = 'active' from auth.users u
  where m.cohort_id = p_cohort and m.status = 'pending' and u.id = m.user_id
    and u.email_confirmed_at is not null and lower(u.email) = any(v_clean);
  return v_count;
end $$;

create or replace function public.propose_project(p_cohort uuid, p_title text, p_summary text, p_features text)
returns public.projects
language plpgsql security definer set search_path = '' as $$
declare v public.projects;
begin
  if not exists (select 1 from public.memberships
      where cohort_id = p_cohort and user_id = auth.uid() and role = 'student' and status = 'active') then
    raise exception 'Only students of this cohort can propose a project';
  end if;
  select * into v from public.projects where cohort_id = p_cohort and student_id = auth.uid() for update;
  if v.id is null then
    insert into public.projects (cohort_id, student_id, title, summary, features)
    values (p_cohort, auth.uid(), btrim(p_title), btrim(p_summary), btrim(p_features))
    returning * into v;
  else
    if v.status = 'approved' then raise exception 'This project is already approved'; end if;
    if v.version >= 10 then raise exception 'Proposal edit limit reached. Ask your mentor for help'; end if;
    update public.projects set title = btrim(p_title), summary = btrim(p_summary),
      features = btrim(p_features), status = 'proposed', criteria = null,
      version = version + 1, updated_at = now()
    where id = v.id returning * into v;
  end if;
  return v;
end $$;

drop function public.update_cohort(uuid, timestamptz, int, text);
create function public.update_cohort(p_cohort uuid, p_deadline timestamptz, p_max_attempts int, p_template text, p_visibility text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_mentor(p_cohort) then raise exception 'Not allowed'; end if;
  update public.cohorts set deadline = p_deadline, max_attempts = p_max_attempts,
    criteria_template = left(coalesce(p_template, ''), 4000), visibility = p_visibility where id = p_cohort;
end $$;

create function public.set_avatar(p_body text, p_topper text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_body is null or p_body not in ('lime', 'mint', 'sun', 'coral', 'sky', 'plum')
     or p_topper is null or p_topper not in ('sprout', 'antenna', 'cap', 'crown') then
    raise exception 'Pick a colour and a topper from the list';
  end if;
  update public.profiles set avatar = jsonb_build_object('body', p_body, 'topper', p_topper) where id = auth.uid();
end $$;

-- Checks that an attempt may be made, and returns its number. Callers hold no rights to run this directly.
create function public.next_attempt(p_project uuid, p_live_url text) returns int
language plpgsql security definer set search_path = '' as $$
declare v public.projects; c public.cohorts; v_used int; v_next int;
begin
  select * into v from public.projects where id = p_project for update;
  if v.id is null or v.student_id is distinct from auth.uid() or not public.is_member(v.cohort_id) then
    raise exception 'Not allowed';
  end if;
  if v.status <> 'approved' then raise exception 'Your mentor has not approved this project yet'; end if;
  select * into c from public.cohorts where id = v.cohort_id;
  if c.deadline is not null and now() > c.deadline then raise exception 'The deadline has passed'; end if;
  if p_live_url is not null and (p_live_url !~ '^https?://[^[:space:]]+$' or char_length(p_live_url) > 500) then
    raise exception 'The live link must start with http:// or https://';
  end if;
  if exists (select 1 from public.submissions
      where project_id = v.id and status in ('queued', 'reviewing', 'ready', 'failed')) then
    raise exception 'Your last attempt is still waiting for review';
  end if;
  select count(*) filter (where status <> 'void'), coalesce(max(attempt), 0) + 1
    into v_used, v_next from public.submissions where project_id = v.id;
  if v_used >= c.max_attempts then raise exception 'You have used all your attempts'; end if;
  if v_next > c.max_attempts + 10 then raise exception 'Too many submissions. Ask your mentor for help'; end if;
  return v_next;
end $$;

create or replace function public.submit_project(p_project uuid, p_repo_url text, p_live_url text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_next int; v_id uuid;
  v_repo text := btrim(coalesce(p_repo_url, '')); v_live text := nullif(btrim(coalesce(p_live_url, '')), '');
begin
  v_next := public.next_attempt(p_project, v_live);
  if v_repo !~ '^https://(github\.com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+/?|gist\.github\.com/([A-Za-z0-9-]+/)?[A-Fa-f0-9]+/?)$'
     or char_length(v_repo) > 300 then
    raise exception 'Use a GitHub repository or gist link';
  end if;
  insert into public.submissions (project_id, attempt, repo_url, live_url)
  values (p_project, v_next, v_repo, v_live) returning id into v_id;
  return v_id;
end $$;

create function public.submit_zip(p_project uuid, p_path text, p_live_url text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_next int; v_id uuid; v_cohort uuid; v_live text := nullif(btrim(coalesce(p_live_url, '')), '');
begin
  v_next := public.next_attempt(p_project, v_live);
  select cohort_id into v_cohort from public.projects where id = p_project;
  if p_path is null or p_path !~ ('^' || v_cohort || '/' || auth.uid() || '/[0-9a-f-]{36}\.zip$')
     or not exists (select 1 from storage.objects where bucket_id = 'submissions' and name = p_path) then
    raise exception 'Upload your zip file again';
  end if;
  if exists (select 1 from public.submissions where zip_path = p_path) then
    raise exception 'That upload was already used. Choose the file again';
  end if;
  insert into public.submissions (project_id, attempt, zip_path, live_url)
  values (p_project, v_next, p_path, v_live) returning id into v_id;
  return v_id;
end $$;

drop function public.approve_grade(uuid, jsonb, text);
create function public.approve_grade(p_submission uuid, p_scores jsonb, p_feedback text, p_readme_ok boolean, p_live_ok boolean)
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
  insert into public.grades (submission_id, total, scores, feedback, approved_by, readme_ok, live_ok)
  values (s.id, v_total, p_scores, btrim(p_feedback), auth.uid(),
    coalesce(p_readme_ok, false), coalesce(p_live_ok, false) and s.live_url is not null);
  update public.submissions set status = 'graded', message = null where id = s.id;
end $$;

-- The cohort world. What a student learns about classmates depends on the mentor's setting.
create function public.cohort_world(p_cohort uuid)
returns table (mine boolean, name text, avatar jsonb, title text, stage text, repo_url text, live_url text, total int)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_mentor boolean := public.is_mentor(p_cohort); v_visibility text;
begin
  if not public.is_member(p_cohort) then raise exception 'Not allowed'; end if;
  select c.visibility into v_visibility from public.cohorts c where c.id = p_cohort;
  return query
  select
    w.mine,
    case when w.open then w.full_name end,
    case when w.open then w.avatar end,
    case when w.open and (w.mine or v_mentor or w.status = 'approved') then w.title end,
    w.stage,
    case when w.open and (w.mine or v_mentor or w.status = 'approved') then w.repo_url end,
    case when w.open and (w.mine or v_mentor or w.status = 'approved') then w.live_url end,
    case when w.mine or v_mentor or v_visibility = 'grades' then w.total end
  from (
    select m.user_id = auth.uid() as mine,
      (m.user_id = auth.uid() or v_mentor or v_visibility <> 'private') as open,
      coalesce(pr.full_name, pr.github_login) as full_name, pr.avatar, p.title, p.status,
      case
        when p.status is distinct from 'approved' then 'idea'
        when last.status is null then 'build'
        when last.status = 'graded' then 'grade'
        else 'review'
      end as stage,
      last.repo_url, last.live_url,
      (select g.total from public.grades g join public.submissions s on s.id = g.submission_id
        where s.project_id = p.id order by s.attempt desc limit 1) as total,
      m.created_at
    from public.memberships m
    join public.profiles pr on pr.id = m.user_id
    left join public.projects p on p.cohort_id = m.cohort_id and p.student_id = m.user_id
    left join lateral (select s.status, s.repo_url, s.live_url from public.submissions s
      where s.project_id = p.id and s.status <> 'void' order by s.attempt desc limit 1) last on true
    where m.cohort_id = p_cohort and m.role = 'student' and m.status = 'active'
  ) w
  -- Anonymous plots are shuffled so their order does not give names away.
  order by w.mine desc, case when w.open then w.created_at end, random();
end $$;

-- Zip uploads live in a private bucket. Files can be added but never changed, so a submission stays frozen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 20971520, array['application/zip']);

create function public.can_upload_zip(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.zip$'
    and split_part(p_name, '/', 2) = auth.uid()::text
    and exists (select 1 from public.memberships m where m.cohort_id::text = split_part(p_name, '/', 1)
      and m.user_id = auth.uid() and m.role = 'student' and m.status = 'active')
    and (select count(*) from storage.objects o where o.bucket_id = 'submissions'
      and o.name like split_part(p_name, '/', 1) || '/' || auth.uid()::text || '/%') < 30
$$;
create function public.can_read_zip(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.cohort_id::text = split_part(p_name, '/', 1)
    and m.user_id = auth.uid() and m.status = 'active'
    and (m.role = 'mentor' or split_part(p_name, '/', 2) = auth.uid()::text))
$$;
create policy submissions_zip_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and public.can_upload_zip(name));
create policy submissions_zip_read on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and public.can_read_zip(name));

revoke execute on function
  public.my_cohorts(), public.decide_join(uuid, uuid, boolean), public.set_allowed_emails(uuid, text[]),
  public.update_cohort(uuid, timestamptz, int, text, text), public.set_avatar(text, text),
  public.next_attempt(uuid, text), public.submit_zip(uuid, text, text),
  public.approve_grade(uuid, jsonb, text, boolean, boolean), public.cohort_world(uuid),
  public.can_upload_zip(text), public.can_read_zip(text)
  from public, anon, authenticated;
grant execute on function
  public.my_cohorts(), public.decide_join(uuid, uuid, boolean), public.set_allowed_emails(uuid, text[]),
  public.update_cohort(uuid, timestamptz, int, text, text), public.set_avatar(text, text),
  public.submit_zip(uuid, text, text), public.approve_grade(uuid, jsonb, text, boolean, boolean),
  public.cohort_world(uuid), public.can_upload_zip(text), public.can_read_zip(text)
  to authenticated;
