import { useEffect, useState } from 'react'
import type { Clinic } from '../services/clinicService'
import {
  acceptClinicWaitlistOffer,
  joinClinicWaitlist,
  leaveClinicWaitlist,
  listClinicAnnouncements,
  listMyWaitlistEntries,
  type ClinicAnnouncement,
  type WaitlistEntry,
} from '../services/operationsService'

interface ClinicExtrasPanelProps {
  clinic: Clinic | null
  userId: string | null
  hasPatientProfile: boolean
  onWaitlistAccepted: () => void
}

export function ClinicExtrasPanel({ clinic, userId, hasPatientProfile, onWaitlistAccepted }: ClinicExtrasPanelProps) {
  const [announcements, setAnnouncements] = useState<ClinicAnnouncement[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    if (!clinic) {
      return () => { active = false }
    }
    const selectedClinic = clinic
    async function refreshClinicInformation() {
      try {
        const [clinicAnnouncements, entries] = await Promise.all([
          listClinicAnnouncements(selectedClinic.id),
          userId && hasPatientProfile ? listMyWaitlistEntries(selectedClinic.id) : Promise.resolve([]),
        ])
        if (!active) return
        setAnnouncements(clinicAnnouncements)
        setWaitlist(entries)
        setError('')
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load clinic information.')
      }
    }

    const initialLoad = window.setTimeout(() => void refreshClinicInformation(), 0)
    const refreshTimer = window.setInterval(() => void refreshClinicInformation(), 15000)
    return () => {
      active = false
      window.clearTimeout(initialLoad)
      window.clearInterval(refreshTimer)
    }
  }, [clinic, userId, hasPatientProfile])

  async function handleJoinWaitlist() {
    if (!clinic || !userId) return
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await joinClinicWaitlist(userId, clinic.id, null)
      setWaitlist(await listMyWaitlistEntries(clinic.id))
      setMessage('You joined this clinic’s waitlist.')
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join the waitlist.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLeaveWaitlist(entryId: string) {
    setIsSaving(true)
    setError('')
    try {
      await leaveClinicWaitlist(entryId)
      setWaitlist(await listMyWaitlistEntries(clinic?.id ?? ''))
      setMessage('You left this clinic’s waitlist.')
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : 'Could not leave the waitlist.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAcceptOffer(entryId: string) {
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await acceptClinicWaitlistOffer(entryId)
      setWaitlist(await listMyWaitlistEntries(clinic?.id ?? ''))
      onWaitlistAccepted()
      setMessage('The offered time is booked and appears in your appointments.')
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Could not book the offered time. Check availability and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  function formatOfferTime(value: string | null) {
    if (!value) return 'Time not specified'
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: clinic?.time_zone,
    }).format(new Date(value))
  }

  return (
    <section className="panel" aria-labelledby="clinic-updates-title">
      <div className="panel-header"><h3 id="clinic-updates-title">Clinic updates and waitlist</h3></div>
      {!clinic ? <p className="section-description">Select a clinic to view its announcements or waitlist.</p> : (
        <>
          <h4>Announcements</h4>
          {announcements.length === 0 ? <p className="section-description">No current announcements.</p> : (
            <ul className="notification-list">
              {announcements.map((announcement) => (
                <li key={announcement.id}>
                  <div><strong>{announcement.title}</strong><p>{announcement.message}</p></div>
                </li>
              ))}
            </ul>
          )}
          <h4>Waitlist</h4>
          {!userId || !hasPatientProfile ? (
            <p className="section-description">Sign in and complete your booking profile to join a waitlist.</p>
          ) : waitlist.length === 0 ? (
            <button type="button" className="confirm-button" disabled={isSaving} onClick={() => void handleJoinWaitlist()}>
              {isSaving ? 'Joining…' : 'Join this clinic’s waitlist'}
            </button>
          ) : (
            <ul className="notification-list">
              {waitlist.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.status === 'offered' ? 'Appointment offer' : 'Waiting'}</strong>
                    {entry.status === 'offered' && <p>
                      {formatOfferTime(entry.offered_start_at)}
                      {entry.offer_expires_at && ` · Respond by ${formatOfferTime(entry.offer_expires_at)}`}
                    </p>}
                  </div>
                  {entry.status === 'offered' && entry.offered_start_at && (
                    <button type="button" className="confirm-button" disabled={isSaving}
                      onClick={() => void handleAcceptOffer(entry.id)}>
                      {isSaving ? 'Booking…' : 'Accept and book'}
                    </button>
                  )}
                  <button type="button" className="text-button" disabled={isSaving}
                    onClick={() => void handleLeaveWaitlist(entry.id)}>Leave waitlist</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <p className="input-hint">Waitlist offers are not reserved appointments. Another patient may book first; the database checks availability again when you accept.</p>
    </section>
  )
}
