-- Clinic directory records remain hidden from public search until they are explicitly
-- marked as synthetic demo data or verified from a recorded source.
alter table public.clinics
    add column listing_status text not null default 'unverified'
        check (listing_status in ('unverified', 'demo', 'verified')),
    add column source_name text,
    add column source_record_id text,
    add column source_url text,
    add column source_checked_on date;

alter table public.clinics
    add constraint clinics_verified_source_check check (
        listing_status <> 'verified'
        or (
            latitude is not null
            and longitude is not null
            and nullif(trim(source_name), '') is not null
            and nullif(trim(source_record_id), '') is not null
            and source_url ~ '^https://'
            and source_checked_on is not null
        )
    );

create unique index clinics_source_record_unique_idx
    on public.clinics (source_name, source_record_id)
    where source_name is not null and source_record_id is not null;

comment on column public.clinics.listing_status is
    'Only verified real listings and clearly labelled synthetic demos appear in public clinic search.';
comment on column public.clinics.source_url is
    'Public source page used to verify listing details; never a patient or account URL.';

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
        raise exception 'Enter a city or postal code to search.' using errcode = '22023';
    end if;
    if p_max_distance_km is null or p_max_distance_km < 1 or p_max_distance_km > 500 then
        raise exception 'Search distance must be between 1 and 500 km.' using errcode = '22023';
    end if;

    v_location := upper(regexp_replace(trim(p_location), '[^A-Za-z0-9]', '', 'g'));
    if v_location ~ '^[A-Z][0-9][A-Z]([0-9][A-Z][0-9])?$' then
        select origin.latitude, origin.longitude into v_latitude, v_longitude
          from private.clinic_search_origins origin
         where origin.postal_fsa = substring(v_location from 1 for 3)
         limit 1;
    else
        select origin.latitude, origin.longitude into v_latitude, v_longitude
          from private.clinic_search_origins origin
         where origin.postal_fsa is null and lower(origin.city) = lower(trim(p_location))
         order by origin.province limit 1;
        if not found then
            select avg(clinic.latitude), avg(clinic.longitude)
              into v_latitude, v_longitude
              from public.clinics clinic
             where clinic.is_active
               and clinic.listing_status in ('demo', 'verified')
               and clinic.latitude is not null
               and lower(clinic.city) = lower(trim(p_location));
        end if;
    end if;
    if v_latitude is null or v_longitude is null then
        raise exception 'No search location is configured for that city or postal code.' using errcode = '22023';
    end if;

    return query
    with clinic_distances as (
        select clinic.*,
            6371.0 * 2.0 * asin(sqrt(least(1.0, greatest(0.0,
                power(sin(radians(clinic.latitude - v_latitude) / 2.0), 2)
                + cos(radians(v_latitude)) * cos(radians(clinic.latitude))
                    * power(sin(radians(clinic.longitude - v_longitude) / 2.0), 2)
            )))) as raw_distance_km
        from public.clinics clinic
        where clinic.is_active
          and clinic.listing_status in ('demo', 'verified')
          and clinic.latitude is not null
          and clinic.longitude is not null
    ), filtered_clinics as (
        select clinic.* from clinic_distances clinic
        where clinic.raw_distance_km <= p_max_distance_km
          and (cardinality(coalesce(p_services, '{}'::text[])) = 0 or clinic.services && p_services)
          and (not p_accepting_new_patients or clinic.accepting_new_patients)
    ), candidate_dates as (
        select clinic.id as clinic_id, clinic.time_zone,
            ((now() at time zone clinic.time_zone)::date + day_offsets.day_offset) as local_date
        from filtered_clinics clinic
        cross join generate_series(0, 60) as day_offsets(day_offset)
    ), schedule_windows as (
        select candidate.clinic_id, candidate.time_zone, candidate.local_date, membership.staff_id,
            greatest(clinic_hours.opens_at, staff_hours.opens_at) as opens_at,
            least(clinic_hours.closes_at, staff_hours.closes_at) as closes_at
        from candidate_dates candidate
        join public.clinic_memberships membership
          on membership.clinic_id = candidate.clinic_id and membership.is_active
        join public.clinic_hours clinic_hours
          on clinic_hours.clinic_id = candidate.clinic_id
         and clinic_hours.day_of_week = extract(dow from candidate.local_date)::smallint
        join public.staff_hours staff_hours
          on staff_hours.membership_id = membership.id
         and staff_hours.day_of_week = extract(dow from candidate.local_date)::smallint
        where greatest(clinic_hours.opens_at, staff_hours.opens_at)
            < least(clinic_hours.closes_at, staff_hours.closes_at)
    ), candidate_slots as (
        select schedule_window.clinic_id, schedule_window.staff_id,
            ((schedule_window.local_date + schedule_window.opens_at
                + slot_indices.slot_index * interval '30 minutes') at time zone schedule_window.time_zone) as slot_start
        from schedule_windows schedule_window
        cross join lateral generate_series(
            0,
            floor(extract(epoch from (schedule_window.closes_at - schedule_window.opens_at)) / 1800)::integer - 1
        ) as slot_indices(slot_index)
    ), next_availability as (
        select slot.clinic_id, min(slot.slot_start) as next_available_at
        from candidate_slots slot
        where slot.slot_start > now()
          and not exists (
              select 1 from public.appointments appointment
              where appointment.staff_id = slot.staff_id
                and appointment.status in ('booked', 'confirmed')
                and tstzrange(appointment.start_at, appointment.end_at, '[)')
                    && tstzrange(slot.slot_start, slot.slot_start + interval '30 minutes', '[)')
          )
          and not exists (
              select 1 from public.schedule_blocks block
              where block.clinic_id = slot.clinic_id
                and (block.staff_id is null or block.staff_id = slot.staff_id)
                and tstzrange(block.starts_at, block.ends_at, '[)')
                    && tstzrange(slot.slot_start, slot.slot_start + interval '30 minutes', '[)')
          )
        group by slot.clinic_id
    )
    select clinic.id, clinic.name, clinic.address, clinic.city, clinic.province, clinic.phone,
        clinic.description, clinic.time_zone, clinic.services, clinic.accepting_new_patients,
        round(clinic.raw_distance_km::numeric, 1), availability.next_available_at
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

