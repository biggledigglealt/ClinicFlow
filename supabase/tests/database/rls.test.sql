begin;

create extension if not exists pgtap with schema extensions;
select plan(66);

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
    id, name, address, city, province, latitude, longitude, services, accepting_new_patients, listing_status
)
values
    ('40000000-0000-4000-8000-000000000001', 'Synthetic Clinic A', '1 Test Road', 'Testville', 'ON', 45.4215, -110.6972, array['Family medicine', 'Walk-in'], true, 'demo'),
    ('40000000-0000-4000-8000-000000000002', 'Synthetic Clinic B', '2 Test Road', 'Testville', 'ON', 45.5000, -110.6972, array['Family medicine'], false, 'demo'),
    ('40000000-0000-4000-8000-000000000003', 'Unverified Clinic', '3 Test Road', 'Testville', 'ON', 45.4200, -110.6972, array['Walk-in'], false, 'unverified');

select throws_ok(
    $$insert into public.clinics (name, address, city, province, latitude, longitude, listing_status)
      values ('Unverified source fixture', '4 Test Road', 'Testville', 'ON', 45.42, -75.69, 'verified')$$,
    '23514', null,
    'database rejects verified listings without source provenance'
);

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
    'clinic search returns demo records and excludes an unverified clinic'
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
select is((select count(*)::int from public.list_my_upcoming_appointments()), 1, 'patient appointment read RPC returns only own upcoming booking');
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
select is(
    (select success from public.book_appointment_with_audit(
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        (((now() at time zone 'America/Toronto')::date + 7) + time '09:00') at time zone 'America/Toronto'
    )),
    true,
    'patient can book an available appointment slot through audited booking RPC'
);
select is(
    (select success from public.book_appointment_with_audit(
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        (((now() at time zone 'America/Toronto')::date + 7) + time '09:00') at time zone 'America/Toronto'
    )),
    false,
    'patient cannot book an already occupied slot and gets a safe failure result'
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
    $$select public.provision_staff_member(
      'patient-b@example.test', 'Patient', 'B',
      '40000000-0000-4000-8000-000000000001'::uuid, 'staff')$$,
    '42501', 'Platform administrator access is required.',
    'patient cannot grant clinic staff access'
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
select ok(
    exists (select 1 from public.audit_logs
      where actor_id = '10000000-0000-4000-8000-000000000001'
        and action_type = 'appointment_booking_attempt' and outcome = 'failure'),
    'rejected appointment booking is audited without request contents'
);
select ok(
    exists (select 1 from public.audit_logs
      where actor_id = '10000000-0000-4000-8000-000000000001'
        and action_type = 'patient_appointments_viewed' and entity_type = 'patient'),
    'patient appointment-list access is audited against the patient entity'
);
select ok(
    exists (select 1 from public.notification_email_outbox job
      join public.appointments appointment on appointment.id = job.appointment_id
     where job.recipient_id = '10000000-0000-4000-8000-000000000001'
       and job.event_type = 'confirmation' and appointment.status = 'cancelled'),
    'booking queues an idempotent email confirmation without storing an address'
);
select ok(
    exists (select 1 from public.notification_email_outbox job
      join public.appointments appointment on appointment.id = job.appointment_id
     where job.recipient_id = '10000000-0000-4000-8000-000000000001'
       and job.event_type = 'reminder_24h' and appointment.status = 'cancelled' and job.status = 'cancelled'),
    'cancellation removes the pending 24-hour reminder from the queue'
);
select ok(
    exists (select 1 from public.notification_email_outbox job
      join public.appointments appointment on appointment.id = job.appointment_id
     where job.recipient_id = '10000000-0000-4000-8000-000000000001'
       and job.event_type = 'cancellation' and job.status = 'queued'),
    'cancellation queues a generic email update'
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

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

select lives_ok(
    $$select public.set_clinic_hours_intervals_for_day(
        '40000000-0000-4000-8000-000000000001'::uuid, 1::smallint,
        '[{"opens_at":"09:00","closes_at":"12:00"},{"opens_at":"13:00","closes_at":"17:00"}]'::jsonb)$$,
    'clinic administrator can save split clinic hours'
);
select is(
    (select count(*)::int from public.clinic_hours
      where clinic_id = '40000000-0000-4000-8000-000000000001' and day_of_week = 1),
    2,
    'split clinic hours are stored as two intervals'
);
select throws_ok(
    $$select public.set_clinic_hours_intervals_for_day(
        '40000000-0000-4000-8000-000000000001'::uuid, 1::smallint,
        '[{"opens_at":"09:00","closes_at":"13:00"},{"opens_at":"12:00","closes_at":"17:00"}]'::jsonb)$$,
    '22023', 'Schedule intervals cannot overlap.',
    'clinic administrator cannot save overlapping intervals'
);
select is(
    (select count(*)::int from public.clinic_hours
      where clinic_id = '40000000-0000-4000-8000-000000000001' and day_of_week = 1),
    2,
    'rejected schedule update preserves the previous intervals'
);
select lives_ok(
    $$select public.set_staff_hours_intervals_for_day(
        '50000000-0000-4000-8000-000000000001'::uuid, 1::smallint,
        '[{"opens_at":"09:00","closes_at":"12:00"},{"opens_at":"13:00","closes_at":"17:00"}]'::jsonb)$$,
    'staff member can save multiple availability intervals'
);
select throws_ok(
    $$select public.set_staff_hours_intervals_for_day(
        '50000000-0000-4000-8000-000000000002'::uuid, 1::smallint,
        '[{"opens_at":"09:00","closes_at":"17:00"}]'::jsonb)$$,
    '42501', 'Active staff membership was not found.',
    'staff member cannot update another membership schedule'
);
select lives_ok(
    $$select public.set_clinic_hours_intervals_for_day(
        '40000000-0000-4000-8000-000000000001'::uuid, 1::smallint, '[]'::jsonb)$$,
    'clinic administrator can close a day by clearing its intervals'
);
select is(
    (select count(*)::int from public.clinic_hours
      where clinic_id = '40000000-0000-4000-8000-000000000001' and day_of_week = 1),
    0,
    'clearing clinic intervals leaves the day closed'
);

reset role;
update public.profiles set global_role = 'platform_admin'
 where id = '10000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
    $$select public.provision_staff_member(
      'patient-b@example.test'::text, 'Provisioned'::text, 'Staff'::text,
      '40000000-0000-4000-8000-000000000002'::uuid, 'admin'::text)$$,
    'platform administrator can provision an existing user to a clinic'
);
select is(
    (select count(*)::int from public.clinic_memberships membership
      join public.staff_profiles staff on staff.id = membership.staff_id
     where staff.user_id = '10000000-0000-4000-8000-000000000002'
       and membership.clinic_id = '40000000-0000-4000-8000-000000000002'
       and membership.role = 'admin' and membership.is_active),
    1,
    'provisioning creates an active clinic administrator membership'
);
reset role;
select ok(
    exists (select 1 from public.audit_logs
      where actor_id = '10000000-0000-4000-8000-000000000003'
        and action_type = 'staff_membership_provisioned'),
    'staff provisioning is recorded in the audit log'
);

update public.clinics set appointment_duration_minutes = 60
 where id = '40000000-0000-4000-8000-000000000001';

-- Earlier interval tests clear Monday's hours. Restore the search fixture's
-- weekday because the fixture date is today + 7, which is also Monday when
-- this suite runs on a Monday.
delete from public.clinic_hours
 where clinic_id = '40000000-0000-4000-8000-000000000001'
   and day_of_week = extract(dow from (now() at time zone 'America/Toronto')::date + 7)::smallint;
insert into public.clinic_hours (clinic_id, day_of_week, opens_at, closes_at)
select '40000000-0000-4000-8000-000000000001',
       extract(dow from test_date)::smallint, '09:00', '17:00'
  from (select (now() at time zone 'America/Toronto')::date + 7 as test_date) fixture;

delete from public.staff_hours
 where membership_id = '50000000-0000-4000-8000-000000000001'
   and day_of_week = extract(dow from (now() at time zone 'America/Toronto')::date + 7)::smallint;
insert into public.staff_hours (membership_id, day_of_week, opens_at, closes_at)
select '50000000-0000-4000-8000-000000000001',
       extract(dow from test_date)::smallint, '09:00', '17:00'
  from (select (now() at time zone 'America/Toronto')::date + 7 as test_date) fixture;

insert into public.schedule_blocks (clinic_id, starts_at, ends_at, reason)
values (
    '40000000-0000-4000-8000-000000000001',
    ((now() at time zone 'America/Toronto')::date::timestamp at time zone 'America/Toronto'),
    (((now() at time zone 'America/Toronto')::date + 1)::timestamp at time zone 'America/Toronto'),
    'closure'
);
set local role anon;
select is(
    (select next_available_at
       from public.search_clinics('Testville', 25, '{}'::text[], false, false)
      where id = '40000000-0000-4000-8000-000000000001'),
    (((now() at time zone 'America/Toronto')::date + 7) + time '10:00') at time zone 'America/Toronto',
    'Clinic Finder next availability respects the clinic appointment duration'
);
reset role;

select * from finish();
rollback;
