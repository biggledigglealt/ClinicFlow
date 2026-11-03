import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  addScheduleBlock,
  cancelAppointment,
  checkInAppointment,
  deleteScheduleBlock,
  getClinicHoursForDay,
  getMyClinicMemberships,
  getMyStaffHoursForDay,
  listClinicAnnouncements,
  listClinicAppointmentsForDay,
  listScheduleBlocks,
  publishClinicAnnouncement,
  setAppointmentStatus,
  setClinicAppointmentDuration,
  setClinicHours,
  setMyStaffHours,
  type ClinicAnnouncement,
  type ClinicAppointment,
  type ClinicMembership,
  type ScheduleInterval,
} from '../services/operationsService'
import { useLanguage, useTranslate } from '../lib/i18n'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dateForClinic(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (part: string) => parts.find((item) => item.type === part)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function localDateTimeToIso(value: string, timeZone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) throw new Error('Enter a valid start and end time.')
  const [, year, month, day, hour, minute] = match.map(Number)
  const expectedUtc = Date.UTC(year, month - 1, day, hour, minute)
  let candidate = expectedUtc
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(candidate))
    const valueOf = (part: string) => Number(parts.find((item) => item.type === part)?.value ?? 0)
    const displayedUtc = Date.UTC(
      valueOf('year'), valueOf('month') - 1, valueOf('day'), valueOf('hour'), valueOf('minute'),
    )
    candidate += expectedUtc - displayedUtc
  }
  const check = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(candidate))
  const resolved = `${check.find((item) => item.type === 'year')?.value}-${check.find((item) => item.type === 'month')?.value}-${check.find((item) => item.type === 'day')?.value}T${check.find((item) => item.type === 'hour')?.value}:${check.find((item) => item.type === 'minute')?.value}`
  if (resolved !== value) throw new Error('That local time does not exist in the clinic time zone. Choose another time.')
  return new Date(candidate).toISOString()
}

function formatClinicTime(value: string, timeZone: string, language: 'en' | 'fr') {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value))
}

function validateScheduleIntervals(intervals: ScheduleInterval[]) {
  const sorted = [...intervals].sort((left, right) => left.opensAt.localeCompare(right.opensAt))
  for (let index = 0; index < sorted.length; index += 1) {
    const interval = sorted[index]
    if (!interval.opensAt || !interval.closesAt || interval.closesAt <= interval.opensAt) {
      return 'Each interval needs a start time before its end time.'
    }
    if (index > 0 && sorted[index - 1].closesAt > interval.opensAt) {
      return 'Schedule intervals cannot overlap.'
    }
  }
  if (sorted.length > 12) return 'Add no more than 12 intervals to one day.'
  return ''
}

