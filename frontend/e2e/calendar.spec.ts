import { expect, test, type Page, type Route } from '@playwright/test'

const patientId = '10000000-0000-4000-8000-000000000001'
const clinicAId = '40000000-0000-4000-8000-000000000001'
const clinicBId = '40000000-0000-4000-8000-000000000002'
const staffId = '20000000-0000-4000-8000-000000000001'
const appointmentId = '50000000-0000-4000-8000-000000000001'
const appointmentDate = '2030-01-15'
const oldStart = `${appointmentDate}T15:00:00.000Z`
const newStart = `${appointmentDate}T17:00:00.000Z`

const user = {
  id: patientId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'patient@example.test',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00.000Z',
}

const clinics = [
  {
    id: clinicAId,
    name: 'Alpha Family Clinic',
    address: '100 Main Street',
    city: 'Ottawa',
    province: 'ON',
    phone: '613-555-0100',
    description: 'Synthetic test clinic',
    time_zone: 'America/Toronto',
    services: ['Family medicine'],
    accepting_new_patients: true,
    listing_status: 'demo',
    source_name: null,
    source_url: null,
    source_checked_on: null,
    latitude: null,
    longitude: null,
    is_active: true,
  },
  {
    id: clinicBId,
    name: 'Beta Health Clinic',
    address: '200 Main Street',
    city: 'Ottawa',
    province: 'ON',
    phone: '613-555-0101',
    description: 'Synthetic test clinic',
    time_zone: 'America/Toronto',
    services: ['Family medicine'],
    accepting_new_patients: true,
    listing_status: 'demo',
    source_name: null,
    source_url: null,
    source_checked_on: null,
    latitude: null,
    longitude: null,
    is_active: true,
  },
]

interface TestAppointment {
  id: string
  clinic_id: string
  start_at: string
  end_at: string
  status: 'booked' | 'confirmed'
}

function appointmentRows(appointments: TestAppointment[]) {
  return appointments.map((appointment) => {
    const clinic = clinics.find((item) => item.id === appointment.clinic_id)!
    return {
      ...appointment,
      clinic_name: clinic.name,
      clinic_time_zone: clinic.time_zone,
      staff_first_name: 'Taylor',
      staff_last_name: 'Reed',
      staff_job_title: 'Nurse practitioner',
    }
  })
}

