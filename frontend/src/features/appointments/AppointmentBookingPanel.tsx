import { useEffect, useState, type FormEvent } from 'react'
import {
  bookAppointment,
  cancelPatientAppointment,
  getAvailableSlots,
  listMyUpcomingAppointments,
  reschedulePatientAppointment,
  type AppointmentSlot,
  type PatientAppointment,
} from '../../services/appointmentService'
import type { Clinic } from '../../services/clinicService'
import { useTranslate } from '../../lib/i18n'

interface AppointmentBookingPanelProps {
  clinic: Clinic | null
  userId: string | null
  hasPatientProfile: boolean
  textToSpeech: boolean
  language: 'en' | 'fr'
  refreshToken: number
  onLoginRequest: () => void
  onOpenProfile: () => void
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

function nextBusinessDateInTimeZone(timeZone: string) {
  const [year, month, day] = dateInTimeZone(timeZone).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  do {
    date.setUTCDate(date.getUTCDate() + 1)
  } while (date.getUTCDay() === 0 || date.getUTCDay() === 6)

  return date.toISOString().slice(0, 10)
}

function formatDateTime(value: string, timeZone: string, language: 'en' | 'fr') {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value))
}

export function AppointmentBookingPanel({
  clinic,
  userId,
  hasPatientProfile,
  textToSpeech,
  language,
  refreshToken,
  onLoginRequest,
  onOpenProfile,
}: AppointmentBookingPanelProps) {
  const t = useTranslate()
  const clinicId = clinic?.id
  const [date, setDate] = useState(() => nextBusinessDateInTimeZone(clinic?.time_zone ?? 'America/Toronto'))
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!clinicId || !userId || !hasPatientProfile) return

    let active = true
    // oxlint-disable-next-line react/set-state-in-effect -- Reflect the pending external availability request.
    setIsLoadingSlots(true)
    getAvailableSlots(clinicId, date)
      .then((availableSlots) => {
        if (active) {
          setError('')
          setSlots(availableSlots)
          setHasSearched(true)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setSlots([])
          setError(t(loadError instanceof Error ? loadError.message : 'Could not load availability.'))
        }
      })
      .finally(() => {
        if (active) setIsLoadingSlots(false)
      })

    return () => {
      active = false
    }
  }, [clinicId, date, userId, hasPatientProfile, language, t])

  useEffect(() => {
    if (!userId || !hasPatientProfile) return

    let isCurrent = true
    listMyUpcomingAppointments()
      .then((upcoming) => {
        if (isCurrent) setAppointments(upcoming)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(t(loadError instanceof Error ? loadError.message : 'Could not load appointments.'))
        }
      })

    const refreshTimer = window.setInterval(() => {
      void listMyUpcomingAppointments()
        .then((upcoming) => { if (isCurrent) setAppointments(upcoming) })
        .catch(() => undefined)
    }, 15000)

    return () => {
      isCurrent = false
      window.clearInterval(refreshTimer)
    }
  }, [userId, hasPatientProfile, refreshToken, language, t])

  useEffect(() => {
    if (!clinic || !userId || !hasPatientProfile || !hasSearched) return

    let active = true
    const availabilityTimer = window.setInterval(() => {
      void getAvailableSlots(clinic.id, date)
        .then((latestSlots) => { if (active) setSlots(latestSlots) })
        .catch(() => undefined)
    }, 15000)

    return () => {
      active = false
      window.clearInterval(availabilityTimer)
    }
  }, [clinic, userId, hasPatientProfile, hasSearched, date])

  async function loadSlots(selectedDate = date) {
    if (!clinic) return

    setError('')
    setMessage('')
    setHasSearched(true)
    setIsLoadingSlots(true)
    try {
      setSlots(await getAvailableSlots(clinic.id, selectedDate))
    } catch (loadError) {
      setError(t(loadError instanceof Error ? loadError.message : 'Could not load availability.'))
    } finally {
      setIsLoadingSlots(false)
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadSlots()
  }

  async function handleBook(slot: AppointmentSlot) {
    if (!clinic) return

    const slotKey = `${slot.staff_id}:${slot.start_at}`
    setError('')
    setMessage('')
    setBookingSlot(slotKey)
    try {
      if (reschedulingAppointmentId) {
        await reschedulePatientAppointment(reschedulingAppointmentId, slot.staff_id, slot.start_at)
        setMessage(t('Your appointment has been rescheduled.'))
        setReschedulingAppointmentId(null)
      } else {
        await bookAppointment(clinic.id, slot.staff_id, slot.start_at)
        setMessage(t('Your appointment is booked.'))
      }
    } catch (bookingError) {
      setError(t(bookingError instanceof Error ? bookingError.message : 'Could not book this time.'))
      try {
        setSlots(await getAvailableSlots(clinic.id, date))
      } catch {
        // The booking error remains visible if availability cannot refresh.
      }
      setBookingSlot(null)
      return
    }

    try {
      const [updatedSlots, upcoming] = await Promise.all([
        getAvailableSlots(clinic.id, date),
        listMyUpcomingAppointments(),
      ])
      setSlots(updatedSlots)
      setAppointments(upcoming)
    } catch {
      setError(t('Your appointment was booked, but the page could not refresh. Reload to see the latest schedule.'))
    } finally {
      setBookingSlot(null)
    }
  }

  async function handleCancel(appointmentId: string) {
    if (!window.confirm(t('Cancel this appointment?'))) return
    setError('')
    setMessage('')
    setBookingSlot(appointmentId)
    try {
      await cancelPatientAppointment(appointmentId)
      setMessage(t('Your appointment has been cancelled.'))
      const [upcoming, refreshedSlots] = await Promise.all([
        listMyUpcomingAppointments(),
        clinic ? getAvailableSlots(clinic.id, date) : Promise.resolve(slots),
      ])
      setAppointments(upcoming)
      setSlots(refreshedSlots)
    } catch (cancelError) {
      setError(t(cancelError instanceof Error ? cancelError.message : 'Could not cancel this appointment.'))
    } finally {
      setBookingSlot(null)
    }
  }

  return (
    <aside className="panel appointment-panel" id="appointment-panel" aria-labelledby="appointment-booking-title">
      <div className="panel-header">
        <h3 id="appointment-booking-title">{t('Appointment booking')}</h3>
      </div>

      {!clinic ? (
        <p className="section-description">{t('Select a clinic to check appointment times.')}</p>
      ) : !userId ? (
        <div className="booking-access-prompt">
          <p className="section-description">{t('Log in, complete your booking profile, and then choose a clinic time.')}</p>
          <button type="button" className="primary-button" onClick={onLoginRequest}>{t('Log in or sign up')}</button>
        </div>
      ) : !hasPatientProfile ? (
        <div className="booking-access-prompt">
          <p className="section-description">{t('Complete your booking profile before choosing an appointment time.')}</p>
          <button type="button" className="primary-button" onClick={onOpenProfile}>{t('Complete booking profile')}</button>
        </div>
      ) : (
        <>
          <p className="section-description">
            {t('Choose a date for')} {clinic.name}. {t("Appointment times are shown in the clinic's local time.")}
          </p>
          <form className="availability-search" onSubmit={handleSearch}>
            <label htmlFor="appointment-date">{t('Appointment date')}</label>
            <input
              id="appointment-date"
              type="date"
              value={date}
              min={dateInTimeZone(clinic.time_zone)}
              onChange={(event) => {
                setDate(event.target.value)
                setSlots([])
                setMessage('')
              }}
              required
            />
            <button type="submit" className="confirm-button" disabled={isLoadingSlots}>
              {t(isLoadingSlots ? 'Checking…' : 'Refresh available times')}
            </button>
          </form>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}

          {slots.length > 0 ? (
            <div className="appointment-slots" aria-live="polite">
              <h4>{t(reschedulingAppointmentId ? 'Choose a new time' : 'Available appointment times')}</h4>
              {slots.map((slot) => {
                const slotKey = `${slot.staff_id}:${slot.start_at}`
                const providerName = `${slot.staff_first_name} ${slot.staff_last_name}`

                return (
                  <article className="appointment-slot" key={slotKey}>
                    <div>
                      <strong>{formatDateTime(slot.start_at, clinic.time_zone, language)} – {formatDateTime(slot.end_at, clinic.time_zone, language)}</strong>
                      <p>{providerName}{slot.staff_job_title ? ` · ${slot.staff_job_title}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      className="clinic-select-button"
                      disabled={bookingSlot !== null}
                      onClick={() => void handleBook(slot)}
                    >
                      {t(bookingSlot === slotKey ? (reschedulingAppointmentId ? 'Rescheduling…' : 'Booking…') : reschedulingAppointmentId ? 'Reschedule here' : 'Book')}
                    </button>
                  </article>
                )
              })}
            </div>
          ) : hasSearched && !isLoadingSlots ? (
            <p className="section-description">{t('No times are available on this date. Try another weekday or select a different clinic.')}</p>
          ) : null}

          <div className="upcoming-appointments">
            <h4>{t('My upcoming appointments')}</h4>
            {appointments.length === 0 ? (
              <p className="section-description">{t('No upcoming appointments.')}</p>
            ) : (
              <ul>
                {appointments.map((appointment) => {
                  const timeZone = appointment.clinic?.time_zone ?? clinic.time_zone
                  const provider = appointment.staff
                    ? `${appointment.staff.first_name} ${appointment.staff.last_name}`
                    : t('Clinic provider')

                  return (
                    <li key={appointment.id}>
                      <strong>{formatDateTime(appointment.start_at, timeZone, language)}</strong>
                      <span>{appointment.clinic?.name ?? t('Clinic')} · {provider}</span>
                      {textToSpeech && <button type="button" className="text-button" onClick={() => {
                        if (!('speechSynthesis' in window)) return
                        window.speechSynthesis.cancel()
                        const utterance = new SpeechSynthesisUtterance(
                          `${appointment.clinic?.name ?? t('Clinic')}, ${provider}, ${formatDateTime(appointment.start_at, timeZone, language)}`,
                        )
                        utterance.lang = language === 'fr' ? 'fr-CA' : 'en-CA'
                        window.speechSynthesis.speak(utterance)
                      }}>{language === 'fr' ? 'Lire le rendez-vous' : 'Read appointment aloud'}</button>}
                      <div className="appointment-actions">
                        <button type="button" className="text-button" disabled={bookingSlot !== null}
                          onClick={() => void handleCancel(appointment.id)}>{t('Cancel')}</button>
                        {appointment.clinic_id === clinic.id ? (
                          <button type="button" className="text-button" disabled={bookingSlot !== null}
                            onClick={() => {
                              setReschedulingAppointmentId(appointment.id)
                              setError('')
                              setMessage(t('Choose another available time at this clinic to reschedule.'))
                              setHasSearched(false)
                              setSlots([])
                            }}>{t('Reschedule')}</button>
                        ) : <span className="input-hint">{t('Select this clinic to reschedule.')}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
