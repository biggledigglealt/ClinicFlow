import { fileURLToPath } from 'node:url'
import { runProcess } from './process-utils.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const supabaseCli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url))
const commandArgs = {
  start: ['start'],
  stop: ['stop'],
  migrate: ['migration', 'up', '--local'],
  reset: ['db', 'reset'],
  test: ['test', 'db'],
}

function getLocalAuthUrls() {
  const codespaceName = process.env.CODESPACE_NAME
  if (codespaceName) {
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'
    return {
      site: `https://${codespaceName}-5173.${domain}`,
      api: `https://${codespaceName}-54321.${domain}`,
    }
  }

  return {
    site: 'http://127.0.0.1:5173',
    api: 'http://127.0.0.1:54321',
  }
}

const task = process.argv[2]
const args = commandArgs[task]
if (!args) {
  console.error('Usage: node scripts/supabase-local.mjs <start|stop|migrate|reset|test>')
  process.exitCode = 2
} else {
  const urls = getLocalAuthUrls()
  const env = {
    ...process.env,
    CLINICFLOW_AUTH_SITE_URL: urls.site,
    CLINICFLOW_AUTH_EXTERNAL_URL: urls.api,
  }

  try {
    const result = await runProcess(process.execPath, [supabaseCli, ...args], {
      cwd: projectRoot,
      env,
      redactOutput: true,
    })
    process.exitCode = result.code ?? 1
  } catch (error) {
    console.error(`Could not run the local Supabase command: ${error.message}`)
    process.exitCode = 1
  }
}
