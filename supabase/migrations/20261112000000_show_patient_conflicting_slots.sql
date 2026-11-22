-- Return clinic/staff availability even when this patient has an overlapping
-- appointment elsewhere. The calendar labels that slot as a patient conflict;
-- book_appointment and the patient overlap exclusion constraint still reject it.
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
    'Returns clinic and staff availability. Patient appointment overlaps remain visible for UI conflict labeling; booking rejects overlaps.';
