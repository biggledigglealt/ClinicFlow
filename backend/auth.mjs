// Legacy prototype helpers. The application uses Supabase Auth; do not use these
// custom tokens as credentials or treat this module as a running API server.
import { getSchemaSummary } from './schema.mjs'

const TOKEN_BYTES = 32

export function generateApiToken() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const buffer = new Uint8Array(TOKEN_BYTES)
    globalThis.crypto.getRandomValues(buffer)
    return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return Array.from({ length: TOKEN_BYTES }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('')
}

export function isValidToken(token) {
  return typeof token === 'string' && token.length === TOKEN_BYTES * 2 && /^[a-f0-9]+$/i.test(token)
}

export function createAuditLog(actionType, details, actorId = 'system') {
  return {
    logId: `log_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
    actionType,
    actorId,
    timestamp: new Date().toISOString(),
    details,
  }
}

export function createDatabaseSchema() {
  return getSchemaSummary()
}

export function createSessionTokenRecord(userId, token = generateApiToken()) {
  return {
    userId,
    token,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    valid: isValidToken(token),
  }
}
