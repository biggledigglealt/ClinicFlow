begin;

create extension if not exists pgtap with schema extensions;
select plan(46);

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

insert into public.clinics (
    id, name, address, city, province, latitude, longitude, services, accepting_new_patients
)
values
    ('40000000-0000-4000-8000-000000000001', 'Synthetic Clinic A', '1 Test Road', 'Testville', 'ON', 45.4215, -110.6972, array['Family medicine', 'Walk-in'], true),
    ('40000000-0000-4000-8000-000000000002', 'Synthetic Clinic B', '2 Test Road', 'Testville', 'ON', 45.5000, -110.6972, array['Family medicine'], false);

insert into private.clinic_search_origins (city, province, postal_fsa, latitude, longitude)
values
    ('Testville', 'ON', null, 45.4215, -110.6972),
    ('Testville', 'ON', 'T0T', 45.4215, -110.6972);

set local role anon;
select is(
    (select count(*)::int from public.clinics where id in (
        '40000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000002'
    )),
    2,
    'anonymous users can read active clinics'
);
select is(
    (select count(*)::int from public.search_clinics('Testville', 25, '{}'::text[], false, false)),
    2,
    'clinic search resolves a city and returns nearby clinics'
);
select is(
    (select id from public.search_clinics('Testville', 25, '{}'::text[], false, false) limit 1),
    '40000000-0000-4000-8000-000000000001'::uuid,
    'clinic search sorts results by distance'
);
select is(
    (select count(*)::int from public.search_clinics('T0T 0T0', 25, '{}'::text[], false, false)),
    2,
    'clinic search resolves a manually entered Canadian postal code'
);
select is(
    (select count(*)::int from public.search_clinics('Testville', 25, array['Walk-in'], false, false)),
    1,
    'clinic search applies selected service filters'
);
select is(
    (select count(*)::int from public.search_clinics('Testville', 5, '{}'::text[], false, false)),
    1,
    'clinic search applies the maximum distance'
);
select is(
    (select count(*)::int from public.search_clinics('Testville', 25, '{}'::text[], true, false)),
    1,
    'clinic search can filter for clinics accepting new patients'
);
reset role;

insert into public.clinic_memberships (id, clinic_id, staff_id, role)
values
    ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'admin'),
    ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'staff');

insert into public.clinic_hours (clinic_id, day_of_week, opens_at, closes_at)
select
    '40000000-0000-4000-8000-000000000001',
    extract(dow from test_date)::smallint,
    '09:00',
    '17:00'
from (select (now() at time zone 'America/Toronto')::date + 7 as test_date) schedule;

insert into public.staff_hours (membership_id, day_of_week, opens_at, closes_at)
select
    '50000000-0000-4000-8000-000000000001',
    extract(dow from test_date)::smallint,
    '09:00',
    '17:00'
from (select (now() at time zone 'America/Toronto')::date + 7 as test_date) schedule;

