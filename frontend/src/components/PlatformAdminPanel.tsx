import { useEffect, useState, type FormEvent } from 'react'
import { listActiveClinicsForStaffProvisioning } from '../services/clinicService'
import { supabase } from '../lib/supabase'
import { useTranslate } from '../lib/i18n'

type ClinicOption = { id: string; name: string }

export function PlatformAdminPanel() {
  const t = useTranslate()
  const [clinics, setClinics] = useState<ClinicOption[]>([])
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [clinicId, setClinicId] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    listActiveClinicsForStaffProvisioning()
      .then((items) => {
        if (!active) return
        setClinics(items)
        setClinicId(items[0]?.id ?? '')
      })
      .catch((loadError: unknown) => {
        if (active) setError(t(loadError instanceof Error ? loadError.message : 'Could not load active clinics.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [t])

  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data, error: provisionError } = await supabase.rpc('provision_staff_member', {
        p_email: email.trim(),
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_clinic_id: clinicId,
        p_role: role,
      })
      if (provisionError) throw provisionError
      setMessage(`${t('Clinic access granted. Membership reference:')} ${data}`)
      setEmail('')
      setFirstName('')
      setLastName('')
    } catch (provisionFailure) {
      setError(t(provisionFailure instanceof Error ? provisionFailure.message : 'Could not provision staff access.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="staff-access-title">
      <div className="panel-header"><h2 id="staff-access-title">{t('Trusted staff access')}</h2></div>
      <p className="section-description">
        {t('Assign a clinic role to an existing verified account. This action is recorded in the audit log. Public signup cannot grant staff or administrator access.')}
      </p>
      <p className="input-hint">
        {t('The staff member must first create and verify an account. This form does not invite users or send email. Clinic administrators can manage schedules and operational announcements for their clinic.')}
      </p>
      {loading ? <p role="status">{t('Loading active clinics…')}</p> : clinics.length === 0 ? (
        <p>{t('No active clinics are available for assignment.')}</p>
      ) : (
        <form className="operations-form" onSubmit={(event) => void provision(event)}>
          <label>{t('Account email')}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <div className="operations-time-pair">
            <label>{t('First name')}<input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={100} required /></label>
            <label>{t('Last name')}<input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100} required /></label>
          </div>
          <label>{t('Clinic')}<select value={clinicId} onChange={(event) => setClinicId(event.target.value)} required>
            {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
          </select></label>
          <label>{t('Clinic role')}<select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option value="staff">{t('Staff')}</option><option value="admin">{t('Clinic administrator')}</option>
          </select></label>
          <button type="submit" className="confirm-button" disabled={saving || !clinicId}>
            {t(saving ? 'Assigning access…' : 'Assign clinic access')}
          </button>
        </form>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  )
}
