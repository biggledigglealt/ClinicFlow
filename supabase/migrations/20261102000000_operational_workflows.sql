-- Scheduling and patient-operation workflows for the ClinicFlow prototype.
-- Uses synthetic/demo data only; clinic staff memberships remain trusted assignments.

alter table public.clinics
    add column appointment_duration_minutes integer not null default 30
        check (appointment_duration_minutes between 15 and 120
            and appointment_duration_minutes % 15 = 0);

create table public.schedule_blocks (
    id uuid primary key default gen_random_uuid(),
    clinic_id uuid not null references public.clinics (id) on delete cascade,
    staff_id uuid references public.staff_profiles (id) on delete cascade,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    reason text not null default 'unavailable'
        check (reason in ('unavailable', 'closure', 'break', 'other')),
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    check (ends_at > starts_at),
    foreign key (clinic_id, staff_id)
        references public.clinic_memberships (clinic_id, staff_id) on delete cascade
);

create index schedule_blocks_clinic_time_idx
    on public.schedule_blocks (clinic_id, starts_at, ends_at);
create index schedule_blocks_staff_time_idx
    on public.schedule_blocks (staff_id, starts_at, ends_at)
    where staff_id is not null;

alter table public.schedule_blocks enable row level security;

create policy "Clinic staff view schedule blocks at own clinics"
on public.schedule_blocks for select to authenticated
using (private.is_platform_admin() or private.is_clinic_member(clinic_id));

create policy "Clinic admins manage clinic blocks and staff manage own blocks"
on public.schedule_blocks for all to authenticated
using (
    private.is_platform_admin()
    or private.is_clinic_admin(clinic_id)
    or (
        staff_id is not null
        and exists (
            select 1
            from public.clinic_memberships membership
            join public.staff_profiles staff on staff.id = membership.staff_id
            where membership.clinic_id = schedule_blocks.clinic_id
              and membership.staff_id = schedule_blocks.staff_id
              and membership.is_active
              and staff.user_id = (select auth.uid())
        )
    )
)
with check (
    private.is_platform_admin()
    or private.is_clinic_admin(clinic_id)
    or (
        staff_id is not null
        and exists (
            select 1
            from public.clinic_memberships membership
            join public.staff_profiles staff on staff.id = membership.staff_id
            where membership.clinic_id = schedule_blocks.clinic_id
              and membership.staff_id = schedule_blocks.staff_id
              and membership.is_active
              and staff.user_id = (select auth.uid())
        )
    )
);

grant select, insert, update, delete on public.schedule_blocks to authenticated;

-- Staff may edit only their own recurring hours; clinic-hour and other staff-hour
-- changes continue to require a clinic administrator.
create policy "Staff manage only their own recurring hours"
on public.staff_hours for all to authenticated
using (
    exists (
        select 1
        from public.clinic_memberships membership
        join public.staff_profiles staff on staff.id = membership.staff_id
        where membership.id = staff_hours.membership_id
          and membership.is_active
          and staff.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.clinic_memberships membership
        join public.staff_profiles staff on staff.id = membership.staff_id
        where membership.id = staff_hours.membership_id
          and membership.is_active
          and staff.user_id = (select auth.uid())
    )
);

