import { fileURLToPath } from 'node:url'
import { runProcess } from './process-utils.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const frontendRoot = fileURLToPath(new URL('../frontend/', import.meta.url))
const supabaseCli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url))
const supabaseRunner = fileURLToPath(new URL('./supabase-local.mjs', import.meta.url))
const seedScript = fileURLToPath(new URL('./seed-local.mjs', import.meta.url))
const viteCli = fileURLToPath(new URL('../frontend/node_modules/vite/bin/vite.js', import.meta.url))

async function run(command, args, message, options = {}) {
  console.log(message)
  const result = await runProcess(command, args, { cwd: projectRoot, ...options })
  if (result.code === 0) return true
  if (result.signal === 'SIGINT' || result.code === 130) {
    process.exitCode = 130
    return false
  }
  throw new Error(`${message} (exit code ${result.code ?? 'unknown'})`)
}

async function getPublishableKey(env) {
  const result = await runProcess(process.execPath, [supabaseCli, 'status', '-o', 'json'], {
    cwd: projectRoot,
    env,
    capture: true,
  })
  if (result.code !== 0) throw new Error('Could not read the local Supabase status.')

  const keyPosition = result.stdout.indexOf('"ANON_KEY"')
  const jsonStart = keyPosition < 0 ? -1 : result.stdout.lastIndexOf('{', keyPosition)
  const jsonEnd = jsonStart < 0 ? -1 : result.stdout.indexOf('\n}', keyPosition)
  if (jsonStart < 0 || jsonEnd < 0) throw new Error('The local Supabase status did not include API keys.')

  let status
  try {
    status = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 2))
  } catch {
    throw new Error('Could not read the local Supabase status.')
  }

  const key = status.PUBLISHABLE_KEY || status.ANON_KEY
  if (typeof key !== 'string' || !key) throw new Error('The local Supabase publishable key is missing.')
  return key
}

async function main() {
  const codespaceName = process.env.CODESPACE_NAME
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'
  const authUrls = codespaceName
    ? {
        site: `https://${codespaceName}-5173.${domain}`,
        api: `https://${codespaceName}-54321.${domain}`,
      }
    : {
        site: 'http://127.0.0.1:5173',
        api: 'http://127.0.0.1:54321',
      }
  const supabaseEnv = {
    ...process.env,
    CLINICFLOW_AUTH_SITE_URL: authUrls.site,
    CLINICFLOW_AUTH_EXTERNAL_URL: authUrls.api,
  }

  if (!await run(process.execPath, [supabaseRunner, 'start'], 'Starting local Supabase...', { env: supabaseEnv, redactOutput: true })) return
  if (!await run(process.execPath, [supabaseRunner, 'migrate'], 'Applying database migrations...', { env: supabaseEnv, redactOutput: true })) return
  if (!await run(process.execPath, [seedScript], 'Loading synthetic clinic data...')) return

  const publishableKey = await getPublishableKey(supabaseEnv)
  console.log('ClinicFlow is ready. Open the forwarded port 5173 in Codespaces, or http://127.0.0.1:5173 locally.')
  console.log('Local signup is immediate. Use synthetic data only.')

  await run(process.execPath, [viteCli, '--host', '0.0.0.0', '--port', '5173', '--strictPort'], 'Starting the frontend...', {
    cwd: frontendRoot,
    env: { ...process.env, VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey },
  })
}

main().catch((error) => {
  console.error(`ClinicFlow could not start: ${error.message}`)
  process.exitCode = 1
})
