\set ON_ERROR_STOP on
create schema t; grant usage on schema t to authenticated, anon, service_role;
create function t.fails(q text, expect text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm ilike '%' || expect || '%' then raise notice 'ok: %', expect; return; end if;
    raise exception 'wrong error for [%]: %', q, sqlerrm;
  end;
  raise exception 'should have failed: %', q;
end $$;
create function t.eq(a anyelement, b anyelement, label text) returns void language plpgsql as $$
begin if a is distinct from b then raise exception '%: got % want %', label, a, b; end if; raise notice 'ok: %', label; end $$;
grant execute on all functions in schema t to authenticated, anon, service_role;

insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', '{"user_name":"mentor"}'),
 ('00000000-0000-0000-0000-00000000000b', '{"user_name":"ada"}'),
 ('00000000-0000-0000-0000-00000000000c', '{"user_name":"bola"}'),
 ('00000000-0000-0000-0000-00000000000d', '{"user_name":"outsider"}');
\i supabase/seed.sql
select student_code sc, mentor_code mc, cohort_id cid from public.cohort_invites \gset
select set_config('t.sc', :'sc', false), set_config('t.mc', :'mc', false), set_config('t.cid', :'cid', false);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.join_cohort(:'mc');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.join_cohort(:'sc');
select t.fails($$select public.join_cohort('nope')$$, 'not valid');
select t.eq((select count(*) from public.cohorts), 0::bigint, 'waiting student sees no cohort');
select t.eq((select status from public.my_cohorts()), 'pending', 'student waits for approval');
select t.fails(format($$select public.propose_project(%L, 'Chain vault', 'A savings vault that locks funds until a date.', 'deposit and withdraw')$$, :'cid'), 'Only students');
select t.fails(format($$select public.decide_join(%L, auth.uid(), true)$$, :'cid'), 'Not allowed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.decide_join(:'cid', '00000000-0000-0000-0000-00000000000b', true);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.eq((select count(*) from public.cohort_invites), 0::bigint, 'student cannot read invite codes');
select t.fails($$update public.memberships set role = 'mentor'$$, 'permission denied');
select t.fails(format($$select public.update_cohort(%L, null, 20, '', 'grades')$$, :'cid'), 'Not allowed');
select id pid from public.propose_project(:'cid', 'Chain vault', 'A savings vault that locks funds until a date.', 'deposit, withdraw after date') \gset
select set_config('t.pid', :'pid', false);
select t.fails(format($$select public.submit_project(%L, 'https://github.com/a/b', null)$$, :'pid'), 'not approved');
select t.fails(format($$select public.decide_project(%L, 1, true, '[{"name":"x","description":"","points":100}]', null)$$, :'pid'), 'Not allowed');
select t.fails($$select public.claim_review(gen_random_uuid())$$, 'permission denied');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.join_cohort(:'sc');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.decide_join(:'cid', '00000000-0000-0000-0000-00000000000c', true);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.eq((select count(*) from public.projects), 0::bigint, 'classmate cannot see project');
select t.eq((select count(*) from public.profiles), 1::bigint, 'student sees only own profile');
select t.fails(format($$select public.submit_project(%L, 'https://github.com/a/b', null)$$, :'pid'), 'Not allowed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.eq((select count(*) from public.cohorts), 0::bigint, 'outsider sees no cohort');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.eq((select count(*) from public.profiles), 3::bigint, 'mentor sees cohort profiles');
select t.fails(format($$select public.decide_project(%L, 1, true, '[{"name":"x","description":"","points":90}]', null)$$, :'pid'), 'add up to 100');
select t.fails(format($$select public.decide_project(%L, 1, true, '[{"name":"x","description":"","points":50},{"name":"x","description":"","points":50}]', null)$$, :'pid'), 'add up to 100');
select t.fails(format($$select public.decide_project(%L, 2, true, '[]', null)$$, :'pid'), 'edited');
select public.decide_project(:'pid', 1, true, '[{"name":"Works","description":"d","points":60},{"name":"Tests","description":"d","points":40}]', '');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.fails(format($$select public.propose_project(%L, 'New title', 'A different summary for this project.', 'other features')$$, :'cid'), 'already approved');
select t.fails(format($$select public.submit_project(%L, 'https://evil.com/a/b', null)$$, :'pid'), 'GitHub');
select t.fails(format($$select public.submit_project(%L, 'https://github.com/a/b', 'javascript:alert(1)')$$, :'pid'), 'http');
select public.submit_project(:'pid', 'https://github.com/a/b', 'https://example.com') s1 \gset
select set_config('t.s1', :'s1', false);
select t.fails(format($$select public.submit_project(%L, 'https://github.com/a/b', null)$$, :'pid'), 'still waiting');
select t.fails(format($$insert into public.grades values (%L, 100, '[]', 'x', null, now())$$, :'s1'), 'permission denied');

reset role; set role service_role;
select t.eq(public.claim_review(:'s1'), true, 'first claim wins');
select t.eq(public.claim_review(:'s1'), false, 'second claim loses');
insert into public.reviews (submission_id, draft) values (:'s1', '{}');
update public.submissions set status = 'ready' where id = :'s1';

reset role; set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.eq((select count(*) from public.reviews), 0::bigint, 'student cannot see AI draft');
select t.fails(format($$select public.approve_grade(%L, '[]', 'x', false, false)$$, :'s1'), 'Not allowed');
select t.fails(format($$select public.void_submission(%L, 'x')$$, :'s1'), 'Not allowed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.eq((select count(*) from public.reviews), 1::bigint, 'mentor sees draft');
select t.fails(format($$select public.approve_grade(%L, '[{"name":"Works","score":61},{"name":"Tests","score":1}]', 'ok', false, false)$$, :'s1'), 'within');
select t.fails(format($$select public.approve_grade(%L, '[{"name":"Works","score":1},{"name":"Works","score":1}]', 'ok', false, false)$$, :'s1'), 'within');
select public.approve_grade(:'s1', '[{"name":"Works","score":50},{"name":"Tests","score":30}]', 'Good work', true, true);
select t.eq((select total from public.grades), 80, 'total computed by database');
select t.fails(format($$select public.approve_grade(%L, '[]', 'x', false, false)$$, :'s1'), 'cannot be graded');
select t.fails(format($$select public.void_submission(%L, 'x')$$, :'s1'), 'already closed');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.eq((select count(*) from public.grades), 1::bigint, 'student sees approved grade');
select public.submit_project(:'pid', 'https://gist.github.com/ada/abc123', null) s2 \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.void_submission(:'s2', 'Wrong link');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.submit_project(:'pid', 'https://github.com/a/b', null) s3 \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.void_submission(:'s3', 'x');
select public.update_cohort(:'cid', now() - interval '1 minute', 3, 't', 'private');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.fails(format($$select public.submit_project(%L, 'https://github.com/a/b', null)$$, :'pid'), 'deadline');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.update_cohort(:'cid', null, 1, 't', 'private');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.fails(format($$select public.submit_project(%L, 'https://github.com/a/b', null)$$, :'pid'), 'all your attempts');


-- Cohort world visibility
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.eq((select count(*) from public.cohort_world(:'cid')), 1::bigint, 'private world holds only own plot');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.update_cohort(:'cid', null, 9, 't', 'projects');
select t.eq((select count(*) from public.cohort_world(:'cid')), 2::bigint, 'mentor world has every active student');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.eq((select title from public.cohort_world(:'cid') where not mine), 'Chain vault', 'projects visible when allowed');
select t.eq((select total from public.cohort_world(:'cid') where not mine), null::int, 'grades still hidden');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.update_cohort(:'cid', null, 9, 't', 'grades');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.eq((select total from public.cohort_world(:'cid') where not mine), 80, 'grades visible when allowed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.fails(format($$select * from public.cohort_world(%L)$$, :'cid'), 'Not allowed');

-- Badges flags, character
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.eq((select readme_ok and live_ok from public.grades), true, 'mentor ticks are stored');
select public.set_avatar('coral', 'crown');
select t.eq((select avatar ->> 'topper' from public.profiles where id = auth.uid()), 'crown', 'avatar saved');
select t.fails($$select public.set_avatar('red', 'crown')$$, 'from the list');
select t.fails(format($$select public.next_attempt(%L, null)$$, :'pid'), 'permission denied');

-- Zip uploads
select :'cid' || '/' || auth.uid() || '/11111111-1111-4111-8111-111111111111.zip' zp \gset
select set_config('t.zp', :'zp', false);
select t.fails(format($$select public.submit_zip(%L, %L, null)$$, :'pid', :'zp'), 'Upload your zip');
insert into storage.objects values ('submissions', :'zp');
select t.fails(format($$insert into storage.objects values ('submissions', %L)$$, :'cid' || '/00000000-0000-0000-0000-00000000000c/22222222-2222-4222-8222-222222222222.zip'), 'row-level security');
update storage.objects set name = 'x';
select t.eq((select count(*) from storage.objects where name = :'zp'), 1::bigint, 'uploads cannot be changed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.eq((select count(*) from storage.objects), 0::bigint, 'classmate cannot read zip');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.submit_zip(:'pid', :'zp', null) zs \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.eq((select count(*) from storage.objects), 1::bigint, 'mentor can read zip');
select public.void_submission(:'zs', 'x');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.fails(format($$select public.submit_zip(%L, %L, null)$$, :'pid', :'zp'), 'already used');

-- Email list
reset role;
update auth.users set email = 'Dee@Example.com', email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000000d';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select public.join_cohort(:'sc');
select t.eq((select status from public.my_cohorts()), 'pending', 'unlisted student waits');
select t.eq((select count(*) from public.cohort_allowed_emails), 0::bigint, 'waiting student cannot read list');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.fails(format($$select public.set_allowed_emails(%L, array['bad'])$$, :'cid'), 'not an email');
select t.eq(public.set_allowed_emails(:'cid', array[' dee@example.com ', 'DEE@example.com', '']), 1, 'list is cleaned');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.eq((select status from public.my_cohorts()), 'active', 'listed student is let in');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.fails(format($$select public.decide_join(%L, '00000000-0000-0000-0000-00000000000d', false)$$, :'cid'), 'already been handled');

-- Removing a student
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.fails(format($$select public.remove_student(%L, '00000000-0000-0000-0000-00000000000d')$$, :'cid'), 'Not allowed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.fails(format($$select public.remove_student(%L, auth.uid())$$, :'cid'), 'no longer in this cohort');
select public.remove_student(:'cid', '00000000-0000-0000-0000-00000000000d');
select t.eq((select count(*) from public.cohort_allowed_emails), 0::bigint, 'removed student leaves the email list');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.eq((select count(*) from public.cohorts), 0::bigint, 'removed student sees nothing');
select public.join_cohort(:'sc');
select t.eq((select status from public.my_cohorts()), 'pending', 'removed student must be approved again');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.remove_student(:'cid', '00000000-0000-0000-0000-00000000000b');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.eq((select count(*) from public.projects) + (select count(*) from public.grades) + (select count(*) from storage.objects), 0::bigint, 'removed student loses access to their work');
select t.fails(format($$select public.submit_project(%L, 'https://github.com/a/b', null)$$, :'pid'), 'Not allowed');

reset role; set role anon; set request.jwt.claim.sub = '';
select t.fails($$select * from public.projects$$, 'permission denied');
select t.fails($$select public.join_cohort('x')$$, 'permission denied');
\echo ALL RULE TESTS PASSED