-- Platform administrators may assign clinic roles only to an existing Auth account.
-- Public signup still creates patient accounts only.
create or replace function public.provision_staff_member(
    p_email text,
    p_first_name text,
    p_last_name text,
    p_clinic_id uuid,
    p_role text default 'staff'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_staff_id uuid;
    v_membership_id uuid;
begin
    if not private.is_platform_admin() then
        raise exception 'Platform administrator access is required.' using errcode = '42501';
    end if;
    if p_email is null or length(trim(p_email)) > 254 or position('@' in trim(p_email)) < 2
       or p_first_name is null or length(trim(p_first_name)) not between 1 and 100
       or p_last_name is null or length(trim(p_last_name)) not between 1 and 100
       or p_role not in ('staff', 'admin') then
        raise exception 'Provide a valid account email, name, clinic, and staff role.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.clinics clinic where clinic.id = p_clinic_id and clinic.is_active) then
        raise exception 'Active clinic was not found.' using errcode = 'P0002';
    end if;

    select user_record.id into v_user_id
      from auth.users user_record
     where lower(user_record.email) = lower(trim(p_email));
    if v_user_id is null then
        raise exception 'Create and verify the account before assigning clinic access.' using errcode = 'P0002';
    end if;

    insert into public.staff_profiles (user_id, first_name, last_name)
    values (v_user_id, trim(p_first_name), trim(p_last_name))
    on conflict (user_id) do update
        set first_name = excluded.first_name,
            last_name = excluded.last_name
    returning id into v_staff_id;

    insert into public.clinic_memberships (clinic_id, staff_id, role, is_active)
    values (p_clinic_id, v_staff_id, p_role, true)
    on conflict (clinic_id, staff_id) do update
        set role = excluded.role,
            is_active = true
    returning id into v_membership_id;

    insert into public.audit_logs (actor_id, action_type, entity_type, entity_id)
    values (auth.uid(), 'staff_membership_provisioned', 'clinic', p_clinic_id);
    return v_membership_id;
end;
$$;

revoke all on function public.provision_staff_member(text, text, text, uuid, text)
    from public, anon, authenticated;
grant execute on function public.provision_staff_member(text, text, text, uuid, text)
    to authenticated;

-- Read appointment data through narrow functions so the access itself can be audited.
create or replace function public.list_clinic_appointments_for_day(
    p_clinic_id uuid,
    p_date date
)
returns table (
    id uuid,
    patient_first_name text,
    patient_last_name text,
    staff_first_name text,
    staff_last_name text,
    start_at timestamptz,
    end_at timestamptz,
    status text,
    checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_time_zone text;
begin
    if not (private.is_clinic_member(p_clinic_id) or private.is_platform_admin()) then
        raise exception 'You are not a member of this clinic.' using errcode = '42501';
    end if;
    select clinic.time_zone into v_time_zone
      from public.clinics clinic where clinic.id = p_clinic_id;
    if not found then
        raise exception 'Clinic was not found.' using errcode = 'P0002';
    end if;

    insert into public.audit_logs (actor_id, action_type, entity_type, entity_id)
    values (auth.uid(), 'clinic_appointments_viewed', 'clinic', p_clinic_id);

    return query
    select appointment.id, patient.first_name, patient.last_name,
           staff.first_name, staff.last_name, appointment.start_at,
           appointment.end_at, appointment.status, appointment.checked_in_at
      from public.appointments appointment
      join public.patient_profiles patient on patient.id = appointment.patient_id
      join public.staff_profiles staff on staff.id = appointment.staff_id
     where appointment.clinic_id = p_clinic_id
       and appointment.start_at >= (p_date::timestamp at time zone v_time_zone)
       and appointment.start_at < ((p_date + 1)::timestamp at time zone v_time_zone)
     order by appointment.start_at;
end;
$$;

create or replace function public.list_my_upcoming_appointments()
returns table (
    id uuid,
    clinic_id uuid,
    start_at timestamptz,
    end_at timestamptz,
    status text,
    clinic_name text,
    clinic_time_zone text,
    staff_first_name text,
    staff_last_name text,
    staff_job_title text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_patient_id uuid;
begin
    select patient.id into v_patient_id
      from public.patient_profiles patient
     where patient.user_id = auth.uid();
    if v_patient_id is null then
        return;
    end if;

    insert into public.audit_logs (actor_id, action_type, entity_type, entity_id)
    values (auth.uid(), 'patient_appointments_viewed', 'patient', v_patient_id);

    return query
    select appointment.id, appointment.clinic_id, appointment.start_at,
           appointment.end_at, appointment.status, clinic.name, clinic.time_zone,
           staff.first_name, staff.last_name, staff.job_title
      from public.appointments appointment
      join public.clinics clinic on clinic.id = appointment.clinic_id
      join public.staff_profiles staff on staff.id = appointment.staff_id
     where appointment.patient_id = v_patient_id
       and appointment.status in ('booked', 'confirmed')
       and appointment.start_at >= now()
     order by appointment.start_at;
end;
$$;

revoke all on function public.list_my_upcoming_appointments() from public, anon, authenticated;
grant execute on function public.list_my_upcoming_appointments() to authenticated;

-- The wrapper records rejected booking attempts without exposing database internals
-- or storing request bodies, patient names, or contact details in the audit log.
create or replace function public.book_appointment_with_audit(
    p_clinic_id uuid,
    p_staff_id uuid,
    p_start_at timestamptz
)
returns table (success boolean, appointment_id uuid, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_appointment_id uuid;
    v_sqlstate text;
begin
    begin
        v_appointment_id := public.book_appointment(p_clinic_id, p_staff_id, p_start_at);
        return query select true, v_appointment_id, null::text;
    exception when others then
        get stacked diagnostics v_sqlstate = returned_sqlstate;
        insert into public.audit_logs (actor_id, action_type, entity_type, entity_id, outcome)
        values (auth.uid(), 'appointment_booking_attempt', 'clinic', p_clinic_id, 'failure');
        return query select false, null::uuid,
            case
                when v_sqlstate = '42501' then 'Sign in with a patient account to book.'
                when v_sqlstate in ('P0001', '23P01', '22023') then 'This time could not be booked. Refresh availability and try again.'
                else 'The booking could not be completed. Please try again.'
            end;
    end;
end;
$$;

revoke all on function public.book_appointment(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.book_appointment_with_audit(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.book_appointment_with_audit(uuid, uuid, timestamptz) to authenticated;
