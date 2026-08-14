begin;
select plan(6);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'candidate-a@example.invalid', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'candidate-b@example.invalid', '', now(), now(), now());

insert into public.study_progress(user_id, question_id, status)
values ('20000000-0000-0000-0000-000000000002', 'javascript-01', 'learning');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select count(*) from public.profiles), 1::bigint, 'candidate sees only their own profile');
select is((select count(*) from public.study_progress), 0::bigint, 'candidate cannot see another candidate progress');
select lives_ok(
  $$insert into public.study_progress(user_id, question_id, status) values ('10000000-0000-0000-0000-000000000001', 'javascript-02', 'learning')$$,
  'candidate can append their own progress'
);
select is((with changed as (
  update public.study_progress set status = 'mastered'
  where user_id = '20000000-0000-0000-0000-000000000002' returning 1
) select count(*) from changed), 0::bigint, 'candidate cannot modify another candidate progress');
select throws_ok(
  $$select * from public.assessment_responses$$,
  '42501', null, 'candidate cannot query server-controlled assessment responses'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.profiles$$, '42501', null, 'anonymous users cannot query profiles');

select * from finish();
rollback;
