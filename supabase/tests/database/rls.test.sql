begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
    ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'patient-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'patient-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'staff-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'staff-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'patient-new@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.patient_profiles (id, user_id, first_name, last_name)
values
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Test', 'Patient A'),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Test', 'Patient B');

insert into public.staff_profiles (id, user_id, first_name, last_name)
values
    ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Test', 'Staff A'),
    ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'Test', 'Staff B');

insert into public.clinics (id, name, address, city, province)
values
    ('40000000-0000-4000-8000-000000000001', 'Synthetic Clinic A', '1 Test Road', 'Ottawa', 'ON'),
    ('40000000-0000-4000-8000-000000000002', 'Synthetic Clinic B', '2 Test Road', 'Ottawa', 'ON');

set local role anon;
select is(
    (select count(*)::int from public.clinics where id in (
        '40000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000002'
    )),
    2,
    'anonymous users can read active clinics'
);
reset role;

insert into public.clinic_memberships (id, clinic_id, staff_id, role)
values
    ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'admin'),
    ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'staff');

insert into public.appointments (id, patient_id, staff_id, clinic_id, start_at, end_at)
values
    ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', now() + interval '1 day', now() + interval '1 day 30 minutes'),
    ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', now() + interval '2 days', now() + interval '2 days 30 minutes');

insert into public.notifications (recipient_id, title, message, notification_type)
values
    ('10000000-0000-4000-8000-000000000001', 'Synthetic reminder', 'Synthetic appointment reminder.', 'reminder'),
    ('10000000-0000-4000-8000-000000000002', 'Synthetic reminder', 'Synthetic appointment reminder.', 'reminder');

select throws_ok(
    $$insert into public.appointments (patient_id, staff_id, clinic_id, start_at, end_at)
      values ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', now() + interval '1 day 5 minutes', now() + interval '1 day 35 minutes')$$,
    '23P01',
    null,
    'database prevents overlapping appointments for a staff member'
);
select throws_ok(
    $$insert into public.appointments (patient_id, staff_id, clinic_id, start_at, end_at)
      values ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', now() + interval '2 days 5 minutes', now() + interval '2 days 35 minutes')$$,
    '23P01',
    null,
    'database prevents overlapping appointments for a patient'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'patient sees only own profile');
select is((select count(*)::int from public.appointments), 1, 'patient sees own appointment');
select is((select count(*)::int from public.patient_profiles), 1, 'patient sees only own patient profile');
select is((select count(*)::int from public.notifications), 1, 'patient sees only own notifications');
select throws_ok(
    $$update public.profiles set global_role = 'platform_admin' where id = auth.uid()$$,
    '42501',
    null,
    'patient cannot assign a platform administrator role'
);
select throws_ok(
    $$insert into public.patient_profiles (user_id, first_name, last_name)
      values ('10000000-0000-4000-8000-000000000002', 'Other', 'Patient')$$,
    '42501',
    null,
    'patient cannot create a profile for another user'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select lives_ok(
    $$insert into public.patient_profiles (user_id, first_name, last_name)
      values (auth.uid(), 'Synthetic', 'New Patient')$$,
    'patient can create their own patient profile'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.appointments), 1, 'clinic staff sees appointments at own clinic');
select is((select count(*)::int from public.patient_profiles), 1, 'clinic staff sees patient profile tied to own clinic appointment');
select is((select count(*)::int from public.audit_logs), 0, 'clinic staff cannot read platform audit logs');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*)::int from public.appointments), 1, 'staff sees appointment at their assigned clinic');
select is((select count(*)::int from public.patient_profiles), 1, 'staff patient visibility stays within their clinic');

select * from finish();
rollback;
