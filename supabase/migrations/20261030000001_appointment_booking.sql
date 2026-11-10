-- Appointment booking is performed through these functions so the database can
-- validate availability and insert the booking in one transaction.
-- The prototype uses fixed 30-minute appointment slots.

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
begin
    if v_user_id is null then
        raise exception 'Authentication is required to view appointment availability.'
            using errcode = '42501';
    end if;

    select pp.id
      into v_patient_id
      from public.patient_profiles pp
     where pp.user_id = v_user_id;

    if v_patient_id is null then
        return;
    end if;

    select c.time_zone
      into v_time_zone
      from public.clinics c
     where c.id = p_clinic_id
       and c.is_active;

    if not found then
        return;
    end if;

    return query
    with schedule_windows as (
        select
            sp.id as staff_uuid,
            sp.first_name as staff_given_name,
            sp.last_name as staff_family_name,
            sp.job_title as staff_title,
            greatest(ch.opens_at, sh.opens_at) as window_opens_at,
            least(ch.closes_at, sh.closes_at) as window_closes_at
        from public.clinic_memberships cm
        join public.staff_profiles sp on sp.id = cm.staff_id
        join public.clinic_hours ch
          on ch.clinic_id = cm.clinic_id
         and ch.day_of_week = extract(dow from p_date)::smallint
        join public.staff_hours sh
          on sh.membership_id = cm.id
         and sh.day_of_week = extract(dow from p_date)::smallint
        where cm.clinic_id = p_clinic_id
          and cm.is_active
          and greatest(ch.opens_at, sh.opens_at) < least(ch.closes_at, sh.closes_at)
    ), candidates as (
        select
            sw.staff_uuid,
            sw.staff_given_name,
            sw.staff_family_name,
            sw.staff_title,
            (p_date + sw.window_opens_at
                + offsets.slot_index * interval '30 minutes') at time zone v_time_zone as slot_start_at,
            (p_date + sw.window_opens_at
                + (offsets.slot_index + 1) * interval '30 minutes') at time zone v_time_zone as slot_end_at
        from schedule_windows sw
        cross join lateral generate_series(
            0,
            floor(extract(epoch from (sw.window_closes_at - sw.window_opens_at)) / 1800)::integer - 1
        ) as offsets(slot_index)
    )
    select
        candidate.staff_uuid,
        candidate.staff_given_name,
        candidate.staff_family_name,
        candidate.staff_title,
        candidate.slot_start_at,
        candidate.slot_end_at
    from candidates candidate
    where candidate.slot_start_at > now()
      and not exists (
          select 1
          from public.appointments a
          where a.staff_id = candidate.staff_uuid
            and a.status in ('booked', 'confirmed')
            and tstzrange(a.start_at, a.end_at, '[)')
                && tstzrange(candidate.slot_start_at, candidate.slot_end_at, '[)')
      )
      and not exists (
          select 1
          from public.appointments a
          where a.patient_id = v_patient_id
            and a.status in ('booked', 'confirmed')
            and tstzrange(a.start_at, a.end_at, '[)')
                && tstzrange(candidate.slot_start_at, candidate.slot_end_at, '[)')
      )
    order by candidate.slot_start_at, candidate.staff_family_name, candidate.staff_given_name;
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
    v_local_date date;
    v_appointment_id uuid;
begin
    if v_user_id is null then
        raise exception 'Authentication is required to book an appointment.'
            using errcode = '42501';
    end if;

    select pp.id
      into v_patient_id
      from public.patient_profiles pp
     where pp.user_id = v_user_id;

    if v_patient_id is null then
        raise exception 'Complete your patient profile before booking.'
            using errcode = 'P0001';
    end if;

    select c.time_zone
      into v_time_zone
      from public.clinics c
     where c.id = p_clinic_id
       and c.is_active;

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
            patient_id,
            staff_id,
            clinic_id,
            start_at,
            end_at,
            status
        )
        values (
            v_patient_id,
            p_staff_id,
            p_clinic_id,
            p_start_at,
            p_start_at + interval '30 minutes',
            'booked'
        )
        returning id into v_appointment_id;
    exception
        when exclusion_violation then
            raise exception 'That appointment time was just booked. Refresh availability and choose another.'
                using errcode = 'P0001';
    end;

    return v_appointment_id;
end;
$$;

revoke all on function public.available_appointment_slots(uuid, date)
    from public, anon, authenticated;
revoke all on function public.book_appointment(uuid, uuid, timestamptz)
    from public, anon, authenticated;

grant execute on function public.available_appointment_slots(uuid, date)
    to authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz)
    to authenticated;
