-- Clinic Finder search data and public search endpoint.
-- Search locations are normalized city/postal-FSA centroids; patient input is not stored.

alter table public.clinics
    add column latitude double precision,
    add column longitude double precision,
    add column services text[] not null default '{}'::text[],
    add column accepting_new_patients boolean not null default false,
    add constraint clinics_coordinate_pair_check check (
        num_nonnulls(latitude, longitude) = 0
        or (
            num_nonnulls(latitude, longitude) = 2
            and
            latitude between -90 and 90
            and longitude between -180 and 180
        )
    );

create index clinics_services_gin_idx
    on public.clinics using gin (services)
    where is_active;

create table private.clinic_search_origins (
    id uuid primary key default gen_random_uuid(),
    city text not null,
    province text not null,
    postal_fsa text,
    latitude double precision not null check (latitude between -90 and 90),
    longitude double precision not null check (longitude between -180 and 180),
    check (postal_fsa is null or postal_fsa ~ '^[A-Z][0-9][A-Z]$')
);

create unique index clinic_search_origins_city_idx
    on private.clinic_search_origins (lower(city), province)
    where postal_fsa is null;

create unique index clinic_search_origins_fsa_idx
    on private.clinic_search_origins (postal_fsa)
    where postal_fsa is not null;

revoke all on private.clinic_search_origins from public, anon, authenticated;

comment on table private.clinic_search_origins is
    'City and Canadian postal FSA centroid lookup used by the public Clinic Finder. Search input is not persisted.';

-- Approximate Ottawa search origins for the synthetic local prototype.
insert into private.clinic_search_origins (city, province, postal_fsa, latitude, longitude)
values
    ('Ottawa', 'ON', null, 45.4215, -75.6972),
    ('Ottawa', 'ON', 'K1N', 45.4220, -75.6810),
    ('Ottawa', 'ON', 'K2G', 45.3330, -75.7380)
on conflict do nothing;

-- Backfill only the known synthetic fixture rows. Real clinics need verified coordinates.
update public.clinics
set latitude = 45.4215,
    longitude = -75.6972,
    services = array['Family medicine', 'Walk-in']::text[],
    accepting_new_patients = true
where id = 'd0000000-0000-4000-8000-000000000001'
  and latitude is null;

update public.clinics
set latitude = 45.3470,
    longitude = -75.8040,
    services = array['Family medicine']::text[],
    accepting_new_patients = false
where id = 'd0000000-0000-4000-8000-000000000002'
  and latitude is null;

