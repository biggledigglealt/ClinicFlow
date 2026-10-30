import { useEffect, useState, type FormEvent } from 'react'
import {
  bookAppointment,
  getAvailableSlots,
  listMyUpcomingAppointments,
  type AppointmentSlot,
  type PatientAppointment,
} from '../../services/appointmentService'
import type { Clinic } from '../../services/clinicService'

interface AppointmentBookingPanelProps {
  clinic: Clinic | null
  userId: string | null
  hasPatientProfile: boolean
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

function formatDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value))
}

export function AppointmentBookingPanel({
  clinic,
  userId,
  hasPatientProfile,
}: AppointmentBookingPanelProps) {
  const [date, setDate] = useState(() => nextBusinessDateInTimeZone(clinic?.time_zone ?? 'America/Toronto'))
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!userId || !hasPatientProfile) return

    let isCurrent = true
    listMyUpcomingAppointments()
      .then((upcoming) => {
        if (isCurrent) setAppointments(upcoming)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load appointments.')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [userId, hasPatientProfile])

  async function loadSlots(selectedDate = date) {
    if (!clinic) return

    setError('')
    setMessage('')
    setHasSearched(true)
    setIsLoadingSlots(true)
    try {
      setSlots(await getAvailableSlots(clinic.id, selectedDate))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load availability.')
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
      await bookAppointment(clinic.id, slot.staff_id, slot.start_at)
      setMessage('Your appointment is booked.')
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : 'Could not book this time.')
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
      setError('Your appointment was booked, but the page could not refresh. Reload to see the latest schedule.')
    } finally {
      setBookingSlot(null)
    }
  }

  return (
    <aside className="panel appointment-panel" aria-labelledby="appointment-booking-title">
      <div className="panel-header">
        <h3 id="appointment-booking-title">Appointment booking</h3>
      </div>

      {!clinic ? (
        <p className="section-description">Select a clinic to check appointment times.</p>
      ) : !userId ? (
        <p className="section-description">Log in and complete your patient profile to book an appointment.</p>
      ) : !hasPatientProfile ? (
        <p className="section-description">Complete your booking profile before choosing an appointment time.</p>
      ) : (
        <>
          <p className="section-description">
            Choose a date for {clinic.name}. Appointment times are shown in the clinic's local time.
          </p>
          <form className="availability-search" onSubmit={handleSearch}>
            <label htmlFor="appointment-date">Appointment date</label>
            <input
              id="appointment-date"
              type="date"
              value={date}
              min={dateInTimeZone(clinic.time_zone)}
              onChange={(event) => {
                setDate(event.target.value)
                setSlots([])
                setHasSearched(false)
                setMessage('')
              }}
              required
            />
            <button type="submit" className="confirm-button" disabled={isLoadingSlots}>
              {isLoadingSlots ? 'Checking…' : 'Show available times'}
            </button>
          </form>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}

          {slots.length > 0 ? (
            <div className="appointment-slots" aria-live="polite">
              <h4>Available 30-minute times</h4>
              {slots.map((slot) => {
                const slotKey = `${slot.staff_id}:${slot.start_at}`
                const providerName = `${slot.staff_first_name} ${slot.staff_last_name}`

                return (
                  <article className="appointment-slot" key={slotKey}>
                    <div>
                      <strong>{formatDateTime(slot.start_at, clinic.time_zone)}</strong>
                      <p>{providerName}{slot.staff_job_title ? ` · ${slot.staff_job_title}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      className="clinic-select-button"
                      disabled={bookingSlot !== null}
                      onClick={() => void handleBook(slot)}
                    >
                      {bookingSlot === slotKey ? 'Booking…' : 'Book'}
                    </button>
                  </article>
                )
              })}
            </div>
          ) : hasSearched && !isLoadingSlots ? (
            <p className="section-description">No available appointments for this date.</p>
          ) : null}

          <div className="upcoming-appointments">
            <h4>My upcoming appointments</h4>
            {appointments.length === 0 ? (
              <p className="section-description">No upcoming appointments.</p>
            ) : (
              <ul>
                {appointments.map((appointment) => {
                  const timeZone = appointment.clinic?.time_zone ?? clinic.time_zone
                  const provider = appointment.staff
                    ? `${appointment.staff.first_name} ${appointment.staff.last_name}`
                    : 'Clinic provider'

                  return (
                    <li key={appointment.id}>
                      <strong>{formatDateTime(appointment.start_at, timeZone)}</strong>
                      <span>{appointment.clinic?.name ?? 'Clinic'} · {provider}</span>
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
