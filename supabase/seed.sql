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