set local role anon;
select ok(
    (select next_available_at is not null
       from public.search_clinics('Testville', 5, '{}'::text[], false, false)
      limit 1),
    'clinic search returns the next available appointment time'
);
select is(
    (select count(*)::int from public.search_clinics('Testville', 25, '{}'::text[], false, true)),
    1,
    'clinic search can filter out clinics with no upcoming availability'
);
reset role;

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
select is((select count(*)::int from public.notifications), 2, 'patient sees only own notifications, including booking notice');
select lives_ok(
    $$insert into public.accessibility_preferences (user_id, language, text_size, high_contrast, text_to_speech)
      values (auth.uid(), 'fr', 'large', true, true)
      on conflict (user_id) do update set language = excluded.language,
        text_size = excluded.text_size, high_contrast = excluded.high_contrast,
        text_to_speech = excluded.text_to_speech$$,
    'patient can save their accessibility preferences'
);
select throws_ok(
    $$insert into public.accessibility_preferences (user_id) values ('10000000-0000-4000-8000-000000000002')$$,
    '42501', null,
    'patient cannot save accessibility preferences for another user'
);
select ok(
    not exists (
        select 1 from public.notifications
        where recipient_id = auth.uid()
          and message ilike '%Test Patient A%'
    ),
    'appointment notification text does not expose patient names'
);
select is(
    (select count(*)::int from public.available_appointment_slots(
        '40000000-0000-4000-8000-000000000001',
        (now() at time zone 'America/Toronto')::date + 7
    )),
    16,
    'availability returns the scheduled 30-minute slots'
);
select lives_ok(
    $$select public.book_appointment(
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        (((now() at time zone 'America/Toronto')::date + 7) + time '09:00') at time zone 'America/Toronto'
    )$$,
    'patient can book an available appointment slot'
);
select throws_ok(
    $$select public.book_appointment(
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        (((now() at time zone 'America/Toronto')::date + 7) + time '09:00') at time zone 'America/Toronto'
    )$$,
    'P0001',
    'That appointment time is no longer available. Refresh availability and try again.',
    'patient cannot book an already occupied slot'
);
select throws_ok(
    $$insert into public.appointments (patient_id, staff_id, clinic_id, start_at, end_at)
      values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', now() + interval '10 days', now() + interval '10 days 30 minutes')$$,
    '42501',
    null,
    'patient cannot bypass the booking RPC with a direct insert'
);
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

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
    $$insert into public.waitlist_entries (id, patient_id, clinic_id, status)
      values ('70000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        '40000000-0000-4000-8000-000000000001', 'waiting')$$,
    'patient can join an active clinic waitlist'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
    $$select public.cancel_appointment((
        select id from public.appointments
        where patient_id = '20000000-0000-4000-8000-000000000001'
          and start_at = (((now() at time zone 'America/Toronto')::date + 7) + time '09:00') at time zone 'America/Toronto'
    ))$$,
    'patient can cancel their future appointment'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(
    (select status from public.waitlist_entries where id = '70000000-0000-4000-8000-000000000001'),
    'offered',
    'cancelling an appointment offers its time to the next eligible waitlisted patient'
);
select is(
    (select offered_start_at from public.waitlist_entries where id = '70000000-0000-4000-8000-000000000001'),
    (((now() at time zone 'America/Toronto')::date + 7) + time '09:00') at time zone 'America/Toronto',
    'waitlist offer records the newly available appointment time'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
    $$select public.accept_waitlist_offer('70000000-0000-4000-8000-000000000001')$$,
    'P0002', 'Waitlist offer was not found.',
    'a patient cannot accept another patient’s waitlist offer'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select ok(
    exists (select 1 from public.notifications where notification_type = 'waitlist'),
    'cancellation creates a waitlist notice'
);

select lives_ok(
    $$select public.accept_waitlist_offer('70000000-0000-4000-8000-000000000001')$$,
    'waitlisted patient can accept an active offer through validated booking'
);
select is(
    (select status from public.waitlist_entries where id = '70000000-0000-4000-8000-000000000001'),
    'accepted',
    'accepted offer changes waitlist status'
);
select is(
    (select count(*)::int from public.appointments
      where patient_id = '20000000-0000-4000-8000-000000000002'
        and clinic_id = '40000000-0000-4000-8000-000000000001'
        and start_at = (((now() at time zone 'America/Toronto')::date + 7) + time '09:00') at time zone 'America/Toronto'),
    1,
    'accepting an offer creates one appointment at the offered time'
);

reset role;
select ok(
    exists (
        select 1 from public.audit_logs
        where actor_id = '10000000-0000-4000-8000-000000000001'
          and action_type = 'appointment_cancelled'
    ),
    'appointment cancellation is audited with the signed-in actor'
);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select lives_ok(
    $$insert into public.patient_profiles (user_id, first_name, last_name)
      values (auth.uid(), 'Synthetic', 'New Patient')$$,
    'patient can create their own patient profile'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.appointments), 3, 'clinic staff sees appointments at own clinic');
select is((select count(*)::int from public.patient_profiles), 2, 'clinic staff sees patient profiles tied to own clinic appointments');
select is((select count(*)::int from public.audit_logs), 0, 'clinic staff cannot read platform audit logs');
select lives_ok(
    $$select public.set_my_staff_hours_for_day(
        '50000000-0000-4000-8000-000000000001',
        extract(dow from (now() at time zone 'America/Toronto')::date + 7)::smallint,
        '09:00', '17:00')$$,
    'staff can update their own recurring availability'
);
select lives_ok(
    $$insert into public.schedule_blocks (clinic_id, starts_at, ends_at, reason, created_by)
      values ('40000000-0000-4000-8000-000000000001', now() + interval '9 days',
        now() + interval '9 days 30 minutes', 'closure', auth.uid())$$,
    'clinic administrator can create an unavailable clinic period'
);
select throws_ok(
    $$insert into public.schedule_blocks (clinic_id, starts_at, ends_at, reason, created_by)
      values ('40000000-0000-4000-8000-000000000001', now() + interval '10 days',
        now() + interval '10 days 30 minutes', 'closure', '10000000-0000-4000-8000-000000000001')$$,
    '42501', null,
    'staff cannot spoof the schedule-block audit actor'
);
select throws_ok(
    $$insert into public.schedule_blocks (clinic_id, starts_at, ends_at, reason, created_by)
      values ('40000000-0000-4000-8000-000000000001', now() + interval '11 days',
        now() + interval '10 days', 'closure', auth.uid())$$,
    '23514', null,
    'database rejects an unavailable period whose end precedes its start'
);
select lives_ok(
    $$insert into public.announcements (clinic_id, created_by, title, message, published_at)
      values ('40000000-0000-4000-8000-000000000001', auth.uid(),
        'Synthetic closure notice', 'The clinic opens at 10 AM.', now())$$,
    'clinic administrator can publish an operational announcement'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*)::int from public.appointments), 1, 'staff sees appointment at their assigned clinic');
select is((select count(*)::int from public.patient_profiles), 1, 'staff patient visibility stays within their clinic');
select throws_ok(
    $$select public.set_my_staff_hours_for_day(
        '50000000-0000-4000-8000-000000000001'::uuid, 1::smallint, '09:00'::time, '17:00'::time)$$,
    '42501', null,
    'staff cannot edit another staff member schedule'
);

select * from finish();
rollback;
