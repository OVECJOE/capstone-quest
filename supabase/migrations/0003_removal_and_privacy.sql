-- Mentors can remove students, and private cohorts show a student only their own plot.

-- The cohort world. What a student learns about classmates depends on the mentor's setting.
create or replace function public.cohort_world(p_cohort uuid)
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
    w.full_name,
    w.avatar,
    case when (w.mine or v_mentor or w.status = 'approved') then w.title end,
    w.stage,
    case when (w.mine or v_mentor or w.status = 'approved') then w.repo_url end,
    case when (w.mine or v_mentor or w.status = 'approved') then w.live_url end,
    case when w.mine or v_mentor or v_visibility = 'grades' then w.total end
  from (
    select m.user_id = auth.uid() as mine,
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
      -- In a private cohort a student's world holds their own plot and nothing else.
      and (v_mentor or v_visibility <> 'private' or m.user_id = auth.uid())
  ) w
  order by w.mine desc, w.created_at;
end $$;

create function public.remove_student(p_cohort uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_mentor(p_cohort) then raise exception 'Not allowed'; end if;
  delete from public.memberships
    where cohort_id = p_cohort and user_id = p_user and role = 'student' and status = 'active';
  if not found then raise exception 'That student is no longer in this cohort'; end if;
  -- Without this, the invite link would let a listed student straight back in.
  delete from public.cohort_allowed_emails a using auth.users u
    where a.cohort_id = p_cohort and u.id = p_user and a.email = lower(u.email);
end $$;

revoke execute on function public.remove_student(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_student(uuid, uuid) to authenticated;
