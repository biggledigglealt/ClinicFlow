import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const inputPath = resolve(process.argv[2] ?? 'data/clinic-listings/import-template.csv')
const shouldApply = process.argv.includes('--apply')
const expectedHeaders = [
  'source_name', 'source_record_id', 'source_url', 'source_checked_on', 'name', 'address',
  'city', 'province', 'postal_code', 'phone', 'email', 'description', 'latitude', 'longitude',
  'time_zone', 'services', 'accepting_new_patients',
]
const uOttawa = { latitude: 45.4231, longitude: -75.6831 }

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') quoted = false
      else field += character
    } else if (character === '"') quoted = true
    else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''))
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += character
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.')
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  }
  return rows
}

function sqlLiteral(value) {
  return value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`
}

function haversineKm(latitude, longitude) {
  const radians = (degrees) => degrees * Math.PI / 180
  const dLat = radians(latitude - uOttawa.latitude)
  const dLon = radians(longitude - uOttawa.longitude)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(uOttawa.latitude)) * Math.cos(radians(latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function validateRecord(record, index) {
  const label = `CSV row ${index + 2}`
  const required = ['source_name', 'source_record_id', 'source_url', 'source_checked_on', 'name', 'address', 'city', 'province', 'latitude', 'longitude', 'time_zone', 'services', 'accepting_new_patients']
  for (const fieldName of required) {
    if (!record[fieldName]?.trim()) throw new Error(`${label}: ${fieldName} is required.`)
  }
  if (!/^https:\/\//i.test(record.source_url.trim())) throw new Error(`${label}: source_url must use HTTPS.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.source_checked_on)) throw new Error(`${label}: source_checked_on must use YYYY-MM-DD.`)
  const checkedAt = new Date(`${record.source_checked_on}T00:00:00Z`)
  if (Number.isNaN(checkedAt.getTime()) || checkedAt.toISOString().slice(0, 10) !== record.source_checked_on) {
    throw new Error(`${label}: source_checked_on is not a valid date.`)
  }
  if (checkedAt.getTime() > Date.now()) throw new Error(`${label}: source_checked_on cannot be in the future.`)
  const latitude = Number(record.latitude)
  const longitude = Number(record.longitude)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error(`${label}: latitude is outside -90 to 90.`)
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error(`${label}: longitude is outside -180 to 180.`)
  const distance = haversineKm(latitude, longitude)
  if (distance > 25) throw new Error(`${label}: listing is ${distance.toFixed(1)} km from uOttawa; pilot limit is 25 km.`)
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: record.time_zone }).format(new Date())
  } catch {
    throw new Error(`${label}: time_zone is not a recognized IANA time zone.`)
  }
  const services = record.services.split(';').map((item) => item.trim()).filter(Boolean)
  if (!services.length || services.some((item) => item.length > 80)) throw new Error(`${label}: services must be a semicolon-separated list (80 characters per service).`)
  if (!['true', 'false'].includes(record.accepting_new_patients.toLowerCase())) {
    throw new Error(`${label}: accepting_new_patients must be true or false.`)
  }
  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) throw new Error(`${label}: email format is invalid.`)
  if (record.phone?.length > 40) throw new Error(`${label}: phone is too long.`)
  return { ...record, latitude, longitude, services, accepting: record.accepting_new_patients.toLowerCase() === 'true' }
}

let rows
try {
  rows = parseCsv(readFileSync(inputPath, 'utf8'))
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not read clinic CSV.')
  process.exit(1)
}

if (!rows.length || rows[0].join(',') !== expectedHeaders.join(',')) {
  console.error(`CSV header must exactly match: ${expectedHeaders.join(',')}`)
  process.exit(1)
}
if (rows.length < 2) {
  console.error('CSV contains no clinic records. Add sourced records before importing.')
  process.exit(1)
}

let records
try {
  records = rows.slice(1).map((cells, index) => {
    if (cells.length !== expectedHeaders.length) throw new Error(`CSV row ${index + 2}: expected ${expectedHeaders.length} columns, received ${cells.length}.`)
    return validateRecord(Object.fromEntries(expectedHeaders.map((header, cellIndex) => [header, cells[cellIndex].trim()])), index)
  })
  const keys = new Set()
  for (const record of records) {
    const key = `${record.source_name.toLowerCase()}\0${record.source_record_id.toLowerCase()}`
    if (keys.has(key)) throw new Error(`Duplicate source record ${record.source_name}/${record.source_record_id} in import file.`)
    keys.add(key)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Clinic CSV validation failed.')
  process.exit(1)
}

console.log(`Validated ${records.length} sourced clinic listing(s) within 25 km of uOttawa.`)
if (!shouldApply) {
  console.log('Dry run only. Review source details, then rerun with --apply to import into the local Supabase database.')
  process.exit(0)
}

const values = records.map((record) => `(
  ${sqlLiteral(record.name)}, ${sqlLiteral(record.address)}, ${sqlLiteral(record.city)},
  ${sqlLiteral(record.province)}, ${sqlLiteral(record.postal_code || null)}, ${sqlLiteral(record.phone || null)},
  ${sqlLiteral(record.email || null)}, ${sqlLiteral(record.description || null)},
  ${record.latitude}, ${record.longitude}, ${sqlLiteral(record.time_zone)},
  array[${record.services.map(sqlLiteral).join(', ')}]::text[], ${record.accepting},
  'verified', ${sqlLiteral(record.source_name)}, ${sqlLiteral(record.source_record_id)},
  ${sqlLiteral(record.source_url)}, ${sqlLiteral(record.source_checked_on)}::date
)`).join(',\n')
const sql = `insert into public.clinics (
  name, address, city, province, postal_code, phone, email, description, latitude, longitude,
  time_zone, services, accepting_new_patients, listing_status, source_name, source_record_id,
  source_url, source_checked_on
) values ${values}
on conflict (source_name, source_record_id)
  where source_name is not null and source_record_id is not null
do update set
  name = excluded.name, address = excluded.address, city = excluded.city,
  province = excluded.province, postal_code = excluded.postal_code, phone = excluded.phone,
  email = excluded.email, description = excluded.description, latitude = excluded.latitude,
  longitude = excluded.longitude, time_zone = excluded.time_zone, services = excluded.services,
  accepting_new_patients = excluded.accepting_new_patients, listing_status = 'verified',
  source_url = excluded.source_url, source_checked_on = excluded.source_checked_on;
`

const result = spawnSync('docker', [
  'exec', '-i', 'supabase_db_clinicflow', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres',
], { cwd: projectRoot, input: sql, encoding: 'utf8', windowsHide: true })
if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.error || result.status !== 0) {
  console.error(result.error?.message ?? 'Local database import failed. Ensure the local Supabase project is running.')
  process.exit(result.status ?? 1)
}
console.log('Verified listings imported into the local database. No hosted project was contacted.')
