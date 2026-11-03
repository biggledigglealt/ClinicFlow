create or replace function public.set_clinic_hours_intervals_for_day(
    p_clinic_id uuid,
    p_day_of_week smallint,
    p_intervals jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_interval record;
begin
    if not (private.is_platform_admin() or private.is_clinic_admin(p_clinic_id)) then
        raise exception 'Clinic administrator access is required.' using errcode = '42501';
    end if;
    if p_day_of_week not between 0 and 6 then
        raise exception 'Day of week must be between 0 and 6.' using errcode = '22023';
    end if;
    if p_intervals is null or jsonb_typeof(p_intervals) <> 'array'
       or jsonb_array_length(p_intervals) > 12 then
        raise exception 'Provide an array of at most 12 daily time intervals.' using errcode = '22023';
    end if;

    for v_interval in
        select item.opens_at, item.closes_at
          from jsonb_to_recordset(p_intervals) as item(opens_at time, closes_at time)
         order by item.opens_at
    loop
        if v_interval.opens_at is null or v_interval.closes_at is null
           or v_interval.closes_at <= v_interval.opens_at then
            raise exception 'Each interval needs a start time before its end time.' using errcode = '22023';
        end if;
    end loop;

    if exists (
        select 1
          from (
              select item.opens_at,
                     lag(item.closes_at) over (order by item.opens_at) as previous_closes_at
                from jsonb_to_recordset(p_intervals) as item(opens_at time, closes_at time)
          ) ordered_intervals
         where ordered_intervals.previous_closes_at > ordered_intervals.opens_at
    ) then
        raise exception 'Schedule intervals cannot overlap.' using errcode = '22023';
    end if;

    delete from public.clinic_hours
     where clinic_id = p_clinic_id and day_of_week = p_day_of_week;

    insert into public.clinic_hours (clinic_id, day_of_week, opens_at, closes_at)
    select p_clinic_id, p_day_of_week, item.opens_at, item.closes_at
      from jsonb_to_recordset(p_intervals) as item(opens_at time, closes_at time)
     order by item.opens_at;
end;
$$;

create or replace function public.set_staff_hours_intervals_for_day(
    p_membership_id uuid,
    p_day_of_week smallint,
    p_intervals jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_staff_id uuid;
    v_interval record;
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
    if p_intervals is null or jsonb_typeof(p_intervals) <> 'array'
       or jsonb_array_length(p_intervals) > 12 then
        raise exception 'Provide an array of at most 12 daily time intervals.' using errcode = '22023';
    end if;

    for v_interval in
        select item.opens_at, item.closes_at
          from jsonb_to_recordset(p_intervals) as item(opens_at time, closes_at time)
         order by item.opens_at
    loop
        if v_interval.opens_at is null or v_interval.closes_at is null
           or v_interval.closes_at <= v_interval.opens_at then
            raise exception 'Each interval needs a start time before its end time.' using errcode = '22023';
        end if;
    end loop;

    if exists (
        select 1
          from (
              select item.opens_at,
                     lag(item.closes_at) over (order by item.opens_at) as previous_closes_at
                from jsonb_to_recordset(p_intervals) as item(opens_at time, closes_at time)
          ) ordered_intervals
         where ordered_intervals.previous_closes_at > ordered_intervals.opens_at
    ) then
        raise exception 'Schedule intervals cannot overlap.' using errcode = '22023';
    end if;

    delete from public.staff_hours
     where membership_id = p_membership_id and day_of_week = p_day_of_week;

    insert into public.staff_hours (membership_id, day_of_week, opens_at, closes_at)
    select p_membership_id, p_day_of_week, item.opens_at, item.closes_at
      from jsonb_to_recordset(p_intervals) as item(opens_at time, closes_at time)
     order by item.opens_at;
end;
$$;

revoke all on function public.set_clinic_hours_intervals_for_day(uuid, smallint, jsonb)
    from public, anon, authenticated;
grant execute on function public.set_clinic_hours_intervals_for_day(uuid, smallint, jsonb)
    to authenticated;
revoke all on function public.set_staff_hours_intervals_for_day(uuid, smallint, jsonb)
    from public, anon, authenticated;
grant execute on function public.set_staff_hours_intervals_for_day(uuid, smallint, jsonb)
    to authenticated;
