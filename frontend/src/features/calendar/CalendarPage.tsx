import { useEffect, useMemo, useRef, useState } from 'react'
import {
  bookAppointment,
  cancelPatientAppointment,
  getAvailableDays,
  getAvailableSlots,
  listMyUpcomingAppointments,
  reschedulePatientAppointment,
  type AppointmentSlot,
  type PatientAppointment,
} from '../../services/appointmentService'
import { listCalendarClinics, type CalendarClinic, type Clinic } from '../../services/clinicService'
import { useLanguage, useTranslate } from '../../lib/i18n'

type CalendarView = 'month' | 'week' | 'day'
type CalendarSection = 'calendar' | 'appointments'

interface CalendarPageProps {
  preferredClinicId: string | null
  userId: string | null
  hasPatientProfile: boolean
  refreshToken: number
  onLoginRequest: () => void
  onOpenProfile: () => void
  onClinicChange: (clinic: Clinic) => void
}

function dateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function utcDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function shiftDate(date: string, days: number) {
  const shifted = utcDate(date)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return dateKey(shifted)
}

function startOfWeek(date: string) {
  const value = utcDate(date)
  const mondayOffset = (value.getUTCDay() + 6) % 7
  value.setUTCDate(value.getUTCDate() - mondayOffset)
  return dateKey(value)
}

function calendarDates(date: string, view: CalendarView) {
  if (view === 'day') return [date]
  if (view === 'week') {
    const first = startOfWeek(date)
    return Array.from({ length: 7 }, (_, index) => shiftDate(first, index))
  }

  const selected = utcDate(date)
  const firstOfMonth = dateKey(new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1, 12)))
  const first = startOfWeek(firstOfMonth)
  return Array.from({ length: 42 }, (_, index) => shiftDate(first, index))
}

function formatMonth(date: string, language: 'en' | 'fr') {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate(date))
}

function formatLongDate(date: string, language: 'en' | 'fr') {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate(date))
}

function formatClock(value: string, timeZone: string, language: 'en' | 'fr') {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value))
}

function patientAppointmentConflict(slot: AppointmentSlot, appointments: PatientAppointment[]) {
  const slotStart = new Date(slot.start_at).getTime()
  const slotEnd = new Date(slot.end_at).getTime()
  return appointments.find((appointment) =>
    new Date(appointment.start_at).getTime() < slotEnd
    && new Date(appointment.end_at).getTime() > slotStart,
  ) ?? null
}

function dateInTimeZoneForValue(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function weekdayLabel(date: string, language: 'en' | 'fr') {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(utcDate(date))
}

function weekdayLabels(language: 'en' | 'fr') {
  const monday = new Date(Date.UTC(2025, 5, 2, 12))
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setUTCDate(monday.getUTCDate() + index)
    return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(date)
  })
}

