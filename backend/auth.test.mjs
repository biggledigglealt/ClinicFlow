import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuditLog, generateApiToken, isValidToken } from './auth.mjs'

test('legacy token prototype returns a 64-character hexadecimal value', () => {
  const token = generateApiToken()
  assert.equal(token.length, 64)
  assert.match(token, /^[a-f0-9]+$/i)
})

test('createAuditLog records a structured action entry', () => {
  const record = createAuditLog('appointment_created', 'Patient booked a clinic appointment', 'patient_001')

  assert.equal(record.actionType, 'appointment_created')
  assert.equal(record.actorId, 'patient_001')
  assert.ok(record.timestamp)
  assert.match(record.details, /booked/i)
})

test('isValidToken rejects blank or malformed tokens', () => {
  assert.equal(isValidToken(''), false)
  assert.equal(isValidToken('not-a-valid-token'), false)
  assert.equal(isValidToken(generateApiToken()), true)
})