async function respond(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

async function installSupabaseMocks(page: Page, platformAdmin = false) {
  let appointments: TestAppointment[] = [{
    id: appointmentId,
    clinic_id: clinicBId,
    start_at: oldStart,
    end_at: '2030-01-15T15:30:00.000Z',
    status: 'booked',
  }]
  const calls = { book: 0, reschedule: 0, cancel: 0 }

  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      await respond(route, {
        access_token: 'synthetic-e2e-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'synthetic-e2e-refresh-token',
        user,
      })
      return
    }
    if (path === '/auth/v1/user') {
      await respond(route, user)
      return
    }
    if (path.startsWith('/auth/v1/')) {
      await respond(route, {})
      return
    }

    if (path === '/rest/v1/clinics') {
      const clinicRows = clinics.map((clinic) => ({
        ...clinic,
        distance_km: 0,
        next_available_at: null,
      }))
      await respond(route, clinicRows)
      return
    }
    if (path === '/rest/v1/profiles') {
      await respond(route, { global_role: platformAdmin ? 'platform_admin' : null })
      return
    }
    if (path === '/rest/v1/patient_profiles') {
      await respond(route, {
        id: patientId,
        user_id: patientId,
        first_name: 'Casey',
        last_name: 'Patient',
        phone: null,
      })
      return
    }
    if (path === '/rest/v1/accessibility_preferences') {
      await respond(route, {
        language: 'en',
        text_size: 'medium',
        high_contrast: false,
        text_to_speech: false,
      })
      return
    }
    if (path === '/rest/v1/staff_profiles') {
      await respond(route, { id: staffId })
      return
    }
    if (path === '/rest/v1/clinic_memberships') {
      await respond(route, [])
      return
    }
    if (path === '/rest/v1/notifications') {
      if (request.method() === 'HEAD') {
        await route.fulfill({ status: 200, headers: { 'content-range': '*/0' }, body: '' })
      } else {
        await respond(route, [])
      }
      return
    }

    if (path.startsWith('/rest/v1/rpc/')) {
      const rpc = path.slice('/rest/v1/rpc/'.length)
      const body = request.postDataJSON() as Record<string, unknown> | null
      if (rpc === 'search_clinics') {
        await respond(route, clinics.map((clinic) => ({ ...clinic, distance_km: 1, next_available_at: null })))
        return
      }
      if (rpc === 'list_my_upcoming_appointments') {
        await respond(route, appointmentRows(appointments))
        return
      }
      if (rpc === 'available_appointment_slots') {
        const clinicIdForSlots = body?.p_clinic_id
        const date = body?.p_date
        const slots = clinicIdForSlots === clinicBId && date === appointmentDate
          ? [{
              staff_id: staffId,
              staff_first_name: 'Taylor',
              staff_last_name: 'Reed',
              staff_job_title: 'Nurse practitioner',
              start_at: newStart,
              end_at: '2030-01-15T17:30:00.000Z',
            }]
          : []
        await respond(route, slots)
        return
      }
      if (rpc === 'available_appointment_days') {
        const clinicIdForSlots = body?.p_clinic_id
        const startDate = String(body?.p_start_date ?? '')
        const endDate = String(body?.p_end_date ?? '')
        const hasAvailableDay = clinicIdForSlots === clinicBId
          && appointmentDate >= startDate
          && appointmentDate <= endDate
        await respond(route, hasAvailableDay
          ? [{ available_date: appointmentDate, available_slots: 1 }]
          : [])
        return
      }
      if (rpc === 'reschedule_appointment') {
        calls.reschedule += 1
        appointments = appointments.map((appointment) => appointment.id === body?.p_appointment_id
          ? {
              ...appointment,
              start_at: String(body?.p_start_at),
              end_at: new Date(new Date(String(body?.p_start_at)).getTime() + 30 * 60_000).toISOString(),
            }
          : appointment)
        await respond(route, null)
        return
      }
      if (rpc === 'cancel_appointment') {
        calls.cancel += 1
        appointments = appointments.filter((appointment) => appointment.id !== body?.p_appointment_id)
        await respond(route, null)
        return
      }
      if (rpc === 'book_appointment_with_audit') {
        calls.book += 1
        const clinicIdForBooking = String(body?.p_clinic_id ?? clinicAId)
        const startAt = String(body?.p_start_at)
        appointments = [...appointments, {
          id: '50000000-0000-4000-8000-000000000002',
          clinic_id: clinicIdForBooking,
          start_at: startAt,
          end_at: new Date(new Date(startAt).getTime() + 30 * 60_000).toISOString(),
          status: 'booked',
        }]
        await respond(route, { success: true, appointment_id: appointmentId })
        return
      }
      await respond(route, [])
      return
    }

    await respond(route, [])
  })

  return {
    calls,
    get appointments() { return appointments },
  }
}

async function signInAsPatient(page: Page, platformAdmin = false) {
  const backend = await installSupabaseMocks(page, platformAdmin)
  await page.goto('/')
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click()
  await page.getByLabel('Email', { exact: true }).fill('patient@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!')
  await page.locator('#auth-panel button[type="submit"]').click()
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible()
  return backend
}

async function navigateThroughMainMenu(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1024) <= 700) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click()
  }
  await page.locator('#mobile-navigation').getByRole('button', { name: label }).click()
}

