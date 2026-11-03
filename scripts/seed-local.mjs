import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const seedSql = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8')
const result = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    'supabase_db_clinicflow',
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'postgres',
    '-d',
    'postgres',
  ],
  {
    cwd: projectRoot,
    input: seedSql,
    encoding: 'utf8',
    windowsHide: true,
  },
)

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.error) {
  console.error('Could not run the local seed: ' + result.error.message)
  process.exitCode = 1
} else if (result.status !== 0) {
  process.exitCode = result.status ?? 1
}
