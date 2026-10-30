-- ClinicFlow's initial Supabase schema.
-- Scope: administrative scheduling and clinic operations. Use synthetic data only.

create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text,
    global_role text not null default 'patient'
        check (global_role in ('patient', 'platform_admin')),
    preferred_language text not null default 'en'
        check (preferred_language in ('en', 'fr')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.clinics (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text not null,
    city text,
    province text,
    postal_code text,
    phone text,
    email text,
    description text,
    time_zone text not null default 'America/Toronto',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.patient_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.profiles (id) on delete cascade,
    first_name text not null,
    last_name text not null,
    phone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.staff_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.profiles (id) on delete cascade,
    first_name text not null,
    last_name text not null,
    job_title text,
    created_at timestamptz not null default now()
);

create table public.clinic_memberships (
    id uuid primary key default gen_random_uuid(),
    clinic_id uuid not null references public.clinics (id) on delete restrict,
    staff_id uuid not null references public.staff_profiles (id) on delete restrict,
    role text not null default 'staff' check (role in ('staff', 'admin')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (clinic_id, staff_id)
);

-- Multiple intervals allow for a clinic to close for lunch or operate split shifts.
create table public.clinic_hours (
    id uuid primary key default gen_random_uuid(),
    clinic_id uuid not null references public.clinics (id) on delete cascade,
    day_of_week smallint not null check (day_of_week between 0 and 6),
    opens_at time not null,
    closes_at time not null,
    check (closes_at > opens_at),
    exclude using gist (
        clinic_id with =,
        day_of_week with =,
        tsrange(
            date '2000-01-03' + opens_at,
            date '2000-01-03' + closes_at,
            '[)'
        ) with &&
    )
);

-- Staff schedules are separate from clinic opening hours. No row means unavailable.
create table public.staff_hours (
    id uuid primary key default gen_random_uuid(),
    membership_id uuid not null references public.clinic_memberships (id) on delete cascade,
    day_of_week smallint not null check (day_of_week between 0 and 6),
    opens_at time not null,
    closes_at time not null,
    check (closes_at > opens_at),
    exclude using gist (
        membership_id with =,
        day_of_week with =,
        tsrange(
            date '2000-01-03' + opens_at,
            date '2000-01-03' + closes_at,
            '[)'
        ) with &&
    )
);

create table public.appointments (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patient_profiles (id) on delete restrict,
    staff_id uuid not null references public.staff_profiles (id) on delete restrict,
    clinic_id uuid not null references public.clinics (id) on delete restrict,
    start_at timestamptz not null,
    end_at timestamptz not null,
    status text not null default 'booked'
        check (status in ('pending', 'booked', 'confirmed', 'cancelled', 'completed', 'no_show')),
    checked_in_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (end_at > start_at),
    foreign key (clinic_id, staff_id)
        references public.clinic_memberships (clinic_id, staff_id) on delete restrict,
    exclude using gist (
        staff_id with =,
        tstzrange(start_at, end_at, '[)') with &&
    ) where (status in ('booked', 'confirmed')),
    exclude using gist (
        patient_id with =,
        tstzrange(start_at, end_at, '[)') with &&
    ) where (status in ('booked', 'confirmed'))
);

create index appointments_clinic_start_idx on public.appointments (clinic_id, start_at);
create index appointments_patient_start_idx on public.appointments (patient_id, start_at);
create index appointments_staff_start_idx on public.appointments (staff_id, start_at);

create table public.waitlist_entries (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patient_profiles (id) on delete cascade,
    clinic_id uuid not null references public.clinics (id) on delete cascade,
    preferred_from timestamptz,
    preferred_until timestamptz,
    status text not null default 'waiting'
        check (status in ('waiting', 'offered', 'accepted', 'removed', 'expired')),
    created_at timestamptz not null default now(),
    check (
        preferred_from is null
        or preferred_until is null
        or preferred_until > preferred_from
    )
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles (id) on delete cascade,
    appointment_id uuid references public.appointments (id) on delete set null,
    title text not null,
    message text not null,
    notification_type text not null
        check (notification_type in (
            'booking', 'cancellation', 'reschedule', 'reminder',
            'waitlist', 'announcement', 'system'
        )),
    read_at timestamptz,
    scheduled_at timestamptz,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
    on public.notifications (recipient_id, created_at desc);

create table public.announcements (
    id uuid primary key default gen_random_uuid(),
    clinic_id uuid not null references public.clinics (id) on delete cascade,
    created_by uuid references public.profiles (id) on delete set null,
    title text not null,
    message text not null,
    published_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    check (expires_at is null or published_at is null or expires_at > published_at)
);

create table public.accessibility_preferences (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    language text not null default 'en' check (language in ('en', 'fr')),
    text_size text not null default 'medium'
        check (text_size in ('small', 'medium', 'large', 'extra_large')),
    high_contrast boolean not null default false,
    text_to_speech boolean not null default false,
    updated_at timestamptz not null default now()
);

create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references auth.users (id) on delete set null,
    action_type text not null,
    entity_type text not null,
    entity_id uuid,
    outcome text not null default 'success' check (outcome in ('success', 'failure')),
    created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger patient_profiles_set_updated_at
before update on public.patient_profiles
for each row execute function public.set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, email, global_role)
    values (new.id, new.email, 'patient');
    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.global_role = 'platform_admin'
    );
$$;

create function private.is_clinic_member(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.clinic_memberships cm
        join public.staff_profiles sp on sp.id = cm.staff_id
        where cm.clinic_id = target_clinic
          and sp.user_id = (select auth.uid())
          and cm.is_active
    );
$$;

create function private.is_clinic_admin(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.clinic_memberships cm
        join public.staff_profiles sp on sp.id = cm.staff_id
        where cm.clinic_id = target_clinic
          and sp.user_id = (select auth.uid())
          and cm.role = 'admin'
          and cm.is_active
    );
$$;

create function private.is_patient_owner(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.patient_profiles pp
        where pp.id = target_patient
          and pp.user_id = (select auth.uid())
    );
$$;

create function private.is_active_clinic_staff(target_staff uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.clinic_memberships cm
        join public.clinics c on c.id = cm.clinic_id
        where cm.staff_id = target_staff
          and cm.is_active
          and c.is_active
    );
$$;

create function public.audit_appointment_change()
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

create trigger appointments_audit_insert
after insert on public.appointments
for each row execute function public.audit_appointment_change();

create trigger appointments_audit_update
after update on public.appointments
for each row
when (
    old.status is distinct from new.status
    or old.start_at is distinct from new.start_at
    or old.end_at is distinct from new.end_at
    or old.checked_in_at is distinct from new.checked_in_at
)
execute function public.audit_appointment_change();

alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.clinic_memberships enable row level security;
alter table public.clinic_hours enable row level security;
alter table public.staff_hours enable row level security;
alter table public.appointments enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.accessibility_preferences enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users view own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Anyone can view active clinics"
on public.clinics for select to anon, authenticated
using (is_active);

create policy "Clinic admins update clinics"
on public.clinics for update to authenticated
using (private.is_platform_admin() or private.is_clinic_admin(id))
with check (private.is_platform_admin() or private.is_clinic_admin(id));

create policy "Patients view own patient profile"
on public.patient_profiles for select to authenticated
using (user_id = (select auth.uid()));

create policy "Clinic staff view patients with an appointment"
on public.patient_profiles for select to authenticated
using (
    exists (
        select 1
        from public.appointments a
        where a.patient_id = patient_profiles.id
          and private.is_clinic_member(a.clinic_id)
    )
);

create policy "Patients create own patient profile"
on public.patient_profiles for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Patients update own patient profile"
on public.patient_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users view own staff profile and active clinic staff directory"
on public.staff_profiles for select to authenticated
using (
    user_id = (select auth.uid())
    or private.is_active_clinic_staff(id)
);

create policy "Staff view own memberships and clinic admins view clinic memberships"
on public.clinic_memberships for select to authenticated
using (
    exists (
        select 1 from public.staff_profiles sp
        where sp.id = staff_id and sp.user_id = (select auth.uid())
    )
    or private.is_platform_admin()
    or private.is_clinic_admin(clinic_id)
);

create policy "Anyone can view hours for active clinics"
on public.clinic_hours for select to anon, authenticated
using (exists (
    select 1 from public.clinics c
    where c.id = clinic_id and c.is_active
));

create policy "Clinic admins manage clinic hours"
on public.clinic_hours for all to authenticated
using (private.is_platform_admin() or private.is_clinic_admin(clinic_id))
with check (private.is_platform_admin() or private.is_clinic_admin(clinic_id));

create policy "Staff view own hours and clinic admins manage staff hours"
on public.staff_hours for select to authenticated
using (
    exists (
        select 1
        from public.clinic_memberships cm
        join public.staff_profiles sp on sp.id = cm.staff_id
        where cm.id = membership_id
          and sp.user_id = (select auth.uid())
    )
    or exists (
        select 1 from public.clinic_memberships cm
        where cm.id = membership_id
          and (private.is_platform_admin() or private.is_clinic_admin(cm.clinic_id))
    )
);

create policy "Clinic admins manage staff hours"
on public.staff_hours for all to authenticated
using (exists (
    select 1 from public.clinic_memberships cm
    where cm.id = membership_id
      and (private.is_platform_admin() or private.is_clinic_admin(cm.clinic_id))
))
with check (exists (
    select 1 from public.clinic_memberships cm
    where cm.id = membership_id
      and (private.is_platform_admin() or private.is_clinic_admin(cm.clinic_id))
));

create policy "Patients and clinic staff view authorized appointments"
on public.appointments for select to authenticated
using (
    private.is_patient_owner(patient_id)
    or private.is_platform_admin()
    or private.is_clinic_member(clinic_id)
);

-- Appointment creation, rescheduling, cancellation and check-in must be exposed through
-- validated database functions. No direct client write policies are created here.

create policy "Patients and clinic staff view authorized waitlist entries"
on public.waitlist_entries for select to authenticated
using (
    private.is_patient_owner(patient_id)
    or private.is_platform_admin()
    or private.is_clinic_member(clinic_id)
);

create policy "Patients join own waitlist at an active clinic"
on public.waitlist_entries for insert to authenticated
with check (
    status = 'waiting'
    and
    private.is_patient_owner(patient_id)
    and exists (
        select 1 from public.clinics c
        where c.id = clinic_id and c.is_active
    )
);

create policy "Users view own notifications"
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy "Users mark own notifications read"
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create policy "Users view published announcements at active clinics"
on public.announcements for select to authenticated
using (
    published_at is not null
    and (expires_at is null or expires_at > now())
    and exists (
        select 1 from public.clinics c
        where c.id = clinic_id and c.is_active
    )
);

create policy "Clinic admins manage announcements"
on public.announcements for all to authenticated
using (private.is_platform_admin() or private.is_clinic_admin(clinic_id))
with check (private.is_platform_admin() or private.is_clinic_admin(clinic_id));

create policy "Users manage own accessibility preferences"
on public.accessibility_preferences for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Platform admins view audit logs"
on public.audit_logs for select to authenticated
using (private.is_platform_admin());

-- Explicit table grants keep SQL privileges aligned with RLS, including projects that
-- automatically expose new public tables through default privileges.
revoke all on public.profiles, public.clinics, public.patient_profiles,
    public.staff_profiles, public.clinic_memberships, public.clinic_hours,
    public.staff_hours, public.appointments, public.waitlist_entries,
    public.notifications, public.announcements, public.accessibility_preferences,
    public.audit_logs from anon, authenticated;

grant select on public.clinics, public.clinic_hours to anon, authenticated;
grant select on public.profiles, public.staff_profiles, public.clinic_memberships,
    public.staff_hours, public.appointments, public.waitlist_entries,
    public.notifications, public.announcements, public.audit_logs to authenticated;
grant select, insert, update on public.patient_profiles to authenticated;
grant update on public.clinics, public.clinic_hours, public.staff_hours,
    public.announcements to authenticated;
grant insert, update, delete on public.clinic_hours, public.staff_hours,
    public.announcements to authenticated;
grant insert, select, update, delete on public.accessibility_preferences to authenticated;
grant insert on public.waitlist_entries to authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.audit_appointment_change() from public, anon, authenticated;
revoke all on function private.is_platform_admin() from public, anon, authenticated;
revoke all on function private.is_clinic_member(uuid) from public, anon, authenticated;
revoke all on function private.is_clinic_admin(uuid) from public, anon, authenticated;
revoke all on function private.is_patient_owner(uuid) from public, anon, authenticated;
revoke all on function private.is_active_clinic_staff(uuid) from public, anon, authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_clinic_member(uuid) to authenticated;
grant execute on function private.is_clinic_admin(uuid) to authenticated;
grant execute on function private.is_patient_owner(uuid) to authenticated;
grant execute on function private.is_active_clinic_staff(uuid) to authenticated;

reset search_path;