export function CalendarPage({
  preferredClinicId,
  userId,
  hasPatientProfile,
  refreshToken,
  onLoginRequest,
  onOpenProfile,
  onClinicChange,
}: CalendarPageProps) {
  const t = useTranslate()
  const language = useLanguage()
  const [clinics, setClinics] = useState<CalendarClinic[]>([])
  const [selectedClinicId, setSelectedClinicId] = useState(preferredClinicId ?? '')
  const [selectedDate, setSelectedDate] = useState(() => dateInTimeZone('America/Toronto'))
  const [view, setView] = useState<CalendarView>('month')
  const [activeSection, setActiveSection] = useState<CalendarSection>('calendar')
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [availableDates, setAvailableDates] = useState<Record<string, number>>({})
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [isLoadingClinics, setIsLoadingClinics] = useState(true)
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)
  const [isLoadingDay, setIsLoadingDay] = useState(false)
  const [isLoadingCalendarAvailability, setIsLoadingCalendarAvailability] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [appointmentsError, setAppointmentsError] = useState('')
  const [calendarAvailabilityError, setCalendarAvailabilityError] = useState('')
  const [message, setMessage] = useState('')
  const [agendaScrollRequest, setAgendaScrollRequest] = useState(0)
  const dayAgendaRef = useRef<HTMLElement | null>(null)

  const resolvedClinicId = preferredClinicId && clinics.some((clinic) => clinic.id === preferredClinicId)
    ? preferredClinicId
    : selectedClinicId
  const selectedClinic = clinics.find((clinic) => clinic.id === resolvedClinicId) ?? null
  const visibleAppointments = useMemo(() => userId && hasPatientProfile
    ? [...appointments].sort((a, b) => a.start_at.localeCompare(b.start_at))
    : [], [userId, hasPatientProfile, appointments])
  const dates = useMemo(() => calendarDates(selectedDate, view), [selectedDate, view])
  const firstVisibleDate = dates[0] ?? selectedDate
  const lastVisibleDate = dates[dates.length - 1] ?? selectedDate
  const weekdays = useMemo(() => weekdayLabels(language), [language])
  const selectedSlot = slots.find((slot) =>
    `${slot.staff_id}:${slot.start_at}` === selectedSlotKey
    && !patientAppointmentConflict(slot, visibleAppointments),
  ) ?? null
  const availableSlotCount = slots.filter((slot) => !patientAppointmentConflict(slot, visibleAppointments)).length
  const dayAppointments = visibleAppointments.filter((appointment) =>
    dateInTimeZoneForValue(appointment.start_at, appointmentTimeZone(appointment)) === selectedDate,
  )
  const reschedulingAppointment = visibleAppointments.find((appointment) => appointment.id === reschedulingId) ?? null
  const calendarMonth = utcDate(selectedDate).getUTCMonth()
  const today = dateInTimeZone(selectedClinic?.time_zone ?? 'America/Toronto')

  function appointmentTimeZone(appointment: PatientAppointment) {
    return appointment.clinic?.time_zone
      ?? clinics.find((clinic) => clinic.id === appointment.clinic_id)?.time_zone
      ?? 'America/Toronto'
  }

  function appointmentClinicName(appointment: PatientAppointment) {
    return appointment.clinic?.name
      ?? clinics.find((clinic) => clinic.id === appointment.clinic_id)?.name
      ?? t('Clinic')
  }

  useEffect(() => {
    let active = true
    listCalendarClinics()
      .then((items) => {
        if (!active) return
        setClinics(items)
        setSelectedClinicId((current) => {
          if (current && items.some((clinic) => clinic.id === current)) return current
          return ''
        })
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load clinics.')
      })
      .finally(() => { if (active) setIsLoadingClinics(false) })

    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!userId || !hasPatientProfile) return

    let active = true
    // oxlint-disable-next-line react/set-state-in-effect -- Show the initial loading state while the appointment list request is in flight.
    setIsLoadingAppointments(true)
    const loadAppointments = async (showInitialLoading = false) => {
      if (showInitialLoading && active) setIsLoadingAppointments(true)
      try {
        const items = await listMyUpcomingAppointments()
        if (active) {
          setAppointments(items)
          setAppointmentsError('')
        }
      } catch (loadError: unknown) {
        if (active) setAppointmentsError(loadError instanceof Error ? loadError.message : 'Could not load appointments.')
      } finally {
        if (active && showInitialLoading) setIsLoadingAppointments(false)
      }
    }

    void loadAppointments(true)
    const refreshTimer = window.setInterval(() => { void loadAppointments() }, 15000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [userId, hasPatientProfile, refreshToken])

  useEffect(() => {
    if (agendaScrollRequest === 0 || activeSection !== 'calendar') return

    const frame = window.requestAnimationFrame(() => {
      const agenda = dayAgendaRef.current
      if (!agenda) return
      agenda.focus({ preventScroll: true })
      if (window.matchMedia('(max-width: 820px)').matches) {
        const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth'
        agenda.scrollIntoView({ behavior, block: 'start' })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [agendaScrollRequest, activeSection])

  useEffect(() => {
    const clinicId = selectedClinic?.id
    if (!clinicId) {
      // oxlint-disable-next-line react/set-state-in-effect -- Clear stale availability when the clinic selection is empty.
      setAvailableDates({})
      // oxlint-disable-next-line react/set-state-in-effect -- End the loading state when there is no clinic to query.
      setIsLoadingCalendarAvailability(false)
      // oxlint-disable-next-line react/set-state-in-effect -- Clear an availability error tied to a previous clinic.
      setCalendarAvailabilityError('')
      return
    }

    let active = true
    // oxlint-disable-next-line react/set-state-in-effect -- Reset the previous clinic's markers before loading this calendar range.
    setAvailableDates({})
    setIsLoadingCalendarAvailability(true)
    setCalendarAvailabilityError('')
    const loadCalendarAvailability = () => {
      void getAvailableDays(clinicId, firstVisibleDate, lastVisibleDate)
        .then((items) => {
          if (active) setAvailableDates(Object.fromEntries(
            items.map((item) => [item.available_date, Number(item.available_slots)]),
          ))
        })
        .catch((loadError: unknown) => {
          if (active) setCalendarAvailabilityError(loadError instanceof Error
            ? loadError.message
            : 'Could not load clinic availability.')
        })
        .finally(() => { if (active) setIsLoadingCalendarAvailability(false) })
    }

    loadCalendarAvailability()
    const refreshTimer = window.setInterval(loadCalendarAvailability, 60000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [selectedClinic?.id, firstVisibleDate, lastVisibleDate])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Discard the previous day before fetching availability for this clinic and date.
    setSlots([])
    setSelectedSlotKey(null)
    setError('')
    if (!selectedClinic) return

    let active = true
    setIsLoadingDay(true)
    const loadDay = () => getAvailableSlots(selectedClinic.id, selectedDate)
      .then((items) => { if (active) setSlots(items) })
      .catch((loadError: unknown) => {
        if (active) {
          setSlots([])
          setError(loadError instanceof Error ? loadError.message : 'Could not load availability.')
        }
      })
      .finally(() => { if (active) setIsLoadingDay(false) })

    void loadDay()
    const refreshTimer = window.setInterval(() => { void loadDay() }, 15000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [selectedClinic, selectedDate])

  function changeMonth(delta: number) {
    const date = utcDate(selectedDate)
    const dayOfMonth = date.getUTCDate()
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + delta)
    const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
    date.setUTCDate(Math.min(dayOfMonth, daysInMonth))
    setSelectedDate(dateKey(date))
    setSelectedSlotKey(null)
    setMessage('')
  }

  function selectCalendarDate(date: string) {
    setActiveSection('calendar')
    setSelectedDate(date)
    setSelectedSlotKey(null)
    setMessage('')
    setAgendaScrollRequest((request) => request + 1)
  }

  async function refreshAppointmentsAndSlots() {
    const [appointmentsResult, slotsResult] = await Promise.allSettled([
      listMyUpcomingAppointments(),
      selectedClinic ? getAvailableSlots(selectedClinic.id, selectedDate) : Promise.resolve([]),
    ])
    if (appointmentsResult.status === 'fulfilled') {
      setAppointments(appointmentsResult.value)
      setAppointmentsError('')
    } else {
      setAppointmentsError(appointmentsResult.reason instanceof Error
        ? appointmentsResult.reason.message
        : 'Could not load appointments.')
    }
    if (slotsResult.status === 'fulfilled') {
      setSlots(slotsResult.value)
      setError('')
    } else {
      setSlots([])
      setError(slotsResult.reason instanceof Error ? slotsResult.reason.message : 'Could not load availability.')
    }
  }

  async function confirmSelection() {
    if (!selectedClinic || !selectedSlot) return
    if (!userId) {
      onLoginRequest()
      return
    }
    if (!hasPatientProfile) {
      onOpenProfile()
      return
    }
    const appointmentBeingRescheduled = reschedulingId
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (appointmentBeingRescheduled) {
        await reschedulePatientAppointment(appointmentBeingRescheduled, selectedSlot.staff_id, selectedSlot.start_at)
      } else {
        await bookAppointment(selectedClinic.id, selectedSlot.staff_id, selectedSlot.start_at)
      }
    } catch (actionError) {
      setError(t(actionError instanceof Error ? actionError.message : 'Could not book this time.'))
      setSelectedSlotKey(null)
      await refreshAppointmentsAndSlots()
      return
    } finally {
      setBusy(false)
    }

    setSelectedSlotKey(null)
    setReschedulingId(null)
    setSelectedAppointmentId(appointmentBeingRescheduled)
    setActiveSection('appointments')
    setMessage(t(appointmentBeingRescheduled
      ? 'Your appointment has been rescheduled.'
      : 'Your appointment is booked.'))
    await refreshAppointmentsAndSlots()
  }

  async function cancelAppointment(appointmentId: string) {
    if (!window.confirm(t('Cancel this appointment?'))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await cancelPatientAppointment(appointmentId)
      setMessage(t('Your appointment has been cancelled.'))
      setSelectedAppointmentId(null)
      await refreshAppointmentsAndSlots()
    } catch (actionError) {
      setError(t(actionError instanceof Error ? actionError.message : 'Could not cancel this appointment.'))
    } finally {
      setBusy(false)
    }
  }

  function beginRescheduling(appointment: PatientAppointment) {
    const clinic = clinics.find((item) => item.id === appointment.clinic_id)
    if (!clinic) {
      setError(t('Could not load the clinic for this appointment.'))
      return
    }

    setSelectedClinicId(clinic.id)
    if (selectedClinic?.id !== clinic.id) onClinicChange(clinic)
    setSelectedDate(dateInTimeZoneForValue(appointment.start_at, clinic.time_zone))
    setView('day')
    setActiveSection('calendar')
    setSelectedAppointmentId(appointment.id)
    setReschedulingId(appointment.id)
    setSelectedSlotKey(null)
    setError('')
    setMessage('')
    setAgendaScrollRequest((request) => request + 1)
  }

  function cancelRescheduling() {
    setReschedulingId(null)
    setSelectedSlotKey(null)
    setError('')
    setMessage('')
  }

  function openAppointmentOnCalendar(appointment: PatientAppointment) {
    const clinic = clinics.find((item) => item.id === appointment.clinic_id)
    if (clinic) {
      setSelectedClinicId(clinic.id)
      onClinicChange(clinic)
    }
    setActiveSection('calendar')
    setSelectedAppointmentId(appointment.id)
    setSelectedDate(dateInTimeZoneForValue(appointment.start_at, appointmentTimeZone(appointment)))
    setView('day')
    setReschedulingId(null)
    setSelectedSlotKey(null)
    setAgendaScrollRequest((request) => request + 1)
  }

  const appointmentDays = useMemo(() => {
    const days = new Map<string, PatientAppointment[]>()
    for (const appointment of visibleAppointments) {
      const timeZone = appointment.clinic?.time_zone
        ?? clinics.find((clinic) => clinic.id === appointment.clinic_id)?.time_zone
        ?? 'America/Toronto'
      const key = dateInTimeZoneForValue(appointment.start_at, timeZone)
      days.set(key, [...(days.get(key) ?? []), appointment])
    }
    return days
  }, [visibleAppointments, clinics])

  return (
    <section id="clinic-booking-calendar" className="calendar-page" aria-label={t('Calendar')}>
      <div className="calendar-section-switch" role="group" aria-label={t('Calendar section')}>
        <button type="button" aria-pressed={activeSection === 'calendar'}
          className={activeSection === 'calendar' ? 'is-active' : ''}
          onClick={() => setActiveSection('calendar')}>
          {t('Calendar')}
        </button>
        <button type="button" aria-pressed={activeSection === 'appointments'}
          className={activeSection === 'appointments' ? 'is-active' : ''}
          onClick={() => setActiveSection('appointments')}>
          {t('My upcoming appointments')}
          <span className="calendar-appointment-count">{visibleAppointments.length}</span>
        </button>
      </div>

      {activeSection === 'appointments' ? (
        <section className="calendar-appointments-view" aria-labelledby="my-appointments-title">
          <div className="calendar-appointments-header">
            <div>
              <h2 id="my-appointments-title">{t('My upcoming appointments')}</h2>
              <p>{t('Appointments from all clinics are shown here.')}</p>
            </div>
          </div>
          {message && <p className="auth-message" role="status">{message}</p>}

          {!userId && (
            <div className="calendar-access-prompt">
              <p>{t('Sign in to see and manage your appointments.')}</p>
              <button type="button" className="primary-button" onClick={onLoginRequest}>{t('Log in')}</button>
            </div>
          )}
          {userId && !hasPatientProfile && (
            <div className="calendar-access-prompt">
              <p>{t('Complete your booking profile before choosing an appointment time.')}</p>
              <button type="button" className="primary-button" onClick={onOpenProfile}>{t('Complete booking profile')}</button>
            </div>
          )}
          {userId && hasPatientProfile && isLoadingAppointments && (
            <p className="section-description" role="status">{t('Loading appointments…')}</p>
          )}
          {appointmentsError && <p className="auth-error" role="alert">{t(appointmentsError)}</p>}
          {userId && hasPatientProfile && !isLoadingAppointments && visibleAppointments.length === 0 && !appointmentsError && (
            <p className="calendar-no-times">{t('No upcoming appointments.')}</p>
          )}
          {userId && hasPatientProfile && visibleAppointments.length > 0 && (
            <ul className="calendar-appointments-list">
              {visibleAppointments.map((appointment) => {
                const timeZone = appointmentTimeZone(appointment)
                const isSelected = selectedAppointmentId === appointment.id
                const providerName = [appointment.staff?.first_name, appointment.staff?.last_name]
                  .filter(Boolean)
                  .join(' ')
                const detailsId = `appointment-details-${appointment.id}`
                return (
                  <li className={'calendar-appointment-item' + (isSelected ? ' is-selected' : '')} key={appointment.id}>
                    <button type="button" className="calendar-appointment-summary"
                      aria-expanded={isSelected} aria-controls={detailsId}
                      onClick={() => setSelectedAppointmentId(isSelected ? null : appointment.id)}>
                      <span className="calendar-appointment-clinic">{appointmentClinicName(appointment)}</span>
                      <strong>{formatLongDate(dateInTimeZoneForValue(appointment.start_at, timeZone), language)}</strong>
                      <span>{formatClock(appointment.start_at, timeZone, language)}</span>
                    </button>
                    {isSelected && (
                      <div className="calendar-appointment-details" id={detailsId}>
                        <p>{t('Clinic provider')}: {providerName || t('Not listed')}</p>
                        <p>{t('Status:')} {t(appointment.status)}</p>
                        <div className="calendar-appointment-actions">
                          <button type="button" className="text-button"
                            onClick={() => openAppointmentOnCalendar(appointment)}>{t('View day')}</button>
                          <button type="button" className="primary-button" disabled={busy}
                            onClick={() => beginRescheduling(appointment)}>{t('Reschedule')}</button>
                          <button type="button" className="text-button" disabled={busy}
                            onClick={() => void cancelAppointment(appointment.id)}>{t('Cancel')}</button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : (
      <section className="calendar-workspace" aria-label={t('Calendar')}>
      <div className="calendar-main-panel">
        <div className="calendar-toolbar">
          <div className="calendar-month-heading">
            <h2>{formatMonth(selectedDate, language)}</h2>
            <button type="button" className="calendar-icon-button" aria-label={t('Previous month')} onClick={() => changeMonth(-1)}>‹</button>
            <button type="button" className="calendar-icon-button" aria-label={t('Next month')} onClick={() => changeMonth(1)}>›</button>
          </div>
          <div className="calendar-toolbar-controls">
            <label className="calendar-date-label">
              <span className="visually-hidden">{t('Select date')}</span>
              <input aria-label={t('Select date')} type="date" value={selectedDate}
                onChange={(event) => { if (event.target.value) selectCalendarDate(event.target.value) }} />
            </label>
            <button type="button" className="calendar-today-button" onClick={() => selectCalendarDate(today)}>{t('Today')}</button>
          </div>
        </div>

        <div className="calendar-display-toolbar">
          <div className="calendar-legend" aria-label={t('Calendar legend')}>
            {visibleAppointments.length > 0 && <span><i className="calendar-legend-dot your-appointment-dot" />{t('Yours')}</span>}
            <span><i className="calendar-legend-dot selected-date-dot" />{t('Selected date')}</span>
            <span><i className="calendar-legend-dot available-date-dot" />{t('Times available')}</span>
          </div>
          <div className="calendar-view-switch" role="group" aria-label={t('Calendar view')}>
            {(['month', 'week', 'day'] as const).map((calendarView) => (
              <button key={calendarView} type="button" aria-pressed={view === calendarView}
                className={view === calendarView ? 'is-active' : ''} onClick={() => setView(calendarView)}>
                {t(calendarView === 'month' ? 'Month' : calendarView === 'week' ? 'Week' : 'Day')}
              </button>
            ))}
          </div>
        </div>

        <div className="calendar-clinic-context" aria-live="polite">
          <strong>{selectedClinic?.name ?? t('Select a clinic')}</strong>
          <span>{isLoadingCalendarAvailability
            ? t('Checking clinic availability…')
            : calendarAvailabilityError
              ? t(calendarAvailabilityError)
              : t('Available times are marked on the calendar.')}</span>
        </div>

        <div className={'calendar-grid-wrap calendar-grid-' + view}>
          {view !== 'day' && <div className="calendar-weekdays" aria-hidden="true">
            {weekdays.map((weekday, index) => <span key={index}>{weekday}</span>)}
          </div>}
          <div className="calendar-date-grid" role="grid" aria-label={formatMonth(selectedDate, language)}>
            {dates.map((date) => {
              const items = appointmentDays.get(date) ?? []
              const outsideMonth = utcDate(date).getUTCMonth() !== calendarMonth
              const isSelected = date === selectedDate
              const isToday = date === today
              const availableCount = availableDates[date] ?? 0
              return (
                <button key={date} type="button" role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${formatLongDate(date, language)}${availableCount ? `, ${availableCount} ${t(availableCount === 1 ? 'available appointment time' : 'available appointment times')}` : ''}${items.length ? `, ${items.length} ${t('Your appointments')}` : ''}`}
                  className={'calendar-date-cell' + (outsideMonth && view === 'month' ? ' is-outside-month' : '')
                    + (isSelected ? ' is-selected' : '') + (isToday ? ' is-today' : '')}
                  onClick={() => selectCalendarDate(date)}>
                  <span className="calendar-date-number">{utcDate(date).getUTCDate()}</span>
                  {view === 'week' && <span className="calendar-date-weekday">{weekdayLabel(date, language)}</span>}
                  {availableCount > 0 && (
                    <span className="calendar-date-availability" aria-hidden="true">
                      <i className="calendar-date-availability-dot" />{availableCount}
                    </span>
                  )}
                  <span className="calendar-date-events">
                    {items.slice(0, view === 'month' ? 2 : 5).map((appointment) => (
                      <span className="calendar-event-chip" key={appointment.id}>
                        {formatClock(appointment.start_at, appointmentTimeZone(appointment), language)}
                      </span>
                    ))}
                    {items.length > (view === 'month' ? 2 : 5) && <span className="calendar-more-events">+{items.length - (view === 'month' ? 2 : 5)}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <aside ref={dayAgendaRef} className="calendar-detail-panel" aria-labelledby="calendar-day-title" tabIndex={-1}>
        <div className="calendar-detail-heading">
          <button type="button" className="calendar-my-appointments" onClick={() => setActiveSection('appointments')}>
            <span aria-hidden="true">‹</span> {t('My upcoming appointments')} ({visibleAppointments.length})
          </button>
          <h2 id="calendar-day-title">{formatLongDate(selectedDate, language)}</h2>
          <p>{t(reschedulingId ? 'Choose a new time for this appointment.' : 'Available times are shown for this date.')}</p>
          {reschedulingId && (
            <div className="calendar-reschedule-prompt" role="group" aria-label={t('Rescheduling appointment')}>
              <div className="calendar-reschedule-copy">
                <strong>{t('Current appointment')}</strong>
                {reschedulingAppointment ? (
                  <>
                    <span>{appointmentClinicName(reschedulingAppointment)}</span>
                    <small>
                      {formatLongDate(dateInTimeZoneForValue(reschedulingAppointment.start_at, appointmentTimeZone(reschedulingAppointment)), language)}
                      {' · '}
                      {formatClock(reschedulingAppointment.start_at, appointmentTimeZone(reschedulingAppointment), language)}
                    </small>
                  </>
                ) : <span>{t('Choose an available time below.')}</span>}
              </div>
              <button type="button" className="text-button" disabled={busy} onClick={cancelRescheduling}>{t('Cancel rescheduling')}</button>
            </div>
          )}
        </div>

        <label className="calendar-clinic-label" htmlFor="calendar-clinic">{t('Clinic for available times')}</label>
        <select id="calendar-clinic" className="calendar-clinic-select" value={resolvedClinicId}
          disabled={isLoadingClinics || clinics.length === 0 || Boolean(reschedulingId) || busy}
          onChange={(event) => {
            const clinic = clinics.find((item) => item.id === event.target.value)
            setSelectedClinicId(event.target.value)
            if (clinic) onClinicChange(clinic)
            setSelectedSlotKey(null)
            setReschedulingId(null)
            setMessage('')
          }}>
          {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
        </select>

        {(selectedSlot || error || message) && (
          <div className="calendar-booking-action" aria-live="polite">
            {error && <p className="auth-error" role="alert">{t(error)}</p>}
            {message && <p className="auth-message" role="status">{message}</p>}
            {selectedSlot && <p>
              {t(reschedulingId ? 'Selected new time:' : 'Selected time:')}{' '}
              {formatLongDate(dateInTimeZoneForValue(selectedSlot.start_at, selectedClinic?.time_zone ?? 'America/Toronto'), language)}
              {' · '}
              {formatClock(selectedSlot.start_at, selectedClinic?.time_zone ?? 'America/Toronto', language)}
            </p>}
            {selectedSlot && (
              <button type="button" className="primary-button" disabled={busy} onClick={() => void confirmSelection()}>
                {busy
                  ? t(reschedulingId ? 'Rescheduling…' : 'Booking…')
                  : t(reschedulingId
                    ? 'Confirm reschedule'
                    : !userId
                      ? 'Log in to book'
                      : !hasPatientProfile
                        ? 'Complete profile to book'
                        : 'Book appointment')}
              </button>
            )}
          </div>
        )}

        {!selectedClinic && !isLoadingClinics && <p className="section-description">{t('No clinics are available.')}</p>}
        {isLoadingClinics && <p className="section-description" role="status">{t('Loading clinics…')}</p>}

        {selectedClinic ? (
              <section className="calendar-availability" aria-labelledby="calendar-availability-title">
                <div className="calendar-availability-heading">
                  <div>
                    <h3 id="calendar-availability-title">{t('Available appointment times')}</h3>
                    <p>{selectedClinic.name}</p>
                  </div>
                  {!isLoadingDay && slots.length > 0 && (
                    <span className="calendar-availability-count" role="status">
                      {availableSlotCount}{' '}
                      {t(availableSlotCount === 1
                        ? 'available appointment time'
                        : 'available appointment times')}
                    </span>
                  )}
                </div>
                {isLoadingDay && <p className="section-description" role="status">{t('Loading availability…')}</p>}
                {!isLoadingDay && slots.length === 0 && !error && (
                  <p className="calendar-no-times">{t('No appointment times are available at this clinic on this date. Try another date.')}</p>
                )}
                <div className="calendar-time-list" aria-live="polite">
                  {slots.map((slot) => {
                    const slotKey = `${slot.staff_id}:${slot.start_at}`
                    const conflict = patientAppointmentConflict(slot, visibleAppointments)
                    if (conflict) {
                      return (
                        <article className="calendar-time-card is-conflict" key={slotKey}>
                          <strong>{formatClock(slot.start_at, selectedClinic.time_zone, language)}</strong>
                          <span>{t('Conflicts with your appointment')}</span>
                          <small>
                            {appointmentClinicName(conflict)}
                            {' · '}
                            {formatClock(conflict.start_at, appointmentTimeZone(conflict), language)}
                          </small>
                        </article>
                      )
                    }
                    return (
                      <button type="button" key={slotKey}
                        className={'calendar-time-card is-available'
                          + (selectedSlotKey === slotKey ? ' is-slot-selected' : '')}
                        aria-label={`${formatClock(slot.start_at, selectedClinic.time_zone, language)}. ${t('Available appointment time')}. ${t(reschedulingId ? 'Select to reschedule' : 'Select time')}`}
                        aria-pressed={selectedSlotKey === slotKey}
                        onClick={() => {
                          setSelectedSlotKey(slotKey)
                          setError('')
                          setMessage('')
                        }}>
                        <strong>{formatClock(slot.start_at, selectedClinic.time_zone, language)}</strong>
                        <span>{selectedSlotKey === slotKey
                          ? t('Selected')
                          : t('Available')}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : !isLoadingClinics && (
              <p className="calendar-no-times">{t('Select a clinic to check appointment times.')}</p>
            )}

        {!userId && (
          <div className="calendar-access-prompt">
            <p>{t('Sign in to book an appointment. You can view available times before signing in.')}</p>
            <button type="button" className="primary-button" onClick={onLoginRequest}>{t('Log in to book')}</button>
          </div>
        )}
        {userId && !hasPatientProfile && (
          <div className="calendar-access-prompt">
            <p>{t('Complete your booking profile to book an appointment. Available times are shown below.')}</p>
            <button type="button" className="primary-button" onClick={onOpenProfile}>{t('Complete booking profile')}</button>
          </div>
        )}

        {userId && hasPatientProfile && (
          <section className="calendar-day-appointments" aria-labelledby="calendar-appointments-title">
            <h3 id="calendar-appointments-title">{t('Your appointments on this date')}</h3>
            {dayAppointments.length === 0 ? (
              <p className="calendar-no-times">{t('No appointments for this date.')}</p>
            ) : (
              <ul className="calendar-day-appointment-list">
                {dayAppointments.map((appointment) => {
                  const timeZone = appointmentTimeZone(appointment)
                  const providerName = [appointment.staff?.first_name, appointment.staff?.last_name]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <li className="calendar-day-appointment" key={appointment.id}>
                      <div className="calendar-day-appointment-info">
                        <strong>{formatClock(appointment.start_at, timeZone, language)}</strong>
                        <span>{appointmentClinicName(appointment)}</span>
                        {providerName && <small>{providerName}</small>}
                      </div>
                      <div className="calendar-time-actions">
                        <button type="button" className="text-button" disabled={busy}
                          onClick={() => beginRescheduling(appointment)}>{t('Reschedule')}</button>
                        <button type="button" className="text-button" disabled={busy}
                          onClick={() => void cancelAppointment(appointment.id)}>{t('Cancel')}</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </aside>
      </section>
      )}
    </section>
  )
}
