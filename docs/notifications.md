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

## Hosted sign-up and recovery email

Mailpit is available only in the local development environment. The Vercel preview cannot link to a teammate's local Mailpit inbox. The `[local_smtp]` section in `supabase/config.toml` configures local Supabase only; it does not configure the hosted Supabase Auth mailer. The frontend can confirm that Supabase accepted a signup or resend request, but cannot confirm that a provider delivered the message.

To deliver verification and password recovery email from the hosted project:

1. Select an email provider and verify the sender domain and address with that provider.
2. Enter the provider's SMTP host, port, username, password, sender address, and sender name in the hosted Supabase project's Auth SMTP settings. Keep SMTP credentials in Supabase's secret settings, never in Vercel frontend variables or source control.
3. Set the hosted Auth Site URL to the canonical app URL and allow the app's exact redirect origins. The current web client redirects to the origin that opened it, so allow `https://clinic-flow-git-feature-supabase-foundation-equillibrium1.vercel.app` for this preview and the production origin when one is selected.
4. Keep email confirmation enabled, then verify signup, resend, and password recovery with a team controlled mailbox. Check Supabase Auth logs and the provider's delivery events if a message does not arrive.

Until custom SMTP is configured and verified, a successful signup response is not proof that the verification email reached the recipient.

## Google sign-in

The web login form offers Google OAuth. Configure Google under **Authentication → Sign In / Providers → Google** in the hosted Supabase dashboard. The separate **OAuth Server** page makes ClinicFlow an identity provider for other apps and does not enable Google sign-in. Leave OAuth Server disabled unless ClinicFlow should provide sign-in to third-party apps; its `/oauth/consent` path is not implemented by this app.

1. Create a Google OAuth 2.0 web client and add `https://ixeghmxjnrrknbwbbbdg.supabase.co/auth/v1/callback` as its authorized redirect URI.
2. Enter the Google client ID and client secret directly in Supabase Auth's Google provider settings. Do not put the client secret in Vercel or frontend code.
3. Add the exact Vercel preview origin above to Supabase's allowed redirect URLs. The app returns users to the origin where they started sign-in.
4. If the Google consent screen is in Testing mode, add the tester's Google account to its test-user list. Test login and first-time account creation with a team controlled account.

Google login can avoid verification email for Google-authenticated accounts. Email/password signup and password recovery still depend on hosted SMTP. The current OAuth button is for the web app; native Capacitor OAuth needs a separate browser and deep-link flow before it is enabled in mobile builds.

## Local test

Local Supabase exposes Mailpit at `http://127.0.0.1:54324` and SMTP at `127.0.0.1:54325`. While `npm run dev` runs, a local worker checks the outbox every 10 seconds, claims due rows from the local Supabase Docker database, and sends them only to local Mailpit. The `npm run notify:local` command processes due rows once. Neither path has a production-provider option or may be pointed at an external SMTP host.

The hosted delivery worker is not configured. Before enabling a provider, add a server-side worker with secret-managed credentials, keep delivery disabled by default, add a test recipient allow-list, verify retry/idempotency behavior, and test suppression and bounce handling. SMS and push remain later work.
