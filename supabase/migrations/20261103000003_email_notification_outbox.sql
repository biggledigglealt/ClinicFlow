create table public.notification_email_outbox (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles (id) on delete cascade,
    appointment_id uuid references public.appointments (id) on delete set null,
    event_type text not null check (event_type in ('confirmation', 'reminder_24h', 'cancellation', 'reschedule')),
    scheduled_at timestamptz not null default now(),
    idempotency_key text not null unique,
    status text not null default 'queued'
        check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
    attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
    last_error_code text,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index notification_email_outbox_due_idx
    on public.notification_email_outbox (scheduled_at, created_at)
    where status = 'queued';

alter table public.notification_email_outbox enable row level security;
revoke all on public.notification_email_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.notification_email_outbox to service_role;

comment on table public.notification_email_outbox is
    'Private email delivery queue. It stores account and appointment identifiers, not email addresses or message bodies.';

create or replace function public.enqueue_appointment_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_recipient_id uuid;
begin
    select patient.user_id into v_recipient_id
      from public.patient_profiles patient
     where patient.id = new.patient_id;
    if v_recipient_id is null then
        return new;
    end if;

    if tg_op = 'INSERT' then
        insert into public.notification_email_outbox (
            recipient_id, appointment_id, event_type, scheduled_at, idempotency_key
        ) values (
            v_recipient_id, new.id, 'confirmation', now(), 'appointment:' || new.id::text || ':confirmation'
        ) on conflict (idempotency_key) do nothing;
        if new.start_at > now() + interval '24 hours' then
            insert into public.notification_email_outbox (
                recipient_id, appointment_id, event_type, scheduled_at, idempotency_key
            ) values (
                v_recipient_id, new.id, 'reminder_24h', new.start_at - interval '24 hours',
                'appointment:' || new.id::text || ':reminder:' || extract(epoch from new.start_at)::bigint::text
            ) on conflict (idempotency_key) do nothing;
        end if;
    elsif old.status is distinct from new.status and new.status = 'cancelled' then
        update public.notification_email_outbox
           set status = 'cancelled'
         where appointment_id = new.id and event_type = 'reminder_24h' and status = 'queued';
        insert into public.notification_email_outbox (
            recipient_id, appointment_id, event_type, scheduled_at, idempotency_key
        ) values (
            v_recipient_id, new.id, 'cancellation', now(), 'appointment:' || new.id::text || ':cancellation'
        ) on conflict (idempotency_key) do nothing;
    elsif old.start_at is distinct from new.start_at or old.staff_id is distinct from new.staff_id then
        update public.notification_email_outbox
           set status = 'cancelled'
         where appointment_id = new.id and event_type = 'reminder_24h' and status = 'queued';
        insert into public.notification_email_outbox (
            recipient_id, appointment_id, event_type, scheduled_at, idempotency_key
        ) values (
            v_recipient_id, new.id, 'reschedule', now(),
            'appointment:' || new.id::text || ':reschedule:' || extract(epoch from new.start_at)::bigint::text
        ) on conflict (idempotency_key) do nothing;
        if new.status in ('booked', 'confirmed') and new.start_at > now() + interval '24 hours' then
            insert into public.notification_email_outbox (
                recipient_id, appointment_id, event_type, scheduled_at, idempotency_key
            ) values (
                v_recipient_id, new.id, 'reminder_24h', new.start_at - interval '24 hours',
                'appointment:' || new.id::text || ':reminder:' || extract(epoch from new.start_at)::bigint::text
            ) on conflict (idempotency_key) do nothing;
        end if;
    end if;
    return new;
end;
$$;

create trigger appointments_enqueue_email
after insert or update of status, start_at, staff_id on public.appointments
for each row execute function public.enqueue_appointment_email();

revoke all on function public.enqueue_appointment_email() from public, anon, authenticated;