create or replace function public.available_appointment_slots(
    p_clinic_id uuid,
    p_date date
)
returns table (
    staff_id uuid,
    staff_first_name text,
    staff_last_name text,
    staff_job_title text,
    start_at timestamptz,
    end_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_patient_id uuid;
    v_time_zone text;
    v_duration_minutes integer;
begin
    if v_user_id is null then
        raise exception 'Authentication is required to view appointment availability.'
            using errcode = '42501';
    end if;

    select patient.id
      into v_patient_id
      from public.patient_profiles patient
     where patient.user_id = v_user_id;

    if v_patient_id is null then
        return;
    end if;

    select clinic.time_zone, clinic.appointment_duration_minutes
      into v_time_zone, v_duration_minutes
      from public.clinics clinic
     where clinic.id = p_clinic_id
       and clinic.is_active;

    if not found then
        return;
    end if;

    return query
    with schedule_windows as (
        select
            staff.id as staff_uuid,
            staff.first_name as staff_given_name,
            staff.last_name as staff_family_name,
            staff.job_title as staff_title,
            greatest(clinic_hours.opens_at, staff_hours.opens_at) as window_opens_at,
            least(clinic_hours.closes_at, staff_hours.closes_at) as window_closes_at
        from public.clinic_memberships membership
        join public.staff_profiles staff on staff.id = membership.staff_id
        join public.clinic_hours clinic_hours
          on clinic_hours.clinic_id = membership.clinic_id
         and clinic_hours.day_of_week = extract(dow from p_date)::smallint
        join public.staff_hours staff_hours
          on staff_hours.membership_id = membership.id
         and staff_hours.day_of_week = extract(dow from p_date)::smallint
        where membership.clinic_id = p_clinic_id
          and membership.is_active
          and greatest(clinic_hours.opens_at, staff_hours.opens_at)
              < least(clinic_hours.closes_at, staff_hours.closes_at)
    ), candidates as (
        select
            schedule.staff_uuid,
            schedule.staff_given_name,
            schedule.staff_family_name,
            schedule.staff_title,
            (p_date + schedule.window_opens_at
                + offsets.slot_index * v_duration_minutes * interval '1 minute')
                at time zone v_time_zone as slot_start,
            (p_date + schedule.window_opens_at
                + (offsets.slot_index + 1) * v_duration_minutes * interval '1 minute')
                at time zone v_time_zone as slot_end
        from schedule_windows schedule
        cross join lateral generate_series(
            0,
            floor(extract(epoch from (schedule.window_closes_at - schedule.window_opens_at))
                / (v_duration_minutes * 60))::integer - 1
        ) as offsets(slot_index)
    )
    select
        candidate.staff_uuid,
        candidate.staff_given_name,
        candidate.staff_family_name,
        candidate.staff_title,
        candidate.slot_start,
        candidate.slot_end
    from candidates candidate
    where candidate.slot_start > now()
      and not exists (
          select 1
          from public.appointments appointment
          where appointment.staff_id = candidate.staff_uuid
            and appointment.status in ('booked', 'confirmed')
            and tstzrange(appointment.start_at, appointment.end_at, '[)')
                && tstzrange(candidate.slot_start, candidate.slot_end, '[)')
      )
      and not exists (
          select 1
          from public.appointments appointment
          where appointment.patient_id = v_patient_id
            and appointment.status in ('booked', 'confirmed')
            and tstzrange(appointment.start_at, appointment.end_at, '[)')
                && tstzrange(candidate.slot_start, candidate.slot_end, '[)')
      )
      and not exists (
          select 1
          from public.schedule_blocks block
          where block.clinic_id = p_clinic_id
            and (block.staff_id is null or block.staff_id = candidate.staff_uuid)
            and tstzrange(block.starts_at, block.ends_at, '[)')
                && tstzrange(candidate.slot_start, candidate.slot_end, '[)')
      )
    order by candidate.slot_start, candidate.staff_family_name, candidate.staff_given_name;
end;
$$;

create or replace function public.book_appointment(
    p_clinic_id uuid,
    p_staff_id uuid,
    p_start_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_patient_id uuid;
    v_time_zone text;
    v_duration_minutes integer;
    v_local_date date;
    v_appointment_id uuid;
begin
    if v_user_id is null then
        raise exception 'Authentication is required to book an appointment.'
            using errcode = '42501';
    end if;

    select patient.id into v_patient_id
      from public.patient_profiles patient
     where patient.user_id = v_user_id;

    if v_patient_id is null then
        raise exception 'Complete your patient profile before booking.'
            using errcode = 'P0001';
    end if;

    select clinic.time_zone, clinic.appointment_duration_minutes
      into v_time_zone, v_duration_minutes
      from public.clinics clinic
     where clinic.id = p_clinic_id
       and clinic.is_active;

    if not found or p_start_at is null then
        raise exception 'The selected clinic or appointment time is unavailable.'
            using errcode = 'P0001';
    end if;

    v_local_date := (p_start_at at time zone v_time_zone)::date;

    if not exists (
        select 1
        from public.available_appointment_slots(p_clinic_id, v_local_date) slot
        where slot.staff_id = p_staff_id
          and slot.start_at = p_start_at
    ) then
        raise exception 'That appointment time is no longer available. Refresh availability and try again.'
            using errcode = 'P0001';
    end if;

    begin
        insert into public.appointments (
            patient_id, staff_id, clinic_id, start_at, end_at, status
        ) values (
            v_patient_id,
            p_staff_id,
            p_clinic_id,
            p_start_at,
            p_start_at + v_duration_minutes * interval '1 minute',
            'booked'
        ) returning id into v_appointment_id;
    exception
        when exclusion_violation then
            raise exception 'That appointment time was just booked. Refresh availability and choose another.'
                using errcode = 'P0001';
    end;

    return v_appointment_id;
end;
$$;

create or replace function public.cancel_appointment(p_appointment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_patient_id uuid;
    v_clinic_id uuid;
    v_status text;
    v_start_at timestamptz;
begin
    if auth.uid() is null then
        raise exception 'Authentication is required.' using errcode = '42501';
    end if;

    select appointment.patient_id, appointment.clinic_id, appointment.status, appointment.start_at
      into v_patient_id, v_clinic_id, v_status, v_start_at
      from public.appointments appointment
     where appointment.id = p_appointment_id
     for update;

    if not found then
        raise exception 'Appointment was not found.' using errcode = 'P0002';
    end if;
    if not (private.is_patient_owner(v_patient_id)
        or private.is_clinic_member(v_clinic_id)
        or private.is_platform_admin()) then
        raise exception 'You are not allowed to cancel this appointment.' using errcode = '42501';
    end if;
    if v_status not in ('booked', 'confirmed') or v_start_at <= now() then
        raise exception 'Only future active appointments can be cancelled.' using errcode = 'P0001';
    end if;

    update public.appointments
       set status = 'cancelled'
     where id = p_appointment_id;
    return true;
end;
$$;

create or replace function public.reschedule_appointment(
    p_appointment_id uuid,
    p_staff_id uuid,
    p_start_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_patient_id uuid;
    v_clinic_id uuid;
    v_status text;
    v_time_zone text;
    v_duration_minutes integer;
    v_local_date date;
begin
    if auth.uid() is null then
        raise exception 'Authentication is required.' using errcode = '42501';
    end if;

    select appointment.patient_id, appointment.clinic_id, appointment.status
      into v_patient_id, v_clinic_id, v_status
      from public.appointments appointment
     where appointment.id = p_appointment_id
     for update;

    if not found then
        raise exception 'Appointment was not found.' using errcode = 'P0002';
    end if;
    if not (private.is_patient_owner(v_patient_id)
        or private.is_clinic_member(v_clinic_id)
        or private.is_platform_admin()) then
        raise exception 'You are not allowed to reschedule this appointment.' using errcode = '42501';
    end if;
    if v_status not in ('booked', 'confirmed') then
        raise exception 'Only active appointments can be rescheduled.' using errcode = 'P0001';
    end if;
    if p_start_at is null then
        raise exception 'Choose an available appointment time.' using errcode = '22023';
    end if;

    select clinic.time_zone, clinic.appointment_duration_minutes
      into v_time_zone, v_duration_minutes
      from public.clinics clinic
     where clinic.id = v_clinic_id
       and clinic.is_active;
    if not found then
        raise exception 'The clinic is inactive.' using errcode = 'P0001';
    end if;

    v_local_date := (p_start_at at time zone v_time_zone)::date;
    if not exists (
        select 1 from public.available_appointment_slots(v_clinic_id, v_local_date) slot
        where slot.staff_id = p_staff_id and slot.start_at = p_start_at
    ) then
        raise exception 'That appointment time is unavailable. Refresh availability and try again.'
            using errcode = 'P0001';
    end if;

    update public.appointments
       set staff_id = p_staff_id,
           start_at = p_start_at,
           end_at = p_start_at + v_duration_minutes * interval '1 minute',
           status = 'booked'
     where id = p_appointment_id;
    return p_appointment_id;
exception
    when exclusion_violation then
        raise exception 'That appointment time was just booked. Refresh availability and choose another.'
            using errcode = 'P0001';
end;
$$;

create or replace function public.check_in_appointment(p_appointment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_clinic_id uuid;
    v_start_at timestamptz;
    v_end_at timestamptz;
    v_status text;
begin
    select appointment.clinic_id, appointment.start_at, appointment.end_at, appointment.status
      into v_clinic_id, v_start_at, v_end_at, v_status
      from public.appointments appointment
     where appointment.id = p_appointment_id
     for update;
    if not found then
        raise exception 'Appointment was not found.' using errcode = 'P0002';
    end if;
    if not (private.is_clinic_member(v_clinic_id) or private.is_platform_admin()) then
        raise exception 'Only clinic staff can check in a patient.' using errcode = '42501';
    end if;
    if v_status not in ('booked', 'confirmed')
       or now() < v_start_at - interval '30 minutes'
       or now() > v_end_at + interval '4 hours' then
        raise exception 'This appointment cannot be checked in at this time.' using errcode = 'P0001';
    end if;
    update public.appointments set checked_in_at = now() where id = p_appointment_id;
    return true;
end;
$$;

create or replace function public.set_appointment_outcome(
    p_appointment_id uuid,
    p_outcome text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_clinic_id uuid;
    v_status text;
    v_end_at timestamptz;
begin
    if p_outcome not in ('completed', 'no_show') then
        raise exception 'Outcome must be completed or no_show.' using errcode = '22023';
    end if;
    select appointment.clinic_id, appointment.status, appointment.end_at
      into v_clinic_id, v_status, v_end_at
      from public.appointments appointment
     where appointment.id = p_appointment_id
     for update;
    if not found then
        raise exception 'Appointment was not found.' using errcode = 'P0002';
    end if;
    if not (private.is_clinic_member(v_clinic_id) or private.is_platform_admin()) then
        raise exception 'Only clinic staff can update appointment outcomes.' using errcode = '42501';
    end if;
    if v_status not in ('booked', 'confirmed') or v_end_at > now() then
        raise exception 'Only completed appointment times can be marked completed or no_show.'
            using errcode = 'P0001';
    end if;
    update public.appointments set status = p_outcome where id = p_appointment_id;
    return true;
end;
$$;

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
stable
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

create or replace function public.leave_waitlist(p_waitlist_entry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.waitlist_entries entry
       set status = 'removed'
     where entry.id = p_waitlist_entry_id
       and entry.status in ('waiting', 'offered')
       and private.is_patient_owner(entry.patient_id);
    if not found then
        raise exception 'Waitlist entry not found or cannot be removed.' using errcode = 'P0001';
    end if;
    return true;
end;
$$;

create or replace function public.audit_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_action_type text;
begin
    if tg_op = 'INSERT' then
        v_action_type := 'appointment_created';
    elsif old.checked_in_at is distinct from new.checked_in_at then
        v_action_type := 'appointment_checked_in';
    elsif old.status is distinct from new.status and new.status = 'cancelled' then
        v_action_type := 'appointment_cancelled';
    elsif old.status is distinct from new.status and new.status = 'no_show' then
        v_action_type := 'appointment_marked_no_show';
    elsif old.status is distinct from new.status and new.status = 'completed' then
        v_action_type := 'appointment_completed';
    elsif old.start_at is distinct from new.start_at or old.end_at is distinct from new.end_at then
        v_action_type := 'appointment_rescheduled';
    else
        v_action_type := 'appointment_updated';
    end if;
    insert into public.audit_logs (actor_id, action_type, entity_type, entity_id)
    values ((select auth.uid()), v_action_type, 'appointment', new.id);
    return new;
end;
$$;

create or replace function public.notify_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_recipient_id uuid;
    v_clinic_name text;
    v_notification_type text;
    v_title text;
    v_message text;
    v_waitlist_patient_id uuid;
    v_waitlist_user_id uuid;
begin
    if tg_op = 'INSERT' then
        v_notification_type := 'booking';
        v_title := 'Appointment booked';
        v_message := 'Your appointment has been booked. Sign in to review the time and clinic.';
    elsif old.status is distinct from new.status and new.status = 'cancelled' then
        v_notification_type := 'cancellation';
        v_title := 'Appointment cancelled';
        v_message := 'Your appointment was cancelled. Sign in to review your schedule.';
    elsif old.start_at is distinct from new.start_at or old.staff_id is distinct from new.staff_id then
        v_notification_type := 'reschedule';
        v_title := 'Appointment changed';
        v_message := 'Your appointment time was changed. Sign in to review your schedule.';
    else
        return new;
    end if;

    select patient.user_id into v_recipient_id
      from public.patient_profiles patient
     where patient.id = new.patient_id;
    select clinic.name into v_clinic_name
      from public.clinics clinic where clinic.id = new.clinic_id;

    if v_recipient_id is not null then
        insert into public.notifications (recipient_id, appointment_id, title, message, notification_type)
        values (v_recipient_id, new.id, v_title, v_message, v_notification_type);
    end if;

    if tg_op = 'UPDATE' and new.status = 'cancelled' then
        update public.waitlist_entries entry
           set status = 'offered'
         where entry.id = (
             select candidate.id
               from public.waitlist_entries candidate
              where candidate.clinic_id = new.clinic_id
                and candidate.status = 'waiting'
                and (candidate.preferred_from is null or candidate.preferred_from <= new.start_at)
                and (candidate.preferred_until is null or candidate.preferred_until >= new.start_at)
              order by candidate.created_at
              for update skip locked
              limit 1
         )
        returning entry.patient_id into v_waitlist_patient_id;
        if found then
            select patient.user_id into v_waitlist_user_id
              from public.patient_profiles patient
             where patient.id = v_waitlist_patient_id;
            if v_waitlist_user_id is not null then
                insert into public.notifications (recipient_id, title, message, notification_type)
                values (
                    v_waitlist_user_id,
                    'Clinic appointment may be available',
                    'A time may have opened at ' || coalesce(v_clinic_name, 'your clinic') || '. Sign in to check availability.',
                    'waitlist'
                );
            end if;
        end if;
    end if;
    return new;
end;
$$;

create trigger appointments_notify_insert
after insert on public.appointments
for each row execute function public.notify_appointment_change();

create trigger appointments_notify_update
after update on public.appointments
for each row
when (
    old.status is distinct from new.status
    or old.start_at is distinct from new.start_at
    or old.staff_id is distinct from new.staff_id
)
execute function public.notify_appointment_change();

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
         where origin.postal_fsa is null
           and lower(origin.city) = lower(trim(p_location))
         order by origin.province limit 1;
        if not found then
            select avg(clinic.latitude), avg(clinic.longitude)
              into v_latitude, v_longitude
              from public.clinics clinic
             where clinic.is_active and clinic.latitude is not null
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
        where clinic.is_active and clinic.latitude is not null and clinic.longitude is not null
    ), filtered_clinics as (
        select clinic.* from clinic_distances clinic
        where clinic.raw_distance_km <= p_max_distance_km
          and (cardinality(coalesce(p_services, '{}'::text[])) = 0 or clinic.services && p_services)
          and (not p_accepting_new_patients or clinic.accepting_new_patients)
    ), candidate_dates as (
        select clinic.id as clinic_id, clinic.time_zone,
               clinic.appointment_duration_minutes,
               ((now() at time zone clinic.time_zone)::date + day_offsets.day_offset) as local_date
        from filtered_clinics clinic
        cross join generate_series(0, 60) as day_offsets(day_offset)
    ), schedule_windows as (
        select candidate.clinic_id, candidate.time_zone, candidate.local_date,
               candidate.appointment_duration_minutes, membership.staff_id,
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
                + slot_indices.slot_index * schedule_window.appointment_duration_minutes * interval '1 minute')
                at time zone schedule_window.time_zone) as slot_start,
            ((schedule_window.local_date + schedule_window.opens_at
                + (slot_indices.slot_index + 1) * schedule_window.appointment_duration_minutes * interval '1 minute')
                at time zone schedule_window.time_zone) as slot_end
        from schedule_windows schedule_window
        cross join lateral generate_series(
            0,
            floor(extract(epoch from (schedule_window.closes_at - schedule_window.opens_at))
                / (schedule_window.appointment_duration_minutes * 60))::integer - 1
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
                    && tstzrange(slot.slot_start, slot.slot_end, '[)')
          )
          and not exists (
              select 1 from public.schedule_blocks block
              where block.clinic_id = slot.clinic_id
                and (block.staff_id is null or block.staff_id = slot.staff_id)
                and tstzrange(block.starts_at, block.ends_at, '[)')
                    && tstzrange(slot.slot_start, slot.slot_end, '[)')
          )
        group by slot.clinic_id
    )
    select clinic.id, clinic.name, clinic.address, clinic.city, clinic.province,
           clinic.phone, clinic.description, clinic.time_zone, clinic.services,
           clinic.accepting_new_patients, round(clinic.raw_distance_km::numeric, 1),
           availability.next_available_at
    from filtered_clinics clinic
    left join next_availability availability on availability.clinic_id = clinic.id
    where not p_only_with_availability or availability.next_available_at is not null
    order by clinic.raw_distance_km, clinic.name;
end;
$$;

revoke all on function public.available_appointment_slots(uuid, date) from public, anon, authenticated;
grant execute on function public.available_appointment_slots(uuid, date) to authenticated;
revoke all on function public.book_appointment(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz) to authenticated;
revoke all on function public.cancel_appointment(uuid) from public, anon, authenticated;
grant execute on function public.cancel_appointment(uuid) to authenticated;
revoke all on function public.reschedule_appointment(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.reschedule_appointment(uuid, uuid, timestamptz) to authenticated;
revoke all on function public.check_in_appointment(uuid) from public, anon, authenticated;
grant execute on function public.check_in_appointment(uuid) to authenticated;
revoke all on function public.set_appointment_outcome(uuid, text) from public, anon, authenticated;
grant execute on function public.set_appointment_outcome(uuid, text) to authenticated;
revoke all on function public.list_clinic_appointments_for_day(uuid, date) from public, anon, authenticated;
grant execute on function public.list_clinic_appointments_for_day(uuid, date) to authenticated;
revoke all on function public.leave_waitlist(uuid) from public, anon, authenticated;
grant execute on function public.leave_waitlist(uuid) to authenticated;
revoke all on function public.search_clinics(text, integer, text[], boolean, boolean)
    from public, anon, authenticated;
grant execute on function public.search_clinics(text, integer, text[], boolean, boolean)
    to anon, authenticated;

create or replace function public.set_clinic_hours_for_day(
    p_clinic_id uuid,
    p_day_of_week smallint,
    p_opens_at time,
    p_closes_at time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not (private.is_platform_admin() or private.is_clinic_admin(p_clinic_id)) then
        raise exception 'Clinic administrator access is required.' using errcode = '42501';
    end if;
    if p_day_of_week not between 0 and 6 then
        raise exception 'Day of week must be between 0 and 6.' using errcode = '22023';
    end if;
    if (p_opens_at is null) <> (p_closes_at is null) then
        raise exception 'Provide both opening and closing times, or leave both blank to close.' using errcode = '22023';
    end if;
    if p_opens_at is not null and p_closes_at <= p_opens_at then
        raise exception 'Closing time must be later than opening time.' using errcode = '22023';
    end if;
    delete from public.clinic_hours
     where clinic_id = p_clinic_id and day_of_week = p_day_of_week;
    if p_opens_at is not null then
        insert into public.clinic_hours (clinic_id, day_of_week, opens_at, closes_at)
        values (p_clinic_id, p_day_of_week, p_opens_at, p_closes_at);
    end if;
end;
$$;

create or replace function public.set_my_staff_hours_for_day(
    p_membership_id uuid,
    p_day_of_week smallint,
    p_opens_at time,
    p_closes_at time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_staff_id uuid;
begin
    select membership.staff_id into v_staff_id
      from public.clinic_memberships membership
     where membership.id = p_membership_id and membership.is_active
       and exists (
           select 1 from public.staff_profiles staff
            where staff.id = membership.staff_id and staff.user_id = auth.uid()
       );
    if v_staff_id is null then
        raise exception 'Active staff membership was not found.' using errcode = '42501';
    end if;
    if p_day_of_week not between 0 and 6 then
        raise exception 'Day of week must be between 0 and 6.' using errcode = '22023';
    end if;
    if (p_opens_at is null) <> (p_closes_at is null) then
        raise exception 'Provide both working times, or leave both blank for an unavailable day.' using errcode = '22023';
    end if;
    if p_opens_at is not null and p_closes_at <= p_opens_at then
        raise exception 'Closing time must be later than opening time.' using errcode = '22023';
    end if;
    delete from public.staff_hours
     where membership_id = p_membership_id and day_of_week = p_day_of_week;
    if p_opens_at is not null then
        insert into public.staff_hours (membership_id, day_of_week, opens_at, closes_at)
        values (p_membership_id, p_day_of_week, p_opens_at, p_closes_at);
    end if;
end;
$$;

create or replace function public.set_clinic_appointment_duration(
    p_clinic_id uuid,
    p_duration_minutes integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not (private.is_platform_admin() or private.is_clinic_admin(p_clinic_id)) then
        raise exception 'Clinic administrator access is required.' using errcode = '42501';
    end if;
    if p_duration_minutes not between 15 and 120 or p_duration_minutes % 15 <> 0 then
        raise exception 'Appointment length must be 15 to 120 minutes in 15-minute increments.'
            using errcode = '22023';
    end if;
    update public.clinics
       set appointment_duration_minutes = p_duration_minutes
     where id = p_clinic_id and is_active;
    if not found then
        raise exception 'Active clinic was not found.' using errcode = 'P0002';
    end if;
end;
$$;

revoke all on function public.set_clinic_hours_for_day(uuid, smallint, time, time)
    from public, anon, authenticated;
grant execute on function public.set_clinic_hours_for_day(uuid, smallint, time, time)
    to authenticated;
revoke all on function public.set_my_staff_hours_for_day(uuid, smallint, time, time)
    from public, anon, authenticated;
grant execute on function public.set_my_staff_hours_for_day(uuid, smallint, time, time)
    to authenticated;
revoke all on function public.set_clinic_appointment_duration(uuid, integer)
    from public, anon, authenticated;
grant execute on function public.set_clinic_appointment_duration(uuid, integer)
    to authenticated;

comment on table public.schedule_blocks is
    'Clinic closures and staff unavailable periods used by booking and clinic search.';
