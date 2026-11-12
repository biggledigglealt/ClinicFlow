import { useEffect, useMemo, useState } from 'react'
import {
  bookAppointment,
  cancelPatientAppointment,
  getAvailableSlots,
  listMyUpcomingAppointments,
  reschedulePatientAppointment,
  type AppointmentSlot,
  type PatientAppointment,
} from '../../services/appointmentService'
import { listCalendarClinics, type CalendarClinic, type Clinic } from '../../services/clinicService'
import { useLanguage, useTranslate } from '../../lib/i18n'

type CalendarView = 'month' | 'week' | 'day'

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

function hourInTimeZone(value: string, timeZone: string) {
  return Number(new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(new Date(value)))
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
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [isLoadingClinics, setIsLoadingClinics] = useState(true)
  const [isLoadingDay, setIsLoadingDay] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const resolvedClinicId = preferredClinicId && clinics.some((clinic) => clinic.id === preferredClinicId)
    ? preferredClinicId
    : selectedClinicId
  const selectedClinic = clinics.find((clinic) => clinic.id === resolvedClinicId) ?? null
  const visibleAppointments = useMemo(
    () => userId && hasPatientProfile ? appointments : [],
    [userId, hasPatientProfile, appointments],
  )
  const dates = useMemo(() => calendarDates(selectedDate, view), [selectedDate, view])
  const weekdays = useMemo(() => weekdayLabels(language), [language])
  const selectedSlot = slots.find((slot) =>
    `${slot.staff_id}:${slot.start_at}` === selectedSlotKey
    && !patientAppointmentConflict(slot, visibleAppointments),
  ) ?? null
  const dayAppointments = selectedClinic
    ? visibleAppointments.filter((appointment) => appointment.clinic_id === selectedClinic.id
      && dateInTimeZoneForValue(appointment.start_at, selectedClinic.time_zone) === selectedDate)
    : []
  const calendarMonth = utcDate(selectedDate).getUTCMonth()
  const today = dateInTimeZone(selectedClinic?.time_zone ?? 'America/Toronto')

  useEffect(() => {
    let active = true
    listCalendarClinics()
      .then((items) => {
        if (!active) return
        setClinics(items)
        setSelectedClinicId((current) => {
          if (current && items.some((clinic) => clinic.id === current)) return current
          return items[0]?.id ?? ''
        })
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load clinics.')
      })
      .finally(() => { if (active) setIsLoadingClinics(false) })

    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedClinic || !userId || !hasPatientProfile) return

    let active = true
    listMyUpcomingAppointments()
      .then((items) => { if (active) setAppointments(items) })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load appointments.')
      })
    const refreshTimer = window.setInterval(() => {
      void listMyUpcomingAppointments()
        .then((items) => { if (active) setAppointments(items) })
        .catch(() => undefined)
    }, 15000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [selectedClinic, userId, hasPatientProfile, refreshToken])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Discard the previous day before fetching availability for this clinic and date.
    setSlots([])
    setSelectedSlotKey(null)
    setError('')
    if (!selectedClinic || !userId || !hasPatientProfile) return

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
  }, [selectedClinic, selectedDate, userId, hasPatientProfile])

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

  async function refreshAppointmentsAndSlots() {
    const [updatedAppointments, updatedSlots] = await Promise.all([
      listMyUpcomingAppointments(),
      selectedClinic ? getAvailableSlots(selectedClinic.id, selectedDate) : Promise.resolve([]),
    ])
    setAppointments(updatedAppointments)
    setSlots(updatedSlots)
  }

  async function confirmSelection() {
    if (!selectedClinic || !selectedSlot) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (reschedulingId) {
        await reschedulePatientAppointment(reschedulingId, selectedSlot.staff_id, selectedSlot.start_at)
        setMessage(t('Your appointment has been rescheduled.'))
        setReschedulingId(null)
      } else {
        await bookAppointment(selectedClinic.id, selectedSlot.staff_id, selectedSlot.start_at)
        setMessage(t('Your appointment is booked.'))
      }
      setSelectedSlotKey(null)
      await refreshAppointmentsAndSlots()
    } catch (actionError) {
      setError(t(actionError instanceof Error ? actionError.message : 'Could not book this time.'))
    } finally {
      setBusy(false)
    }
  }

  async function cancelAppointment(appointmentId: string) {
    if (!window.confirm(t('Cancel this appointment?'))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await cancelPatientAppointment(appointmentId)
      setMessage(t('Your appointment has been cancelled.'))
      await refreshAppointmentsAndSlots()
    } catch (actionError) {
      setError(t(actionError instanceof Error ? actionError.message : 'Could not cancel this appointment.'))
    } finally {
      setBusy(false)
    }
  }

  function goToMyAppointments() {
    const nextAppointment = visibleAppointments[0]
    if (!nextAppointment) return
    const matchingClinic = clinics.find((clinic) => clinic.id === nextAppointment.clinic_id)
    if (matchingClinic) {
      setSelectedClinicId(matchingClinic.id)
      onClinicChange(matchingClinic)
    }
    const timeZone = matchingClinic?.time_zone ?? nextAppointment.clinic?.time_zone ?? 'America/Toronto'
    setSelectedDate(dateInTimeZoneForValue(nextAppointment.start_at, timeZone))
    setView('day')
  }

  const appointmentDays = useMemo(() => {
    const days = new Map<string, PatientAppointment[]>()
    for (const appointment of visibleAppointments) {
      const timeZone = appointment.clinic?.time_zone ?? 'America/Toronto'
      const key = dateInTimeZoneForValue(appointment.start_at, timeZone)
      days.set(key, [...(days.get(key) ?? []), appointment])
    }
    return days
  }, [visibleAppointments])

  return (
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
              <input aria-label={t('Select date')} type="date" value={selectedDate} onChange={(event) => {
                if (event.target.value) {
                  setSelectedDate(event.target.value)
                  setSelectedSlotKey(null)
                  setMessage('')
                }
              }} />
            </label>
            <button type="button" className="calendar-today-button" onClick={() => setSelectedDate(today)}>{t('Today')}</button>
          </div>
        </div>

        <div className="calendar-display-toolbar">
          <div className="calendar-legend" aria-label={t('Calendar legend')}>
            <span><i className="calendar-legend-dot your-appointment-dot" />{t('Yours')}</span>
            <span><i className="calendar-legend-dot selected-date-dot" />{t('Selected date')}</span>
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
              return (
                <button key={date} type="button" role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${formatLongDate(date, language)}${items.length ? `, ${items.length} ${t('Your appointments')}` : ''}`}
                  className={'calendar-date-cell' + (outsideMonth && view === 'month' ? ' is-outside-month' : '')
                    + (isSelected ? ' is-selected' : '') + (isToday ? ' is-today' : '')}
                  onClick={() => { setSelectedDate(date); setSelectedSlotKey(null); setMessage('') }}>
                  <span className="calendar-date-number">{utcDate(date).getUTCDate()}</span>
                  <span className="calendar-date-events">
                    {items.slice(0, view === 'month' ? 2 : 5).map((appointment) => (
                      <span className="calendar-event-chip" key={appointment.id}>
                        {formatClock(appointment.start_at, appointment.clinic?.time_zone ?? 'America/Toronto', language)}
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

      <aside className="calendar-detail-panel" aria-labelledby="calendar-day-title">
        <div className="calendar-detail-heading">
          <button type="button" className="calendar-my-appointments" onClick={goToMyAppointments} disabled={!visibleAppointments.length}>
            <span aria-hidden="true">‹</span> {t('My appointments')}
          </button>
          <h2 id="calendar-day-title">{formatLongDate(selectedDate, language)}</h2>
          <p>{t('Choose an available time')}</p>
        </div>

        <label className="calendar-clinic-label" htmlFor="calendar-clinic">{t('Clinic')}</label>
        <select id="calendar-clinic" className="calendar-clinic-select" value={resolvedClinicId}
          disabled={isLoadingClinics || clinics.length === 0}
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

        {error && <p className="auth-error" role="alert">{t(error)}</p>}
        {message && <p className="auth-message" role="status">{message}</p>}

        {!selectedClinic && !isLoadingClinics && <p className="section-description">{t('No clinics are available.')}</p>}
        {isLoadingClinics && <p className="section-description" role="status">{t('Loading clinics…')}</p>}

        {selectedClinic && !userId && (
          <div className="calendar-access-prompt">
            <p>{t('Log in to view appointment availability and book a time.')}</p>
            <button type="button" className="primary-button" onClick={onLoginRequest}>{t('Log in')}</button>
          </div>
        )}
        {selectedClinic && userId && !hasPatientProfile && (
          <div className="calendar-access-prompt">
            <p>{t('Complete your booking profile before choosing an appointment time.')}</p>
            <button type="button" className="primary-button" onClick={onOpenProfile}>{t('Complete booking profile')}</button>
          </div>
        )}

        {selectedClinic && userId && hasPatientProfile && (
          <>
            {isLoadingDay && <p className="section-description" role="status">{t('Loading availability…')}</p>}
            {!isLoadingDay && dayAppointments.length === 0 && slots.length === 0 && !error && (
              <p className="calendar-no-times">{t('No bookable times are available to you at this clinic on this date. Try another date.')}</p>
            )}
            {(['morning', 'afternoon'] as const).map((period) => {
              const periodAppointments = dayAppointments.filter((item) => {
                const hour = hourInTimeZone(item.start_at, selectedClinic.time_zone)
                return period === 'morning' ? hour < 12 : hour >= 12
              })
              const periodSlots = slots.filter((slot) => {
                const hour = hourInTimeZone(slot.start_at, selectedClinic.time_zone)
                return period === 'morning' ? hour < 12 : hour >= 12
              })
              if (!periodAppointments.length && !periodSlots.length) return null
              const rows = [
                ...periodAppointments.map((appointment) => ({ kind: 'appointment' as const, time: appointment.start_at, appointment })),
                ...periodSlots.map((slot) => ({ kind: 'slot' as const, time: slot.start_at, slot })),
              ].sort((a, b) => a.time.localeCompare(b.time))
              return (
                <section className="calendar-time-group" key={period} aria-label={t(period === 'morning' ? 'Morning' : 'Afternoon')}>
                  <h3>{t(period === 'morning' ? 'Morning' : 'Afternoon')}</h3>
                  <div className="calendar-time-list" aria-live="polite">
                    {rows.map((row) => {
                      if (row.kind === 'appointment') {
                        return (
                          <article className="calendar-time-card is-yours" key={row.appointment.id}>
                            <strong>{formatClock(row.appointment.start_at, selectedClinic.time_zone, language)}</strong>
                            <span>{t('Your appointment')}</span>
                            <div className="calendar-time-actions">
                              <button type="button" className="text-button" disabled={busy}
                                onClick={() => { setReschedulingId(row.appointment.id); setSelectedSlotKey(null); setMessage(t('Choose an available time to reschedule.')) }}>
                                {t('Reschedule')}
                              </button>
                              <button type="button" className="text-button" disabled={busy}
                                onClick={() => void cancelAppointment(row.appointment.id)}>{t('Cancel')}</button>
                            </div>
                          </article>
                        )
                      }

                      const conflict = patientAppointmentConflict(row.slot, visibleAppointments)
                      if (conflict) {
                        return (
                          <article className="calendar-time-card is-conflict" key={`${row.slot.staff_id}:${row.slot.start_at}`}>
                            <strong>{formatClock(row.slot.start_at, selectedClinic.time_zone, language)}</strong>
                            <span>{t('Conflicts with your appointment')}</span>
                            <small>
                              {conflict.clinic?.name ?? t('Another clinic')}
                              {' · '}
                              {formatClock(conflict.start_at, conflict.clinic?.time_zone ?? selectedClinic.time_zone, language)}
                            </small>
                          </article>
                        )
                      }

                      return (
                        <button type="button" key={`${row.slot.staff_id}:${row.slot.start_at}`}
                          className={'calendar-time-card is-available'
                            + (selectedSlotKey === `${row.slot.staff_id}:${row.slot.start_at}` ? ' is-slot-selected' : '')}
                          aria-pressed={selectedSlotKey === `${row.slot.staff_id}:${row.slot.start_at}`}
                          onClick={() => { setSelectedSlotKey(`${row.slot.staff_id}:${row.slot.start_at}`); setMessage('') }}>
                          <strong>{formatClock(row.slot.start_at, selectedClinic.time_zone, language)}</strong>
                          <span>{selectedSlotKey === `${row.slot.staff_id}:${row.slot.start_at}` ? t('Selected') : t('Available')}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
            {selectedSlot && (
              <div className="calendar-booking-action">
                {reschedulingId && <p>{t('Rescheduling appointment')}</p>}
                <button type="button" className="primary-button" disabled={busy} onClick={() => void confirmSelection()}>
                  {busy ? t('Booking…') : t(reschedulingId ? 'Confirm reschedule' : 'Confirm booking')}
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </section>
  )
}
