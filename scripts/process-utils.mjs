import { spawn } from 'node:child_process'

function redact(line) {
  return line
    .replace(/("[^"]*(?:secret|password|service[_-]?role|anon[_-]?key|s3_protocol_access_key)[^"]*"\s*:\s*)"[^"]*"/gi, '$1"[hidden]"')
    .replace(/(\b(?:Secret Key|Access Key)\b[^\r\n]*?)[A-Za-z0-9_-]{20,}\b/gi, '$1[hidden]')
    .replace(/\bsb_secret_[A-Za-z0-9_-]+\b/g, '[hidden]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[hidden]')
}

export function runProcess(command, args, { cwd, env, capture = false, redactOutput = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let activeChild = child

    const forwardInterrupt = () => activeChild?.kill('SIGINT')
    const forwardTerminate = () => activeChild?.kill('SIGTERM')
    process.once('SIGINT', forwardInterrupt)
    process.once('SIGTERM', forwardTerminate)

    function consume(stream, isError) {
      let pending = ''
      stream.on('data', (chunk) => {
        const value = chunk.toString()
        if (capture) {
          if (isError) stderr += value
          else stdout += value
          return
        }

        pending += value
        const lines = pending.split(/\r\n|\n|\r/)
        pending = lines.pop() ?? ''
        for (const line of lines) {
          const output = redactOutput ? redact(line) : line
          ;(isError ? process.stderr : process.stdout).write(`${output}\n`)
        }
      })
      stream.on('end', () => {
        if (!capture && pending) {
          const output = redactOutput ? redact(pending) : pending
          ;(isError ? process.stderr : process.stdout).write(output)
        }
      })
    }

    consume(child.stdout, false)
    consume(child.stderr, true)

    child.once('error', (error) => {
      activeChild = null
      process.removeListener('SIGINT', forwardInterrupt)
      process.removeListener('SIGTERM', forwardTerminate)
      reject(error)
    })
    child.once('close', (code, signal) => {
      activeChild = null
      process.removeListener('SIGINT', forwardInterrupt)
      process.removeListener('SIGTERM', forwardTerminate)
      resolve({ code, signal, stdout, stderr })
    })
  })
}
