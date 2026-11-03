# Notification delivery plan

## Current implementation

Appointment events create generic in-app notices and private email outbox jobs. The outbox queues a booking confirmation, cancellation or reschedule update, and a reminder scheduled for 24 hours before an appointment when the booking is made more than 24 hours in advance. Rescheduling cancels the previous queued reminder and creates one for the new time. Idempotency keys prevent duplicate queue rows. The worker retries delivery up to five times and records only a generic error code. A 15-minute claim lease makes a stale `sending` job eligible for a later retry after worker interruption.

Outbox rows contain the recipient account ID and appointment ID, not an email address or message body. Patient-facing mail contains no appointment time, clinic, or patient name; it asks the account holder to sign in. Patient emails and appointment details are not written to application logs.

## Provider comparison

No live provider has been selected. Compare these candidates before configuring hosted delivery:

| Candidate | Useful fit | Review before selection |
| --- | --- | --- |
| Resend | Transactional email API and a small integration surface | Data processing terms, region choices, domain setup, account controls, delivery logs, rate limits, and cost at expected volume |
| SendGrid | Established transactional email tooling and delivery controls | Data processing terms, data location, suppression handling, account security, rate limits, and cost at expected volume |
| Amazon SES | Transactional sending within an AWS environment | AWS account and IAM setup, sandbox exit, region selection, bounce handling, operational monitoring, and cost at expected volume |

Pricing and regional terms change; confirm them directly during the deployment review. Select a provider only after the team checks its data processing terms, Canadian privacy requirements, account access, domain verification, retention, bounce handling, rate limits, and total cost. No API key or production email destination belongs in the client or source control.

## Local test

Local Supabase exposes Mailpit at `http://127.0.0.1:54324` and SMTP at `127.0.0.1:54325`. The `npm run notify:local` worker claims due rows from the local Supabase Docker database and sends them only to local Mailpit. It has no production-provider option and must not be pointed at an external SMTP host.

The hosted delivery worker is not configured. Before enabling a provider, add a server-side worker with secret-managed credentials, keep delivery disabled by default, add a test recipient allow-list, verify retry/idempotency behavior, and test suppression and bounce handling. SMS and push remain later work.
