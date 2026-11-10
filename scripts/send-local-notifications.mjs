import { spawnSync } from 'node:child_process'
import nodemailer from 'nodemailer'

function queryLocal(sql) {
  const result = spawnSync('docker', [
    'exec', '-i', 'supabase_db_clinicflow', 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-c', sql,
  ], { encoding: 'utf8', windowsHide: true })
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? 'Could not query the local Supabase database.')
  }
  return result.stdout.trim()
}

function sqlId(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Database returned an invalid outbox row id.')
  }
  return `'${value}'::uuid`
}

const claimSql = `
with due as (
  select id from public.notification_email_outbox
   where attempt_count < 5
     and (
       (status = 'queued' and scheduled_at <= now())
       or (status = 'sending' and (claimed_at is null or claimed_at <= now() - interval '15 minutes'))
     )
   order by scheduled_at, created_at
   for update skip locked
   limit 20
), claimed as (
  update public.notification_email_outbox job
     set status = 'sending', attempt_count = attempt_count + 1, claimed_at = now()
    from due
   where job.id = due.id
  returning job.id, job.recipient_id, job.event_type, job.attempt_count,
            (select account.email from auth.users account where account.id = job.recipient_id) as recipient_email
)
select coalesce(json_agg(claimed), '[]'::json) from claimed;
`

let claimed
try {
  queryLocal(`update public.notification_email_outbox
    set status = 'failed', claimed_at = null, last_error_code = 'worker_claim_expired'
    where status = 'sending' and attempt_count >= 5
      and (claimed_at is null or claimed_at <= now() - interval '15 minutes');`)
  const output = queryLocal(claimSql)
  claimed = output ? JSON.parse(output) : []
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not claim local email jobs.')
  process.exit(1)
}

if (claimed.length === 0) {
  console.log('No due local email notifications.')
  process.exit(0)
}

const mailer = nodemailer.createTransport({ host: '127.0.0.1', port: 54325, secure: false })
const content = {
  confirmation: ['ClinicFlow appointment confirmation', 'An appointment was booked on your ClinicFlow account. Sign in to review the details.'],
  reminder_24h: ['ClinicFlow appointment reminder', 'You have an upcoming appointment in about 24 hours. Sign in to review the details.'],
  cancellation: ['ClinicFlow appointment update', 'An appointment on your ClinicFlow account was cancelled. Sign in to review your schedule.'],
  reschedule: ['ClinicFlow appointment update', 'An appointment on your ClinicFlow account was changed. Sign in to review your schedule.'],
}

for (const job of claimed) {
  if (!job.recipient_email) {
    queryLocal(`update public.notification_email_outbox set status = 'failed', claimed_at = null, last_error_code = 'recipient_email_missing' where id = ${sqlId(job.id)};`)
    console.error(`Skipped local outbox item ${job.id}: account email is missing.`)
    continue
  }
  try {
    const [subject, text] = content[job.event_type] ?? ['ClinicFlow update', 'There is an update on your ClinicFlow account. Sign in to review it.']
    await mailer.sendMail({
      from: 'ClinicFlow Local <no-reply@clinicflow.local>',
      to: job.recipient_email,
      subject,
      text,
    })
    queryLocal(`update public.notification_email_outbox set status = 'sent', claimed_at = null, sent_at = now(), last_error_code = null where id = ${sqlId(job.id)};`)
    console.log(`Captured ${job.event_type} email in local Mailpit (${job.id}).`)
  } catch {
    const retryMinutes = Math.min(60, Number(job.attempt_count) * 5)
    queryLocal(`update public.notification_email_outbox set status = case when attempt_count >= 5 then 'failed' else 'queued' end, claimed_at = null, scheduled_at = now() + interval '${retryMinutes} minutes', last_error_code = 'local_smtp_send_failed' where id = ${sqlId(job.id)};`)
    console.error(`Local email delivery failed for outbox item ${job.id}; retry scheduled when available.`)
  }
}