test('guest can see a clinic calendar and book after signing in', async ({ page }) => {
  const backend = await installSupabaseMocks(page)
  await page.goto('/')

  const clinicCard = page.locator('.clinic-card').filter({ hasText: 'Beta Health Clinic' })
  await clinicCard.getByRole('button', { name: 'Select clinic', exact: true }).click()

  const calendar = page.locator('#clinic-booking-calendar')
  await expect(calendar).toBeInViewport({ ratio: 0.1 })
  await expect(calendar.locator('.calendar-clinic-context')).toContainText('Beta Health Clinic')
  await page.getByLabel('Select date').fill(appointmentDate)
  await expect(page.getByRole('gridcell', { name: /January 15, 1 available appointment time/ })).toBeVisible()

  await page.getByRole('gridcell', { name: /January 15, 1 available appointment time/ }).click()
  const slot = page.locator('.calendar-time-card.is-available').first()
  await expect(slot).toContainText('12:00')
  await slot.click()
  await page.getByRole('button', { name: 'Log in to book', exact: true }).last().click()

  await page.getByLabel('Email', { exact: true }).fill('patient@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!')
  await page.locator('#auth-panel button[type="submit"]').click()
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible()
  await calendar.getByRole('button', { name: 'Book appointment', exact: true }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Your appointment is booked.' })).toBeVisible()
  await expect(page.locator('.calendar-appointment-summary').last()).toContainText('Beta Health Clinic')
  expect(backend.calls.book).toBe(1)
})

test('patient can find and reschedule an appointment at another clinic', async ({ page }) => {
  const backend = await signInAsPatient(page)
  await navigateThroughMainMenu(page, 'Calendar')
  await expect(page.locator('#calendar-clinic')).toBeVisible()
  await expect(page.locator('#calendar-clinic')).toBeEnabled()

  await page.locator('.calendar-section-switch').getByRole('button', { name: /My upcoming appointments/ }).click()
  const appointmentSummary = page.locator('.calendar-appointment-summary').first()
  await expect(appointmentSummary).toContainText('Beta Health Clinic')
  await expect(appointmentSummary).toContainText('Tuesday, January 15')
  await appointmentSummary.click()
  await expect(page.getByRole('button', { name: 'Reschedule', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click()

  await expect(page.locator('.calendar-reschedule-prompt')).toContainText('Beta Health Clinic')
  const availableSlot = page.locator('.calendar-time-card.is-available').first()
  await expect(availableSlot).toBeVisible()
  await availableSlot.click()
  await page.getByRole('button', { name: 'Confirm reschedule', exact: true }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Your appointment has been rescheduled.' })).toBeVisible()
  await expect(page.locator('.calendar-appointment-summary').first()).toContainText('Beta Health Clinic')
  await expect(page.locator('.calendar-appointment-summary').first()).toContainText('12:00')
  expect(backend.calls.reschedule).toBe(1)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByText('No upcoming appointments.')).toBeVisible()
  expect(backend.calls.cancel).toBe(1)
})

test('selecting a date brings the cross-clinic agenda into view on mobile', async ({ page }) => {
  await signInAsPatient(page)
  await navigateThroughMainMenu(page, 'Calendar')
  await page.getByLabel('Select date').fill(appointmentDate)
  await page.getByRole('gridcell', { name: /January 15/ }).click()

  const dayAgenda = page.locator('.calendar-detail-panel')
  await expect(dayAgenda).toContainText('Beta Health Clinic')
  await expect(dayAgenda).toContainText('10:00')
  await expect(dayAgenda.getByRole('button', { name: 'Reschedule', exact: true })).toBeVisible()

  if ((page.viewportSize()?.width ?? 1024) <= 820) {
    await expect(dayAgenda).toBeInViewport({ ratio: 0.1 })
  }
})

test('patient and staff features remain reachable at responsive widths', async ({ page }) => {
  await signInAsPatient(page, true)
  await navigateThroughMainMenu(page, 'Calendar')
  await expect(page.locator('.calendar-page')).toBeVisible()

  await navigateThroughMainMenu(page, 'Profile')
  await expect(page.getByRole('heading', { name: 'Your profile' }).first()).toBeVisible()

  await navigateThroughMainMenu(page, 'Settings')
  await expect(page.getByRole('heading', { name: 'Accessibility settings' }).first()).toBeVisible()

  await page.getByRole('button', { name: /Notifications,/ }).click()
  await expect(page.getByRole('heading', { name: 'Notifications' }).first()).toBeVisible()

  await navigateThroughMainMenu(page, 'Support & contact')
  await expect(page.getByRole('heading', { name: 'Help and contact' }).first()).toBeVisible()

  await navigateThroughMainMenu(page, 'Staff access')
  await expect(page.getByRole('heading', { name: 'Staff access' }).first()).toBeVisible()

  await navigateThroughMainMenu(page, 'Home')
  await expect(page.getByRole('heading', { name: 'Find a clinic', exact: true })).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
})
