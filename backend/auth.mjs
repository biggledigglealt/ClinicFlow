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
  return {
    patients: {
      patientId: 'string',
      firstName: 'string',
      lastName: 'string',
      dob: 'date',
      contact: 'string',
      registrationDate: 'datetime',
    },
    staff: {
      staffId: 'string',
      firstName: 'string',
      lastName: 'string',
      role: 'string',
      availability: 'json',
    },
    clinics: {
      clinicId: 'string',
      name: 'string',
      address: 'string',
      contact: 'string',
    },
    appointments: {
      appointmentId: 'string',
      patientId: 'string',
      staffId: 'string',
      clinicId: 'string',
      date: 'date',
      time: 'time',
      status: 'string',
    },
    auditLogs: {
      logId: 'string',
      actionType: 'string',
      actorId: 'string',
      timestamp: 'datetime',
      details: 'string',
    },
  }
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
