-- Let people preview availability before they create a patient profile. Public
-- callers receive the times and opaque staff IDs needed to start booking, but
-- staff names and titles remain available only to signed-in callers.
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
    v_time_zone text;
    v_duration_minutes integer;
begin
    select clinic.time_zone, clinic.appointment_duration_minutes
      into v_time_zone, v_duration_minutes
      from public.clinics clinic
     where clinic.id = p_clinic_id
       and clinic.is_active
       and clinic.listing_status in ('demo', 'verified');

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
        case when auth.uid() is null then null else candidate.staff_given_name end,
        case when auth.uid() is null then null else candidate.staff_family_name end,
        case when auth.uid() is null then null else candidate.staff_title end,
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
          from public.schedule_blocks block
          where block.clinic_id = p_clinic_id
            and (block.staff_id is null or block.staff_id = candidate.staff_uuid)
            and tstzrange(block.starts_at, block.ends_at, '[)')
                && tstzrange(candidate.slot_start, candidate.slot_end, '[)')
      )
    order by candidate.slot_start, candidate.staff_family_name, candidate.staff_given_name;
end;
$$;

comment on function public.available_appointment_slots(uuid, date) is
    'Returns bookable availability for published clinics. Anonymous callers receive no staff names or titles.';

create or replace function public.available_appointment_days(
    p_clinic_id uuid,
    p_start_date date,
    p_end_date date
)
returns table (
    available_date date,
    available_slots integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if p_start_date is null
       or p_end_date is null
       or p_end_date < p_start_date
       or p_end_date > p_start_date + 61 then
        raise exception 'Choose an availability range of 62 days or fewer.'
            using errcode = '22023';
    end if;

    return query
    select (p_start_date + day_offset.value)::date,
           count(*)::integer
    from generate_series(0, p_end_date - p_start_date) as day_offset(value)
    cross join lateral public.available_appointment_slots(
        p_clinic_id,
        (p_start_date + day_offset.value)::date
    ) slot
    group by day_offset.value
    order by day_offset.value;
end;
$$;

comment on function public.available_appointment_days(uuid, date, date) is
    'Returns dates and slot counts for published clinic calendars, limited to a 62-day range.';

revoke all on function public.available_appointment_slots(uuid, date) from public, anon, authenticated;
grant execute on function public.available_appointment_slots(uuid, date) to anon, authenticated;
revoke all on function public.available_appointment_days(uuid, date, date) from public, anon, authenticated;
grant execute on function public.available_appointment_days(uuid, date, date) to anon, authenticated;
