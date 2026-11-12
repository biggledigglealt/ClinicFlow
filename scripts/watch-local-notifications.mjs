import { fileURLToPath } from 'node:url'
import { runProcess } from './process-utils.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const workerScript = fileURLToPath(new URL('./send-local-notifications.mjs', import.meta.url))
const pollIntervalMs = 10_000

let stopping = false
let wakeDelay

function stop() {
  stopping = true
  wakeDelay?.()
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      wakeDelay = undefined
      resolve()
    }, milliseconds)
    wakeDelay = () => {
      clearTimeout(timer)
      wakeDelay = undefined
      resolve()
    }
  })
}

process.once('SIGINT', stop)
process.once('SIGTERM', stop)

async function pollLocalEmailQueue() {
  try {
    const result = await runProcess(process.execPath, [workerScript, '--quiet'], {
      cwd: projectRoot,
      capture: true,
    })
    for (const line of result.stdout.split(/\r?\n/)) {
      if (line.startsWith('Captured ')) console.log(line)
    }
    if (result.code !== 0 && result.signal !== 'SIGINT' && result.signal !== 'SIGTERM' && result.code !== 130) {
      console.error('Local email processing failed; the worker will retry.')
    }
  } catch {
    console.error('Local email processing could not run; the worker will retry.')
  }
}

async function main() {
  while (!stopping) {
    await pollLocalEmailQueue()
    if (!stopping) await delay(pollIntervalMs)
  }
}

main().catch(() => {
  console.error('The local email worker stopped unexpectedly.')
  process.exitCode = 1
})
