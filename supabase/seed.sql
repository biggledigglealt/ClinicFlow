-- Synthetic local-only clinic records for testing the clinic finder.
-- These addresses are placeholders and do not identify real clinics.
insert into public.clinics (
    id,
    name,
    address,
    city,
    province,
    latitude,
    longitude,
    description,
    services,
    accepting_new_patients,
    is_active,
    listing_status
)
values
    (
        'd0000000-0000-4000-8000-000000000001',
        'ClinicFlow Demo Clinic - Central Ottawa',
        'Synthetic local development location',
        'Ottawa',
        'ON',
        45.4215,
        -75.6972,
        'Synthetic clinic record for local development.',
        array['Family medicine', 'Walk-in']::text[],
        true,
        true,
        'demo'
    ),
    (
        'd0000000-0000-4000-8000-000000000002',
        'ClinicFlow Demo Clinic - West Ottawa',
        'Synthetic local development location',
        'Ottawa',
        'ON',
        45.3470,
        -75.8040,
        'Synthetic clinic record for local development.',
        array['Family medicine']::text[],
        false,
        true,
        'demo'
    )
on conflict (id) do update
set
    name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    province = excluded.province,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    description = excluded.description,
    services = excluded.services,
    accepting_new_patients = excluded.accepting_new_patients,
    is_active = excluded.is_active,
    listing_status = excluded.listing_status;

insert into private.clinic_search_origins (city, province, postal_fsa, latitude, longitude)
values
    ('Ottawa', 'ON', null, 45.4215, -75.6972),
    ('Ottawa', 'ON', 'K1N', 45.4220, -75.6810),
    ('Ottawa', 'ON', 'K2G', 45.3330, -75.7380)
on conflict do nothing;

-- This synthetic staff identity has no password and cannot be used to sign in.
-- It provides a provider and weekday schedule for local booking tests.
insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
values (
    'e0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'clinicflow-demo-staff@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
)
on conflict do nothing;

insert into public.staff_profiles (id, user_id, first_name, last_name, job_title)
values (
    'e1000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000001',
    'Demo',
    'Provider',
    'Synthetic local provider'
)
on conflict (id) do update
set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    job_title = excluded.job_title;

insert into public.clinic_memberships (id, clinic_id, staff_id, role, is_active)
values (
    'e2000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'staff',
    true
)
on conflict (clinic_id, staff_id) do update
set role = excluded.role, is_active = excluded.is_active;

insert into public.clinic_hours (id, clinic_id, day_of_week, opens_at, closes_at)
values
    ('e3000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 2, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 3, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 4, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 5, '09:00', '17:00')
on conflict (id) do update
set opens_at = excluded.opens_at, closes_at = excluded.closes_at;

insert into public.staff_hours (id, membership_id, day_of_week, opens_at, closes_at)
values
    ('e4000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 1, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001', 2, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000003', 'e2000000-0000-4000-8000-000000000001', 3, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000004', 'e2000000-0000-4000-8000-000000000001', 4, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000005', 'e2000000-0000-4000-8000-000000000001', 5, '09:00', '17:00')
on conflict (id) do update
set opens_at = excluded.opens_at, closes_at = excluded.closes_at;

-- A separate synthetic provider gives the West Ottawa demo clinic bookable slots.
insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
values (
    'e0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'clinicflow-west-provider@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
)
on conflict do nothing;

insert into public.staff_profiles (id, user_id, first_name, last_name, job_title)
values (
    'e1000000-0000-4000-8000-000000000002',
    'e0000000-0000-4000-8000-000000000002',
    'Jordan',
    'Demo',
    'Synthetic local provider'
)
on conflict (id) do update
set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    job_title = excluded.job_title;

insert into public.clinic_memberships (id, clinic_id, staff_id, role, is_active)
values (
    'e2000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000002',
    'staff',
    true
)
on conflict (clinic_id, staff_id) do update
set role = excluded.role, is_active = excluded.is_active;

insert into public.clinic_hours (id, clinic_id, day_of_week, opens_at, closes_at)
values
    ('e3000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 1, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000002', 2, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000002', 3, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000002', 4, '09:00', '17:00'),
    ('e3000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000002', 5, '09:00', '17:00')
on conflict (id) do update
set opens_at = excluded.opens_at, closes_at = excluded.closes_at;

insert into public.staff_hours (id, membership_id, day_of_week, opens_at, closes_at)
values
    ('e4000000-0000-4000-8000-000000000006', 'e2000000-0000-4000-8000-000000000002', 1, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000007', 'e2000000-0000-4000-8000-000000000002', 2, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000008', 'e2000000-0000-4000-8000-000000000002', 3, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000009', 'e2000000-0000-4000-8000-000000000002', 4, '09:00', '17:00'),
    ('e4000000-0000-4000-8000-000000000010', 'e2000000-0000-4000-8000-000000000002', 5, '09:00', '17:00')
on conflict (id) do update
set opens_at = excluded.opens_at, closes_at = excluded.closes_at;