create or replace function public.search_clinics(
    p_location text,
    p_max_distance_km integer default 25,
    p_services text[] default '{}'::text[],
    p_accepting_new_patients boolean default false,
    p_only_with_availability boolean default false
)
returns table (
    id uuid,
    name text,
    address text,
    city text,
    province text,
    phone text,
    description text,
    time_zone text,
    services text[],
    accepting_new_patients boolean,
    distance_km numeric,
    next_available_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_location text;
    v_latitude double precision;
    v_longitude double precision;
begin
    if p_location is null or length(trim(p_location)) = 0 or length(trim(p_location)) > 100 then
        raise exception 'Enter a city or postal code to search.'
            using errcode = '22023';
    end if;

    if p_max_distance_km is null or p_max_distance_km < 1 or p_max_distance_km > 500 then
        raise exception 'Search distance must be between 1 and 500 km.'
            using errcode = '22023';
    end if;

    v_location := upper(regexp_replace(trim(p_location), '[^A-Za-z0-9]', '', 'g'));

    if v_location ~ '^[A-Z][0-9][A-Z]([0-9][A-Z][0-9])?$' then
        select origin.latitude, origin.longitude
          into v_latitude, v_longitude
          from private.clinic_search_origins origin
         where origin.postal_fsa = substring(v_location from 1 for 3)
         limit 1;
    else
        select origin.latitude, origin.longitude
          into v_latitude, v_longitude
          from private.clinic_search_origins origin
         where origin.postal_fsa is null
           and lower(origin.city) = lower(trim(p_location))
         order by origin.province
         limit 1;

        -- A clinic with verified coordinates makes its city searchable even when a
        -- separate city-centroid row has not yet been added.
        if not found then
            select avg(clinic.latitude), avg(clinic.longitude)
              into v_latitude, v_longitude
              from public.clinics clinic
             where clinic.is_active
               and clinic.latitude is not null
               and lower(clinic.city) = lower(trim(p_location));
        end if;
    end if;

    if v_latitude is null or v_longitude is null then
        raise exception 'No search location is configured for that city or postal code.'
            using errcode = '22023';
    end if;

    return query
    with clinic_distances as (
        select
            clinic.*,
            6371.0 * 2.0 * asin(sqrt(least(1.0, greatest(0.0,
                power(sin(radians(clinic.latitude - v_latitude) / 2.0), 2)
                + cos(radians(v_latitude)) * cos(radians(clinic.latitude))
                    * power(sin(radians(clinic.longitude - v_longitude) / 2.0), 2)
            )))) as raw_distance_km
        from public.clinics clinic
        where clinic.is_active
          and clinic.latitude is not null
          and clinic.longitude is not null
    ), filtered_clinics as (
        select clinic.*
        from clinic_distances clinic
        where clinic.raw_distance_km <= p_max_distance_km
          and (
              cardinality(coalesce(p_services, '{}'::text[])) = 0
              or clinic.services && p_services
          )
          and (not p_accepting_new_patients or clinic.accepting_new_patients)
    ), candidate_dates as (
        select
            clinic.id as clinic_id,
            clinic.time_zone,
            ((now() at time zone clinic.time_zone)::date + day_offsets.day_offset) as local_date
        from filtered_clinics clinic
        cross join generate_series(0, 60) as day_offsets(day_offset)
    ), schedule_windows as (
        select
            candidate.clinic_id,
            candidate.time_zone,
            candidate.local_date,
            membership.staff_id,
            greatest(clinic_hours.opens_at, staff_hours.opens_at) as opens_at,
            least(clinic_hours.closes_at, staff_hours.closes_at) as closes_at
        from candidate_dates candidate
        join public.clinic_memberships membership
          on membership.clinic_id = candidate.clinic_id
         and membership.is_active
        join public.clinic_hours clinic_hours
          on clinic_hours.clinic_id = candidate.clinic_id
         and clinic_hours.day_of_week = extract(dow from candidate.local_date)::smallint
        join public.staff_hours staff_hours
          on staff_hours.membership_id = membership.id
         and staff_hours.day_of_week = extract(dow from candidate.local_date)::smallint
        where greatest(clinic_hours.opens_at, staff_hours.opens_at)
            < least(clinic_hours.closes_at, staff_hours.closes_at)
    ), candidate_slots as (
        select
            schedule_window.clinic_id,
            schedule_window.staff_id,
            ((schedule_window.local_date + schedule_window.opens_at
                + slot_indices.slot_index * interval '30 minutes') at time zone schedule_window.time_zone) as slot_start
        from schedule_windows schedule_window
        cross join lateral generate_series(
            0,
            floor(extract(epoch from (schedule_window.closes_at - schedule_window.opens_at)) / 1800)::integer - 1
        ) as slot_indices(slot_index)
    ), next_availability as (
        select
            slot.clinic_id,
            min(slot.slot_start) as next_available_at
        from candidate_slots slot
        where slot.slot_start > now()
          and not exists (
              select 1
              from public.appointments appointment
              where appointment.staff_id = slot.staff_id
                and appointment.status in ('booked', 'confirmed')
                and tstzrange(appointment.start_at, appointment.end_at, '[)')
                    && tstzrange(slot.slot_start, slot.slot_start + interval '30 minutes', '[)')
          )
        group by slot.clinic_id
    )
    select
        clinic.id,
        clinic.name,
        clinic.address,
        clinic.city,
        clinic.province,
        clinic.phone,
        clinic.description,
        clinic.time_zone,
        clinic.services,
        clinic.accepting_new_patients,
        round(clinic.raw_distance_km::numeric, 1),
        availability.next_available_at
    from filtered_clinics clinic
    left join next_availability availability on availability.clinic_id = clinic.id
    where not p_only_with_availability or availability.next_available_at is not null
    order by clinic.raw_distance_km, clinic.name;
end;
$$;

revoke all on function public.search_clinics(text, integer, text[], boolean, boolean)
    from public, anon, authenticated;
grant execute on function public.search_clinics(text, integer, text[], boolean, boolean)
    to anon, authenticated;
