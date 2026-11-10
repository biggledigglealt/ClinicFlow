-- Make cancellation waitlist offers actionable while keeping booking validation
-- and overlap protection inside the database. Offer slots are not reserved.

alter table public.waitlist_entries
    add column offered_staff_id uuid references public.staff_profiles (id) on delete restrict,
    add column offered_start_at timestamptz,
    add column offered_end_at timestamptz,
    add column offer_expires_at timestamptz,
    add constraint waitlist_offer_time_pair_check
        check ((offered_start_at is null) = (offered_end_at is null)),
    add constraint waitlist_offer_range_check
        check (offered_end_at is null or offered_end_at > offered_start_at),
    add constraint waitlist_offer_staff_check
        check (offered_start_at is null or offered_staff_id is not null);

create index waitlist_offers_active_idx
    on public.waitlist_entries (clinic_id, offered_start_at, offer_expires_at)
    where status = 'offered';

drop policy "Clinic admins manage clinic blocks and staff manage own blocks"
    on public.schedule_blocks;
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
    created_by = (select auth.uid())
    and (
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
);

create or replace function public.notify_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_recipient_id uuid;
    v_clinic_name text;
    v_time_zone text;
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
    select clinic.name, clinic.time_zone into v_clinic_name, v_time_zone
      from public.clinics clinic where clinic.id = new.clinic_id;

    if v_recipient_id is not null then
        insert into public.notifications (recipient_id, appointment_id, title, message, notification_type)
        values (v_recipient_id, new.id, v_title, v_message, v_notification_type);
    end if;

    if tg_op = 'UPDATE' and new.status = 'cancelled' then
        update public.waitlist_entries entry
           set status = 'offered',
               offered_staff_id = new.staff_id,
               offered_start_at = new.start_at,
               offered_end_at = new.end_at,
               offer_expires_at = now() + interval '1 hour'
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
                    'A time may have opened at ' || coalesce(v_clinic_name, 'your clinic')
                        || ' on ' || to_char(new.start_at at time zone coalesce(v_time_zone, 'UTC'), 'Mon FMDD at HH12:MI AM')
                        || '. Sign in to accept or check availability.',
                    'waitlist'
                );
            end if;
        end if;
    end if;
    return new;
end;
$$;

create or replace function public.accept_waitlist_offer(p_waitlist_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_patient_id uuid;
    v_clinic_id uuid;
    v_staff_id uuid;
    v_start_at timestamptz;
    v_expires_at timestamptz;
    v_status text;
    v_appointment_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Authentication is required.' using errcode = '42501';
    end if;

    select entry.patient_id, entry.clinic_id, entry.offered_staff_id,
           entry.offered_start_at, entry.offer_expires_at, entry.status
      into v_patient_id, v_clinic_id, v_staff_id, v_start_at, v_expires_at, v_status
      from public.waitlist_entries entry
     where entry.id = p_waitlist_entry_id
     for update;

    if not found or not private.is_patient_owner(v_patient_id) then
        raise exception 'Waitlist offer was not found.' using errcode = 'P0002';
    end if;
    if v_status <> 'offered' or v_staff_id is null or v_start_at is null then
        raise exception 'This waitlist entry has no active appointment offer.' using errcode = 'P0001';
    end if;
    if v_expires_at is null or v_expires_at <= now() then
        raise exception 'This appointment offer has expired.' using errcode = 'P0001';
    end if;

    -- The standard booking function rechecks availability and relies on the
    -- appointment exclusion constraints to reject a competing booking.
    v_appointment_id := public.book_appointment(v_clinic_id, v_staff_id, v_start_at);

    update public.waitlist_entries
       set status = 'accepted'
     where id = p_waitlist_entry_id;
    return v_appointment_id;
end;
$$;

create or replace function public.audit_nonclinical_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_entity_id uuid;
    v_action text;
begin
    if tg_op = 'DELETE' then
        v_entity_id := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'user_id')::uuid;
        v_action := lower(tg_table_name) || '_deleted';
    elsif tg_op = 'INSERT' then
        v_entity_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'user_id')::uuid;
        v_action := lower(tg_table_name) || '_created';
    else
        v_entity_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'user_id')::uuid;
        v_action := lower(tg_table_name) || '_updated';
    end if;

    insert into public.audit_logs (actor_id, action_type, entity_type, entity_id)
    values ((select auth.uid()), v_action, lower(tg_table_name), v_entity_id);

    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

create trigger patient_profiles_audit_change
after insert or update or delete on public.patient_profiles
for each row execute function public.audit_nonclinical_change();

create trigger clinic_memberships_audit_change
after insert or update or delete on public.clinic_memberships
for each row execute function public.audit_nonclinical_change();

create trigger schedule_blocks_audit_change
after insert or update or delete on public.schedule_blocks
for each row execute function public.audit_nonclinical_change();

create trigger clinic_hours_audit_change
after insert or update or delete on public.clinic_hours
for each row execute function public.audit_nonclinical_change();

create trigger staff_hours_audit_change
after insert or update or delete on public.staff_hours
for each row execute function public.audit_nonclinical_change();

create trigger announcements_audit_change
after insert or update or delete on public.announcements
for each row execute function public.audit_nonclinical_change();

create trigger waitlist_entries_audit_change
after insert or update or delete on public.waitlist_entries
for each row execute function public.audit_nonclinical_change();

create trigger accessibility_preferences_audit_change
after insert or update or delete on public.accessibility_preferences
for each row execute function public.audit_nonclinical_change();

revoke all on function public.accept_waitlist_offer(uuid) from public, anon, authenticated;
grant execute on function public.accept_waitlist_offer(uuid) to authenticated;
revoke all on function public.audit_nonclinical_change() from public, anon, authenticated;

