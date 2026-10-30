-- Synthetic local-only clinic records for testing the clinic finder.
-- These addresses are placeholders and do not identify real clinics.
insert into public.clinics (
    id,
    name,
    address,
    city,
    province,
    description,
    is_active
)
values
    (
        'd0000000-0000-4000-8000-000000000001',
        'ClinicFlow Demo Clinic - Central Ottawa',
        'Synthetic local development location',
        'Ottawa',
        'ON',
        'Synthetic clinic record for local development.',
        true
    ),
    (
        'd0000000-0000-4000-8000-000000000002',
        'ClinicFlow Demo Clinic - West Ottawa',
        'Synthetic local development location',
        'Ottawa',
        'ON',
        'Synthetic clinic record for local development.',
        true
    )
on conflict (id) do update
set
    name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    province = excluded.province,
    description = excluded.description,
    is_active = excluded.is_active;

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