function ScheduleIntervalEditor({
  title,
  intervals,
  onChange,
  disabled,
}: {
  title: string
  intervals: ScheduleInterval[]
  onChange: (intervals: ScheduleInterval[]) => void
  disabled: boolean
}) {
  const t = useTranslate()
  return (
    <fieldset className="schedule-interval-editor">
      <legend>{t(title)}</legend>
      {intervals.length === 0 && <p className="input-hint">{t('No hours set for this day.')}</p>}
      <div className="schedule-interval-list">
        {intervals.map((interval, index) => (
          <div className="schedule-interval-row" key={index}>
            <label>
              {t('Opens')}
              <input type="time" value={interval.opensAt} required disabled={disabled}
                onChange={(event) => onChange(intervals.map((current, currentIndex) => currentIndex === index
                  ? { ...current, opensAt: event.target.value }
                  : current))} />
            </label>
            <label>
              {t('Closes')}
              <input type="time" value={interval.closesAt} required disabled={disabled}
                onChange={(event) => onChange(intervals.map((current, currentIndex) => currentIndex === index
                  ? { ...current, closesAt: event.target.value }
                  : current))} />
            </label>
            <button type="button" className="text-button" disabled={disabled}
              onClick={() => onChange(intervals.filter((_, currentIndex) => currentIndex !== index))}>
              {t('Remove interval')}
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="text-button" disabled={disabled}
        onClick={() => onChange([...intervals, { opensAt: '09:00', closesAt: '17:00' }])}>
        {t('Add interval')}
      </button>
    </fieldset>
  )
}

export function StaffOperationsPanel({ userId }: { userId: string }) {
  const t = useTranslate()
  const language = useLanguage()
  const [memberships, setMemberships] = useState<ClinicMembership[]>([])
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  const [date, setDate] = useState('')
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([])
  const [announcements, setAnnouncements] = useState<ClinicAnnouncement[]>([])
  const [blocks, setBlocks] = useState<Array<{ id: string; staff_id: string | null; starts_at: string; ends_at: string; reason: string }>>([])
  const [day, setDay] = useState(1)
  const [clinicIntervals, setClinicIntervals] = useState<ScheduleInterval[]>([])
  const [staffIntervals, setStaffIntervals] = useState<ScheduleInterval[]>([])
  const [duration, setDuration] = useState(30)
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [blockReason, setBlockReason] = useState<'unavailable' | 'closure' | 'break' | 'other'>('unavailable')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [announcementExpiry, setAnnouncementExpiry] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getMyClinicMemberships(userId)
      .then((items) => {
        if (!active) return
        setMemberships(items)
        setSelectedMembershipId(items[0]?.id ?? '')
        if (items[0]?.clinic) setDate(dateForClinic(items[0].clinic.time_zone))
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load staff access.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId])

  const membership = useMemo(
    () => memberships.find((item) => item.id === selectedMembershipId) ?? null,
    [memberships, selectedMembershipId],
  )
  const clinic = membership?.clinic ?? null

  const refreshClinicData = useCallback(async () => {
    if (!membership || !clinic) return
    const [clinicAppointments, clinicAnnouncements, scheduleBlocks] = await Promise.all([
      listClinicAppointmentsForDay(clinic.id, date),
      listClinicAnnouncements(clinic.id),
      listScheduleBlocks(clinic.id),
    ])
    setAppointments(clinicAppointments)
    setAnnouncements(clinicAnnouncements)
    setBlocks(scheduleBlocks)
  }, [membership, clinic, date])

  useEffect(() => {
    if (!membership || !clinic || !date) return
    let active = true
    Promise.all([
      listClinicAppointmentsForDay(clinic.id, date),
      listClinicAnnouncements(clinic.id),
      listScheduleBlocks(clinic.id),
      getClinicHoursForDay(clinic.id, day),
      getMyStaffHoursForDay(membership.id, day),
    ]).then(([clinicAppointments, clinicAnnouncements, scheduleBlocks, clinicHours, staffHours]) => {
      if (!active) return
      setAppointments(clinicAppointments)
      setAnnouncements(clinicAnnouncements)
      setBlocks(scheduleBlocks)
      setClinicIntervals(clinicHours.map((interval) => ({
        opensAt: interval.opens_at.slice(0, 5),
        closesAt: interval.closes_at.slice(0, 5),
      })))
      setStaffIntervals(staffHours.map((interval) => ({
        opensAt: interval.opens_at.slice(0, 5),
        closesAt: interval.closes_at.slice(0, 5),
      })))
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load clinic operations.')
    })
    return () => { active = false }
  }, [membership, clinic, date, day])

  useEffect(() => {
    if (!membership || !clinic || !date) return
    let active = true
    const refreshAppointments = () => {
      void listClinicAppointmentsForDay(clinic.id, date)
        .then((items) => { if (active) setAppointments(items) })
        .catch(() => undefined)
    }
    const refreshTimer = window.setInterval(refreshAppointments, 15000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [membership, clinic, date])

  async function runAction(action: () => Promise<void>, success: string) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await action()
      await refreshClinicData()
      setMessage(t(success))
    } catch (actionError) {
      setError(t(actionError instanceof Error ? actionError.message : 'The operation failed.'))
    } finally {
      setSaving(false)
    }
  }

  async function saveSchedules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!membership || !clinic) return
    const staffScheduleError = validateScheduleIntervals(staffIntervals)
    const clinicScheduleError = membership.role === 'admin'
      ? validateScheduleIntervals(clinicIntervals)
      : ''
    if (staffScheduleError || clinicScheduleError) {
      setError(t(staffScheduleError || clinicScheduleError))
      return
    }
    await runAction(async () => {
      await Promise.all([
        setMyStaffHours(membership.id, day, staffIntervals),
        ...(membership.role === 'admin'
          ? [setClinicHours(clinic.id, day, clinicIntervals)]
          : []),
      ])
    }, 'Recurring schedule saved.')
  }

  async function saveDuration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clinic) return
    await runAction(() => setClinicAppointmentDuration(clinic.id, duration), 'Appointment length saved.')
  }

  async function saveBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clinic || !membership) return
    await runAction(async () => {
      const start = localDateTimeToIso(blockStart, clinic.time_zone)
      const end = localDateTimeToIso(blockEnd, clinic.time_zone)
      await addScheduleBlock({
        clinicId: clinic.id,
        staffId: membership.role === 'admin' ? null : membership.staff_id,
        startsAt: start,
        endsAt: end,
        reason: blockReason,
        createdBy: userId,
      })
      setBlockStart('')
      setBlockEnd('')
    }, 'Unavailable time saved.')
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clinic) return
    await runAction(async () => {
      await publishClinicAnnouncement(
        clinic.id,
        userId,
        announcementTitle,
        announcementMessage,
        announcementExpiry ? new Date(`${announcementExpiry}T23:59:00`).toISOString() : null,
      )
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setAnnouncementExpiry('')
    }, 'Announcement published.')
  }

  if (loading) return <section className="panel"><p role="status">Checking clinic staff access…</p></section>
  if (memberships.length === 0) return null

  return (
    <section className="panel staff-operations-panel" aria-labelledby="staff-operations-title">
      <div className="panel-header"><h3 id="staff-operations-title">{t('Clinic staff operations')}</h3></div>
      {memberships.length > 1 && (
        <label className="staff-filter">
          {t('Clinic')}
          <select value={selectedMembershipId} onChange={(event) => {
            const next = memberships.find((item) => item.id === event.target.value)
            setSelectedMembershipId(event.target.value)
            if (next?.clinic) setDate(dateForClinic(next.clinic.time_zone))
          }}>
            {memberships.map((item) => <option key={item.id} value={item.id}>{item.clinic?.name ?? item.clinic_id}</option>)}
          </select>
        </label>
      )}
      {!clinic || !membership ? <p className="auth-error">This staff membership has no active clinic.</p> : (
        <>
          <div className="staff-filter">
            <label htmlFor="staff-date">{t('Schedule date')}</label>
            <input id="staff-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <h4>{t('Appointments')}</h4>
          {appointments.length === 0 ? <p className="section-description">{t('No appointments for this date.')}</p> : (
            <ul className="staff-appointment-list">
              {appointments.map((appointment) => (
                <li key={appointment.id}>
                  <div>
                    <strong>{formatClinicTime(appointment.start_at, clinic.time_zone, language)} – {formatClinicTime(appointment.end_at, clinic.time_zone, language)}</strong>
                    <span>{appointment.patient_first_name} {appointment.patient_last_name} · {appointment.staff_first_name} {appointment.staff_last_name}</span>
                    <span>{t('Status:')} {t(appointment.status)}{appointment.checked_in_at ? ` · ${t('Checked in')}` : ''}</span>
                  </div>
                  {['booked', 'confirmed'].includes(appointment.status) && (
                    <div className="staff-row-actions">
                      {!appointment.checked_in_at && <button type="button" className="text-button" disabled={saving}
                        onClick={() => void runAction(() => checkInAppointment(appointment.id), 'Patient checked in.')}>{t('Check in')}</button>}
                      <button type="button" className="text-button" disabled={saving}
                        onClick={() => void runAction(() => cancelAppointment(appointment.id), 'Appointment cancelled.')}>{t('Cancel')}</button>
                      <button type="button" className="text-button" disabled={saving}
                        onClick={() => void runAction(() => setAppointmentStatus(appointment.id, 'completed'), 'Appointment marked completed.')}>{t('Complete')}</button>
                      <button type="button" className="text-button" disabled={saving}
                        onClick={() => void runAction(() => setAppointmentStatus(appointment.id, 'no_show'), 'Appointment marked no-show.')}>{t('No-show')}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h4>{t('Recurring schedule')}</h4>
          <form className="operations-form" onSubmit={saveSchedules}>
            <label>{t('Day of week')}<select value={day} onChange={(event) => setDay(Number(event.target.value))}>
              {weekdays.map((name, index) => <option key={name} value={index}>{t(name)}</option>)}
            </select></label>
            {membership.role === 'admin' && <ScheduleIntervalEditor
              title="Clinic hours"
              intervals={clinicIntervals}
              onChange={setClinicIntervals}
              disabled={saving}
            />}
            <ScheduleIntervalEditor
              title="Your availability"
              intervals={staffIntervals}
              onChange={setStaffIntervals}
              disabled={saving}
            />
            <p className="input-hint">{t('Use separate intervals for split shifts. Remove all intervals to close the day.')}</p>
            <button type="submit" className="confirm-button" disabled={saving}>{t('Save schedule')}</button>
          </form>

          {membership.role === 'admin' && <form className="operations-form" onSubmit={saveDuration}>
            <label>{t('Appointment length')}<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              {[15, 30, 45, 60, 75, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} {t('minutes')}</option>)}
            </select></label>
            <button type="submit" className="confirm-button" disabled={saving}>{t('Save appointment length')}</button>
          </form>}

          <h4>{t('Unavailable time')}</h4>
          <form className="operations-form" onSubmit={saveBlock}>
            <label>{t('Reason')}<select value={blockReason} onChange={(event) => setBlockReason(event.target.value as typeof blockReason)}>
              <option value="unavailable">{t('Unavailable')}</option><option value="closure">{t('Clinic closure')}</option>
              <option value="break">{t('Break')}</option><option value="other">{t('Other')}</option>
            </select></label>
            <div className="operations-time-pair">
              <label>{t('Starts')}<input type="datetime-local" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} required /></label>
              <label>{t('Ends')}<input type="datetime-local" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} required /></label>
            </div>
            <p className="input-hint">{t('Times are interpreted in')} {clinic.time_zone}. {t('Administrators add clinic-wide blocks; staff add blocks for their own schedule.')}</p>
            <button type="submit" className="confirm-button" disabled={saving}>{t('Add unavailable time')}</button>
          </form>
          {blocks.length > 0 && <ul className="staff-appointment-list">
            {blocks.map((block) => <li key={block.id}>
              <div><strong>{formatClinicTime(block.starts_at, clinic.time_zone, language)} – {formatClinicTime(block.ends_at, clinic.time_zone, language)}</strong><span>{t(block.reason)}{block.staff_id ? ` · ${t('staff')}` : ` · ${t('clinic')}`}</span></div>
              {(membership.role === 'admin' || block.staff_id === membership.staff_id) && <button className="text-button" type="button" disabled={saving}
                onClick={() => void runAction(() => deleteScheduleBlock(block.id), 'Unavailable time removed.')}>{t('Remove')}</button>}
            </li>)}
          </ul>}

          {membership.role === 'admin' && <>
            <h4>{t('Publish a clinic announcement')}</h4>
            <form className="operations-form" onSubmit={saveAnnouncement}>
              <label>{t('Title')}<input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} maxLength={120} required /></label>
              <label>{t('Message')}<textarea value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} maxLength={1000} required /></label>
              <p className="input-hint">{t('Keep the announcement operational and generic. Do not include patient names or clinical details.')}</p>
              <label>{t('Optional expiry date')}<input type="date" value={announcementExpiry} onChange={(event) => setAnnouncementExpiry(event.target.value)} /></label>
              <button type="submit" className="confirm-button" disabled={saving}>{t('Publish announcement')}</button>
            </form>
          </>}
          {announcements.length > 0 && <p className="input-hint">Published announcements: {announcements.map((item) => item.title).join(', ')}</p>}
        </>
      )}
      {error && <p className="auth-error" role="alert">{t(error)}</p>}
      {message && <p className="auth-message" role="status">{t(message)}</p>}
    </section>
  )
}
