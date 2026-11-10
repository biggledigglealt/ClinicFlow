# Clinic listing verification and import

## Pilot area

The first directory pilot is limited to clinics within 25 km of uOttawa in the Ottawa–Gatineau area. ClinicFlow has no verified real clinic records yet. The local demo clinics are synthetic and are labelled in search results. Do not copy demo addresses, phone numbers, coordinates, or schedules into a real listing.

## Record requirements

Before a listing can be marked `verified`, the source record must include:

- a stable ID from its source, so re-imports update the same listing;
- a public HTTPS source page and source name;
- the date a team member checked the clinic name, street address, city, province, phone, services, and acceptance status;
- coordinates checked against the clinic address and an IANA time-zone name;
- a point within 25 km of uOttawa for the pilot.

Use clinic websites, public health authority directories, or another primary public source. If a field cannot be confirmed, leave it blank where allowed or leave the listing out. Do not infer appointment availability from directory data; it is calculated from ClinicFlow schedules. Do not add a real clinic from a search snippet alone.

## Import workflow

1. Copy `data/clinic-listings/import-template.csv` and fill one row per sourced clinic. Use semicolons between services. Quote CSV fields containing commas or quotes.
2. Review every source URL and the source checked date with a second team member.
3. Run a dry validation: `npm run clinic:import -- path/to/clinics.csv`.
4. After the local Supabase project has the latest migrations, apply locally: `npm run clinic:import -- path/to/clinics.csv --apply`.
5. Search the imported listing at its city and postal FSA, compare its address and distance with the source, then record the review in the test plan.

The importer rejects missing provenance, invalid coordinates or time zones, duplicate source keys, and records outside the pilot radius. It writes only to the local Docker database. It does not import from or update a hosted Supabase project. Unverified records are excluded by the database search function.

## Expansion

After the Ottawa–Gatineau pilot passes address, source, and search-distance checks, add separate jurisdiction-specific source reviews for Ontario and then other provinces and territories. Keep the source name, source record ID, URL, and checked date for every real listing, and re-check records on a defined schedule.
