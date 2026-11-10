-- Recover jobs left in `sending` if a local or future server-side worker exits
-- before it can record the delivery result.
alter table public.notification_email_outbox
    add column claimed_at timestamptz;

comment on column public.notification_email_outbox.claimed_at is
    'Time a worker claimed this job; claims older than 15 minutes may be retried.';
