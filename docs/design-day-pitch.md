# ClinicFlow: Design Day pitch

## Three-minute pitch

**[0:00–0:25 | Problem]**

Small clinics and patients spend time coordinating appointments across calls, calendars, and schedules. Patients need to know which clinics have a suitable opening; clinic staff need changes to stay consistent. ClinicFlow brings those steps into one appointment flow.

**[0:25–1:10 | Demonstrate the patient flow]**

Start on the patient home screen. A patient can search by city or postal code, filter by service, distance, new-patient status, and availability, then compare clinic cards and map results. They choose a clinic and a time, sign in, and book. The “My appointments” view keeps bookings together across clinics, where patients can review, reschedule, or cancel. Staff also have tools for daily schedules, staff hours, and waitlist offers.

**[1:10–1:40 | Design choices]**

We focused the interface on the patient’s next action. Feedback showed that booking and sign-up were easy to miss, so we made those choices more visible. We adjusted the calendar controls for narrow screens and put phone navigation within easy reach. Patients can also save language and accessibility preferences, including text size, contrast, and text-to-speech.

**[1:40–2:20 | How it works]**

The web app is built with React and TypeScript. Supabase Auth manages accounts, and PostgreSQL stores the booking data. Database access policies limit which records patients and clinic staff can access. Booking writes recheck availability, and database constraints reject overlapping active appointments. The profile asks for a name and only an optional phone number. ClinicFlow does not collect diagnoses or clinical notes.

**[2:20–3:00 | Scope and next step]**

This is a working prototype with synthetic clinic and patient records, not a production health system. We have not imported verified clinic listings, confirmed operating costs, configured hosted email delivery, or completed native-device testing. Our next step is a small clinic and patient pilot: measure how long common tasks take, test booking conflicts and rescheduling, and learn what integrations clinics need. ClinicFlow makes the appointment journey easier to see; the next round of research will tell us where it fits into real clinic workflows.

## Demo sequence

Keep the live walkthrough to about 45 seconds. Use a pre-seeded synthetic account and avoid entering real contact information.

1. Search for clinics using a city or postal code, then show a service or availability filter.
2. Open a clinic and show its calendar and available times.
3. Show the cross-clinic “My appointments” list and where rescheduling or cancellation starts.
4. If time allows, point out the mobile navigation and one accessibility preference.

## Five-minute questions

**What problem does this solve for a clinic?**

It gives patients a self-service way to find an opening and manage a booking, while staff can review the day’s schedule and update clinic hours. We still need clinic interviews to check how well these flows match existing operations.

**How do you stop two people from booking the same time?**

The database checks availability when a booking is written and has constraints that reject overlapping active appointments. The user interface alone is not responsible for preventing conflicts.

**What patient information do you store?**

The booking profile uses a first and last name, with an optional phone number. Appointment records are needed to run the booking flow. The prototype does not store diagnoses or clinical notes, and all demonstration records are synthetic.

**Has the system been security or privacy certified?**

No. The prototype uses account authentication, database access policies, validated booking operations, and limited audit records. It has not had an independent security or privacy review, so it must not be used with real patient information.

**Are the clinic listings real?**

No. The current listings are synthetic examples. We have a local import workflow that checks source provenance, but no verified clinic directory has been imported. A pilot would need clinic-approved listings and a process to keep them current.

**Do email reminders work in production?**

The prototype queues email work and captures it locally during development. A hosted email provider and scheduled worker are not configured, so we do not claim live delivery or a one-minute notification time.

**How accessible and bilingual is it?**

The interface includes English and French labels, saved text-size and contrast preferences, and text-to-speech support in compatible browsers. Clinic-entered content is not automatically translated, and screen-reader and physical-device testing remain to be done.

**What is the business model and operating cost?**

Both are still open questions. The under-$50 monthly target has not been verified against actual hosting and database charges. We would interview clinics about their current scheduling tools, integration needs, and willingness to pay before setting a price.

**Why not build a full electronic medical record?**

The project is scoped to clinic discovery and appointment administration. Avoiding clinical records keeps the prototype focused on scheduling and limits the information it needs to handle.

**What would you test next?**

Run a pilot with patients and clinic staff. Record task completion time and errors for searching, booking, rescheduling, and cancellation; verify clinic availability against staff schedules; and test access and accessibility with representative users.
